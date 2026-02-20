const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    if (!options || !options.email) {
        return; 
    }

    try {
        const defaultMessage = 'Message from VidyaSetu';

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"VidyaSetu Support" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject || "VidyaSetu Notification",
            text: options.message || defaultMessage,
            html: options.html || `<div style="font-family:Arial,sans-serif;line-height:1.6;">
                                    ${ (options.message || defaultMessage).replace(/\n/g, "<br>") }
                                   </div>`,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email error:', error.message);
    }
};

module.exports = sendEmail;
