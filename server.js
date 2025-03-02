require('dotenv').config();
const express = require('express');
const path = require('path');
const { sendWelcomeEmail, sendAdminNotification, sendSubscriptionNotification } = require('./emailService');

const app = express();
const port = process.env.PORT || 3000;

// Log all environment variables at startup
console.log('Starting server with environment variables:');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Set' : 'Not set');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

        // If at least one email was sent successfully, consider it a success
        if (welcomeResult.success || adminResult.success) {
            console.log('\nAt least one email sent successfully');
            res.json({ success: true });
        } else {
            console.error('\nBoth emails failed to send');
            throw new Error('Failed to send both emails');
        }
    } catch (error) {
        console.error('\nError processing form submission:', error);
        if (error.response) {
            console.error('SendGrid Error Details:');
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

    try {
        const result = await sendSubscriptionNotification(req.body.email);
        
        if (result.success) {
            res.json({ success: true });
        } else {
            throw new Error('Failed to process subscription');
        }
    } catch (error) {
        console.error('\nError processing subscription:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process your subscription. Please try again later.' 
        });
    }
});

app.listen(port, () => {
    console.log(`\nServer running at http://localhost:${port}`);
}); 