const User = require('../models/User');
const Coaching = require('../models/Coaching');
const Student = require('../models/Student'); 
const Notice = require('../models/Notice');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
const { Expo } = require('expo-server-sdk');
const { uploadToCloudinary } = require('../middleware/uploadMiddleware');

// Expo SDK ko initialize karein push notifications ke liye
let expo = new Expo();

/**
 * 1. CREATE TEACHER (FIXED)
 */
exports.createTeacher = async (req, res) => {
    try {
        const { 
            name, email, password, coachingName, contactNumber, 
            address, qualifications, subject, whatsappNumber 
        } = req.body;
        
        // 1. Validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // 2. Duplicate Check
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: "Teacher with this email already exists" });
        }

        // 3. Create Coaching with Safe Fallback
        const newCoaching = await Coaching.create({ 
            coachingName: coachingName || `${name}'s Institution` 
        });

        if (!newCoaching) {
            throw new Error("Failed to create Coaching record");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Handle file upload - upload to Cloudinary if file exists
        let photoUrl = "";
        if (req.file && req.file.buffer) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'teachers');
                photoUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError.message);
            }
        }
        
        // 4. Create Teacher (Explicit Field Mapping)
        const teacher = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'TEACHER',
            coachingId: newCoaching._id,
            contactNumber: contactNumber || '',
            whatsappNumber: whatsappNumber || '',
            address: address || '',
            qualifications: qualifications || '',
            subject: subject || '',
            profilePhoto: photoUrl
            // Image Path Handling
            
        });
// --- 📧 Professional Email Logic ---
        try {
            const professionalMessage = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6fb; padding:40px 0;">
                <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                    <div style="background:linear-gradient(135deg,#0f4c81,#1e88e5); padding:30px; text-align:center; color:#fff;">
                        <h1 style="margin:0; font-size:28px;">Welcome to VidyaSetu 🎓</h1>
                        <p style="margin:5px 0 0; opacity:0.9;">जहाँ शिक्षा और सफलता के बीच एक मजबूत सेतु बनाया जाता है</p>
                    </div>
                    <div style="padding:35px;">
                        <h2 style="margin-top:0;">Dear ${name},</h2>
                        <p style="font-size:16px; color:#444;">Your <b>Teacher Account</b> has been successfully created.</p>
                        <div style="background:#f2f7ff; border-left:5px solid #1e88e5; padding:18px; border-radius:8px; margin:25px 0;">
                            <h3 style="margin-top:0;">🔐 Your Login Credentials</h3>
                            <p style="margin:6px 0;"><b>Email:</b> ${email}</p>
                            <p style="margin:6px 0;"><b>Password:</b> ${password}</p>
                        </div>
                        <p style="color:#777;">Warm Regards,<br/><b>Team VidyaSetu</b></p>
                    </div>
                </div>
            </div>`;

            await sendEmail({
                email: email,
                subject: "🎉 Welcome to VidyaSetu - Teacher Account Created",
                html: professionalMessage
            });
            console.log('Welcome email sent');
        } catch (mailErr) {
            console.error('Email error:', mailErr.message);
        }

        // --- 💬 WhatsApp Link Logic (FIXED VARIABLE) ---
        const waMessage = `🎓 *Welcome to VidyaSetu!*

Hello *${name}* 👋  
Your *Teacher Account* has been successfully created.

🔐 *Login Details:* 📧 Email: ${email}  
🔑 Password: ${password}

👉 Please login and change your password for security.

Let's build a brighter future together! 📚  
— *Team VidyaSetu*`;

        // FIXED: Using waMessage instead of message
        const encodedMsg = encodeURIComponent(waMessage); 
        
        // Logic: Use whatsappNumber if available, else contactNumber
        const targetNumber = whatsappNumber || contactNumber;
        const whatsappLink = `https://wa.me/${targetNumber}?text=${encodedMsg}`;

        return res.status(201).json({ 
            success: true, 
            message: "Teacher created successfully",
            teacher,
            whatsappLink 
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error", 
            error: error.message 
        });
    }
};

/**
 * 2. GET ALL TEACHERS
 */
exports.getAllTeachers = async (req, res) => {
    try {
        const { search } = req.query;
        let query = { role: 'TEACHER' };

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const teachers = await User.find(query).populate('coachingId');
        res.status(200).json({ success: true, teachers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 3. GET TEACHER BY ID
 */
exports.getTeacherById = async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id).populate('coachingId');
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });
        res.status(200).json({ success: true, teacher });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * 4. UPDATE TEACHER
 */
exports.updateTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, coachingName, contactNumber, whatsappNumber, address, qualifications, subject } = req.body;

        // 1. Pehle Teacher ko find karein
        let teacher = await User.findById(id);
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        // 2. Data update object taiyar karein
        let updates = { 
            name, email, contactNumber, whatsappNumber, 
            address, qualifications, subject 
        };

        // 3. Agar nayi photo aayi hai toh Cloudinary pe upload karein
        if (req.file && req.file.buffer) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'teachers');
                updates.profilePhoto = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("❌ Cloudinary Upload Error:", uploadError.message);
            }
        }

        // 4. AGAR COACHING NAME badla hai, toh Coaching Model mein update karein
        if (coachingName && teacher.coachingId) {
            await Coaching.findByIdAndUpdate(teacher.coachingId, { coachingName });
        }

        // 5. User model update karein
        const updatedTeacher = await User.findByIdAndUpdate(
            id, 
            { $set: updates }, 
            { new: true }
        ).populate('coachingId');

        res.status(200).json({ success: true, teacher: updatedTeacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 5. DELETE TEACHER
 */
exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        if (teacher.coachingId) {
            await Coaching.findByIdAndDelete(teacher.coachingId);
        }
        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "Teacher and Coaching deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * 6. UPDATE ADMIN PROFILE
 */

exports.updateAdminProfile = async (req, res) => {
    try {
        // --- 🛡️ ID Extraction Logic (The Fix) ---
        // Hum check karenge ki ID kahan chipi hai
        const adminId = req.user?._id || req.user?.id || req.user;

        if (!adminId) {
            return res.status(401).json({ success: false, message: "Token is valid but User ID is missing" });
        }

        const { name, contactNumber, whatsappNumber } = req.body;

        // User ko find karein
        const admin = await User.findById(adminId);

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found in Database" });
        }

        // Updates apply karein
        if (name) admin.name = name;
        if (contactNumber) admin.contactNumber = contactNumber;
        if (whatsappNumber) admin.whatsappNumber = whatsappNumber;

        // Handle file upload - upload to Cloudinary if file exists
        if (req.file && req.file.buffer) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'admins');
                admin.profilePhoto = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("❌ Cloudinary Upload Error:", uploadError.message);
            }
        }

        await admin.save();

        const updatedData = admin.toObject();
        delete updatedData.password;

        res.status(200).json({ success: true, user: updatedData });

    } catch (error) {
        console.error('Controller error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 7. CREATE BROADCAST
 */
exports.createBroadcast = async (req, res) => {
    try {
        const { type, target, title, description, version, downloadLink } = req.body;

        const newBroadcast = await Notice.create({
            type, 
            target, 
            title, 
            description, 
            version, 
            downloadLink,
            createdBy: req.user.id,
            coachingId: null 
        });

        let query = {};
        if (target !== 'ALL') query.role = target;
        const users = await User.find(query).select('pushToken');
        
        let students = [];
        if (target === 'ALL' || target === 'STUDENT') {
            students = await Student.find({}).select('pushToken');
        }

        let allTokens = [...users, ...students]
            .map(u => u.pushToken)
            .filter(token => token && Expo.isExpoPushToken(token));

        if (allTokens.length > 0) {
            let messages = allTokens.map(pushToken => ({
                to: pushToken,
                sound: 'default',
                title: type === 'UPDATE' ? `🚀 App Update: ${title}` : `📢 Notice: ${title}`,
                body: description,
                data: { type, version, downloadLink },
            }));

            let chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    await expo.sendPushNotificationsAsync(chunk);
                } catch (err) {
                    console.error('Notification error:', err);
                }
            }
        }

        res.status(201).json({ 
            success: true, 
            message: "Broadcast sent successfully", 
            data: newBroadcast 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 8. GET NOTICES
 */
exports.getNotices = async (req, res) => {
    try {
        const notices = await Notice.find({ 
            $or: [
                { coachingId: null }, 
                { coachingId: { $exists: false } }
            ] 
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, notices });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 9. DELETE NOTICE
 */
exports.deleteNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedNotice = await Notice.findByIdAndDelete(id);

        if (!deletedNotice) {
            return res.status(404).json({ success: false, message: "Notice not found" });
        }

        res.status(200).json({ success: true, message: "Notice deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
