require('dotenv').config();
const express = require('express');
const path = require('path');
const { sendWelcomeEmail, sendAdminNotification, sendSubscriptionNotification } = require('./emailService');
const { createOrUpdateContact, addContactToList } = require('./hubspotService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

// Log all environment variables at startup
console.log('Starting server with environment variables:');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Set' : 'Not set');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
    res.json({
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

app.post('/api/early-access', async (req, res) => {
    console.log('\n--- New Form Submission ---');
    console.log('Raw request body:', req.body);

    const formData = {
        email: req.body.email,
        name: req.body.name,
        role: req.body.role,
        otherRole: req.body.otherRole,
        company: req.body.company,
        useCase: req.body.useCase
    };

    console.log('Processed form data:', formData);
    console.log('Admin email from env:', process.env.ADMIN_EMAIL);
    console.log('From email from env:', process.env.FROM_EMAIL);

    try {
        // Create or update contact in HubSpot
        console.log('\nAttempting to add contact to HubSpot...');
        const hubspotResult = await createOrUpdateContact(formData);
        console.log('HubSpot result:', hubspotResult);

        // Add contact to early access list in HubSpot if successful
        if (hubspotResult.success && hubspotResult.contactId && process.env.HUBSPOT_EARLY_ACCESS_LIST_ID) {
            console.log('\nAttempting to add contact to HubSpot early access list...');
            const listResult = await addContactToList(hubspotResult.contactId, process.env.HUBSPOT_EARLY_ACCESS_LIST_ID);
            console.log('HubSpot list result:', listResult);
        }

        // Send welcome email to user
        console.log('\nAttempting to send welcome email...');
        console.log('To:', formData.email);
        console.log('From:', process.env.FROM_EMAIL);
        const welcomeResult = await sendWelcomeEmail(formData.email, formData.name);
        console.log('Welcome email result:', welcomeResult);

        // Send notification to admin
        console.log('\nAttempting to send admin notification...');
        console.log('To:', process.env.ADMIN_EMAIL);
        console.log('From:', process.env.FROM_EMAIL);
        const adminResult = await sendAdminNotification(formData);
        console.log('Admin notification result:', adminResult);

        // If at least one operation was successful, consider it a success
        if (hubspotResult.success || welcomeResult.success || adminResult.success) {
            console.log('\nAt least one operation completed successfully');
            res.json({ success: true });
        } else {
            console.error('\nAll operations failed');
            throw new Error('Failed to process form submission');
        }
    } catch (error) {
        console.error('\nError processing form submission:', error);
        if (error.response) {
            console.error('API Error Details:');
            console.error('Status code:', error.response.statusCode);
            console.error('Body:', error.response.body);
        }
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process your request. Please try again later.' 
        });
    }
});

app.post('/api/subscribe', async (req, res) => {
    console.log('\n--- New Subscription ---');
    console.log('Email:', req.body.email);
    console.log('Plan:', req.body.plan);
    console.log('Billing Period:', req.body.billingPeriod);

    try {
        const { paymentMethodId, firstName, lastName, email, company, plan, billingPeriod } = req.body;
        
        if (!paymentMethodId || !email || !plan) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields'
            });
        }
        
        // Create a customer in Stripe
        const customer = await stripe.customers.create({
            email,
            name: `${firstName} ${lastName}`,
            payment_method: paymentMethodId,
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
            metadata: {
                company,
                firstName,
                lastName
            }
        });
        
        console.log('Created Stripe customer:', customer.id);
        
        // Get the right price ID based on plan and billing period
        let priceId;
        if (plan === 'pro' && billingPeriod === 'monthly') {
            priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
        } else if (plan === 'pro' && billingPeriod === 'yearly') {
            priceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan or billing period'
            });
        }
        
        // Create the subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });
        
        console.log('Created Stripe subscription:', subscription.id);
        
        // Create or update contact in HubSpot with subscription info
        const fullName = `${firstName} ${lastName}`;
        const hubspotData = {
            email,
            name: fullName,
            company,
            useCase: `Subscription: ${plan} - ${billingPeriod}`
        };
        
        console.log('\nAttempting to add subscription contact to HubSpot...');
        const hubspotResult = await createOrUpdateContact(hubspotData);
        
        if (hubspotResult.success && hubspotResult.contactId && process.env.HUBSPOT_SUBSCRIBERS_LIST_ID) {
            console.log('\nAttempting to add contact to HubSpot subscribers list...');
            await addContactToList(hubspotResult.contactId, process.env.HUBSPOT_SUBSCRIBERS_LIST_ID);
        }
        
        // Send subscription confirmation email
        const emailResult = await sendSubscriptionNotification(email, firstName, plan, billingPeriod);
        console.log('Email notification result:', emailResult);
        
        res.json({ 
            success: true,
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent?.client_secret
        });
        
    } catch (error) {
        console.error('\nError processing subscription:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process subscription. Please try again.' 
        });
    }
});

app.listen(port, () => {
    console.log(`\nServer running at http://localhost:${port}`);
}); 