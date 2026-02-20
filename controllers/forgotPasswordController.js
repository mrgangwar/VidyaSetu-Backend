const User = require('../models/User');
const OTP = require('../models/OTP');
const Student = require('../models/Student');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

exports.sendOTP = async (req, res) => {
    const { email } = req.body;
    try {
        // Check User first, then Student
        let account = await User.findOne({ email });
        if (!account) {
            account = await Student.findOne({ email });
        }

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP with updated timestamp
        await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        // Send email
       await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'VidyaSetu Password Reset OTP 🔐',

    // Plain text fallback
    text: `
VidyaSetu Password Reset Request

Your One-Time Password (OTP) is: ${otp}

This OTP is valid for 10 minutes.
Please do not share it with anyone for security reasons.

If you did not request a password reset, please ignore this email.

- Team VidyaSetu
Bridging Knowledge, Empowering Education

----------------------------

VidyaSetu पासवर्ड रीसेट OTP

आपका OTP है: ${otp}

यह OTP 10 मिनट तक मान्य है।
कृपया सुरक्षा के लिए इसे किसी के साथ साझा न करें।

यदि आपने पासवर्ड रीसेट का अनुरोध नहीं किया है, तो इस ईमेल को अनदेखा करें।

- टीम VidyaSetu
`,

    // Attractive HTML Email
    html: `
<div style="font-family: Arial, sans-serif; background:#f4f6fb; padding:20px;">
    <div style="max-width:600px; margin:auto; background:white; border-radius:10px; padding:30px; text-align:center;">
        
        <h2 style="color:#1a237e;">
            🔐 VidyaSetu Password Reset
        </h2>

        <p>
            We received a request to reset your password.
            Use the OTP below to continue:
        </p>

        <div style="font-size:32px; letter-spacing:6px; 
                    background:#eef2ff; padding:15px; 
                    border-radius:8px; margin:20px 0; 
                    color:#1a237e; font-weight:bold;">
            ${otp}
        </div>

        <p style="color:#d32f2f;">
            ⏳ This OTP is valid for <b>10 minutes</b>.
        </p>

        <p>
            Do not share this code with anyone for security reasons.
        </p>

        <hr>

        <h3>🙏 पासवर्ड रीसेट OTP</h3>

        <p>
            पासवर्ड रीसेट करने के लिए नीचे दिया गया OTP उपयोग करें:
        </p>

        <div style="font-size:28px; letter-spacing:5px; 
                    background:#fff3e0; padding:12px; 
                    border-radius:8px; margin:15px 0; 
                    color:#e65100; font-weight:bold;">
            ${otp}
        </div>

        <p>यह OTP <b>10 मिनट</b> तक मान्य है। कृपया इसे किसी के साथ साझा न करें।</p>

        <br>

        <p style="color:gray;">
            <b>VidyaSetu</b> – Bridging Knowledge, Empowering Education
        </p>

    </div>
</div>
`
});

        res.json({ message: "OTP sent successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error sending email" });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        // Verify OTP
        const record = await OTP.findOne({ email, otp });
        if (!record) return res.status(400).json({ message: "Invalid OTP" });

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in User or Student collection
        const user = await User.findOne({ email });
        if (user) {
            await User.findOneAndUpdate({ email }, { password: hashedPassword });
        } else {
            await Student.findOneAndUpdate({ email }, { password: hashedPassword });
        }

        // Delete OTP after use
        await OTP.deleteOne({ email });

        res.json({ message: "Password reset successful" });
    } catch (err) {
        res.status(500).json({ message: "Error resetting password" });
    }
};
transporter.verify((error, success) => {
    if (error) {
        console.log('SMTP ERROR:', error);
    } else {
        console.log('SMTP ready to send messages');
    }
});
