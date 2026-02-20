const User = require('../models/User');
const Student = require('../models/Student');
const Notice = require('../models/Notice'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * 1. Login Logic
 */
exports.login = async (req, res) => {
    try {
        const { emailOrId, password } = req.body;
        let user;
        let isStudentTable = false;

        // 1. Admin/Teacher Check
        user = await User.findOne({ email: emailOrId.toLowerCase().trim() }).populate('coachingId', 'coachingName');
        
        // 2. Student Check
        if (!user) {
            user = await Student.findOne({
                $or: [
                    { studentLoginId: emailOrId.trim() },
                    { email: emailOrId.toLowerCase().trim() }
                ]
            }).populate('coachingId', 'coachingName');
            if (user) isStudentTable = true;
        }

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid Credentials" });
        }

        // 3. Password Check (Assuming student password is also hashed)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Password does not match" });
        }

        // 4. Token Generation
        const token = jwt.sign(
            { 
                id: user._id, 
                role: user.role || (isStudentTable ? 'STUDENT' : 'USER'), 
                coachingId: user.coachingId?._id || user.coachingId 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role || (isStudentTable ? 'STUDENT' : 'USER'),
                coachingId: user.coachingId?._id || user.coachingId,
                coachingName: user.coachingId?.coachingName || "Coaching Center",
                profilePhoto: user.profilePhoto || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * 2. Get Notices (Filtered by Role & Coaching)
 */
exports.getNotices = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const coachingId = req.user?.coachingId;

        if (!coachingId) {
            return res.status(200).json({ success: true, notices: [] });
        }

        // Search notices for this coaching AND (matching role OR 'ALL')
        const query = {
            coachingId: coachingId,
            target: { $in: ['ALL', userRole] }
        };

        const notices = await Notice.find(query).sort({ createdAt: -1 });

        res.status(200).json({ success: true, notices });
    } catch (error) {
        console.error("Get Notices Error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch notices" });
    }
};

/**
 * 3. Update Push Token
 */
exports.updatePushToken = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { pushToken } = req.body;

        if (!pushToken || !userId) {
            return res.status(400).json({ success: false, message: "Invalid Request" });
        }

        // Try updating User first
        let user = await User.findByIdAndUpdate(userId, { pushToken }, { new: true });
        
        // If not a User, try Student
        if (!user) {
            user = await Student.findByIdAndUpdate(userId, { pushToken }, { new: true });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "Push token updated successfully" });
    } catch (error) {
        console.error("Push Token Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// authController.js ke andar
exports.getMe = async (req, res) => {
    try {
        let user;

        if (req.user.role === 'STUDENT') {
            user = await Student.findById(req.user.id).select('-password');
        } else {
            user = await User.findById(req.user.id).select('-password');
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
