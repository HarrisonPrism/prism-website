require('dotenv').config();
const sgMail = require('@sendgrid/mail');

// Just use the environment variable directly
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDER_CONFIG = {
    email: 'no-reply@prisminteractive.ai',
    name: 'Prism Interactive'
};

async function sendEmail(to, subject, text, html) {
    // Simplified message object with no additional settings
    const msg = {
        to,
        from: SENDER_CONFIG,
        subject,
        text,
        html
    };

    try {
        const response = await sgMail.send(msg);
        console.log('Email sent successfully');
        return { success: true };
    } catch (error) {
        console.error('SendGrid Error:', error.response?.body || error);
        return { 
            success: false, 
            error: error.response?.body?.errors?.[0]?.message || error.message 
        };
    }
}

async function sendWelcomeEmail(userEmail, userName) {
    const subject = 'Thank You For Signing Up For Early Access';
    const text = `
        Hi ${userName},
        
        Thank you for your interest in Prism Interactive! We've received your early access request and we're excited to have you on board.
        
        We're currently reviewing applications and will get back to you soon with next steps.
        
        Best regards,
        The Prism Interactive Team
    `;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #548C87;">Welcome to Prism Interactive!</h2>
            <p>Hi ${userName},</p>
            <p>Thank you for your interest in Prism Interactive! We've received your early access request and we're excited to have you on board.</p>
            <p>We're currently reviewing applications and will get back to you soon with next steps.</p>
            <br>
            <p>Best regards,<br>The Prism Interactive Team</p>
        </div>
    `;

    return await sendEmail(userEmail, subject, text, html);
}

async function sendAdminNotification(formData) {
    const subject = 'New Early Access Submission';
    const text = `
        New early access request from:
        Name: ${formData.name}
        Email: ${formData.email}
        Company: ${formData.company}
        Role: ${formData.role === 'other' ? formData.otherRole : formData.role}
        Use Case: ${formData.useCase}
    `;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #548C87;">New Early Access Request</h2>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Company:</strong> ${formData.company}</p>
            <p><strong>Role:</strong> ${formData.role === 'other' ? formData.otherRole : formData.role}</p>
            <p><strong>Use Case:</strong> ${formData.useCase}</p>
        </div>
    `;

    return await sendEmail(process.env.ADMIN_EMAIL, subject, text, html);
}

async function sendSubscriptionNotification(email, firstName = '', plan = 'Pro', billingPeriod = 'monthly') {
    // Send confirmation to the customer
    const customerSubject = 'Welcome to Prism Interactive Pro!';
    const customerText = `
        Hi ${firstName},
        
        Thank you for subscribing to Prism Interactive ${plan}! Your ${billingPeriod} subscription has been successfully processed.
        
        You'll receive an email with your account details shortly. In the meantime, feel free to explore our platform.
        
        If you have any questions, please don't hesitate to contact our support team.
        
        Best regards,
        The Prism Interactive Team
    `;
    const customerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #548C87;">Welcome to Prism Interactive ${plan}!</h2>
            <p>Hi ${firstName},</p>
            <p>Thank you for subscribing to Prism Interactive ${plan}! Your ${billingPeriod} subscription has been successfully processed.</p>
            <p>You'll receive an email with your account details shortly. In the meantime, feel free to explore our platform.</p>
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            <br>
            <p>Best regards,<br>The Prism Interactive Team</p>
        </div>
    `;

    const customerResult = await sendEmail(email, customerSubject, customerText, customerHtml);
    
    // Send notification to the admin
    const adminSubject = 'New Prism Subscription';
    const adminText = `
        New ${plan} subscription (${billingPeriod}):
        Email: ${email}
        Name: ${firstName}
    `;
    const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #548C87;">New ${plan} Subscription</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Name:</strong> ${firstName}</p>
            <p><strong>Plan:</strong> ${plan} (${billingPeriod})</p>
        </div>
    `;

    const adminResult = await sendEmail(process.env.ADMIN_EMAIL, adminSubject, adminText, adminHtml);
    
    return { success: customerResult.success || adminResult.success };
}

module.exports = { 
    sendEmail, 
    sendWelcomeEmail, 
    sendAdminNotification, 
    sendSubscriptionNotification 
}; 