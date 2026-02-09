import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

console.log('--- Testing Email Settings ---');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '********' : 'NOT SET');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('ERROR: Missing EMAIL_USER or EMAIL_PASS in .env file.');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Send to yourself
    subject: 'Email Test - Impact.ai',
    text: 'This is a test email to verify your SMTP settings.'
};

console.log('Attempting to send test email...');

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('Error occurred:', error.message);
        if (error.message.includes('EAUTH')) {
            console.log('\nPossible Solution: Check if EMAIL_PASS is a Gmail App Password, not your regular password.');
            console.log('Also ensure "Less secure app access" is NOT the issue (Google disabled it). Use App Passwords.');
        }
    } else {
        console.log('Email sent successfully!');
        console.log('Response:', info.response);
    }
});
