const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Fees = require('../models/Fees');
const Homework = require('../models/Homework');
const Notice = require('../models/Notice');
const User = require('../models/User');
/**
 * 🛠️ HELPER FUNCTION: Token ID se Student dhoondne ke liye
 */
const findStudentByAnyId = async (idFromToken) => {
    let student = await Student.findById(idFromToken)
        .populate('teacherId', 'name email profilePhoto qualification subject')
        .populate('coachingId', 'coachingName');

    if (!student) {
        student = await Student.findOne({ userId: idFromToken })
            .populate('teacherId', 'name email profilePhoto qualification subject')
            .populate('coachingId', 'coachingName');
    }
    return student;
};

// --- 🏠 DASHBOARD (Daily Fees + Teacher/Admin Notices) ---
exports.getStudentDashboard = async (req, res) => {
    try {
        const student = await findStudentByAnyId(req.user.id);
        if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });

        const studentId = student._id;
        const coachingId = student.coachingId?._id || student.coachingId;

        // 1. Attendance & Fees Logic (Daily Update Logic)
        const [attendance, feeRecords] = await Promise.all([
            Attendance.find({ studentId }),
            Fees.find({ studentId }).sort({ paymentDate: -1 })
        ]);

        const totalPaid = feeRecords.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);
        const diffDays = Math.floor((new Date() - new Date(student.joiningDate || student.createdAt)) / (1000 * 60 * 60 * 24)) + 1;
        
        // Fee Calculation Synced with Teacher logic
        const monthlyFee = Number(student.monthlyFees) || 0;
        const dailyRate = monthlyFee / 30;
        const totalDue = Math.max(0, Math.round((diffDays * dailyRate) - totalPaid));
const developer = await User.findOne({ role: 'SUPER_ADMIN' })
            .select('name email whatsappNumber profilePhoto contactNumber');
        // 2. 📢 SYNCED NOTICE QUERY (Teacher + Super Admin Broadcast)
        const notices = await Notice.find({
            $or: [
                { coachingId: coachingId, target: { $in: ['STUDENT', 'ALL'] } }, // Teacher Notice
                { coachingId: null, target: 'ALL' },                            // Admin Global
                { target: 'STUDENT', coachingId: null }                        // Admin for Students
            ]
        }).sort({ createdAt: -1 }).limit(10);

        res.status(200).json({
            success: true,
            data: {
                profile: student,
                teacher: student.teacherId || null,
                developer: developer,
                stats: {
                    attendancePercentage: attendance.length > 0 ? ((attendance.filter(a => a.status === 'Present').length / attendance.length) * 100).toFixed(1) : 0,
                    totalDue,
                    totalPaid,
                    daysActive: diffDays,
                    monthlyFees: monthlyFee
                },
                notices,
                feeHistory: feeRecords.slice(0, 5)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 📢 GET ALL NOTICES (Combined View) ---
exports.getAllStudentNotices = async (req, res) => {
    try {
        const student = await findStudentByAnyId(req.user.id);
        const coachingId = student.coachingId?._id || student.coachingId;

        const notices = await Notice.find({
            $or: [
                { coachingId: coachingId, target: { $in: ['STUDENT', 'ALL'] } },
                { coachingId: null } // Super Admin broadcasts
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, notices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 📅 ATTENDANCE HISTORY ---
exports.getAttendanceHistory = async (req, res) => {
    try {
        const student = await findStudentByAnyId(req.user.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const history = await Attendance.find({ studentId: student._id }).sort({ date: -1 });
        
        const stats = {
            Present: history.filter(a => a.status === 'Present').length,
            Absent: history.filter(a => a.status === 'Absent').length,
            Holiday: history.filter(a => a.status === 'Holiday').length,
            Late: history.filter(a => a.status === 'Late').length,
        };

        res.status(200).json({ success: true, stats, history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 💸 FEE HISTORY ---
exports.getFeeHistory = async (req, res) => {
    try {
        const student = await findStudentByAnyId(req.user.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const history = await Fees.find({ studentId: student._id }).sort({ paymentDate: -1 });
        const totalPaid = history.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

        res.status(200).json({ success: true, totalPaid, history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 📚 HOMEWORK ---
exports.getStudentHomework = async (req, res) => {
    try {
        const student = await findStudentByAnyId(req.user.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });
        const coachingId = student.coachingId?._id || student.coachingId;
        
        const homeworks = await Homework.find({ coachingId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, homeworks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// studentController.js
exports.getMyTeachers = async (req, res) => {
    try {
        // Step 1: Pehle student ka profile dhoondo taaki uski coachingId mil sake
        const student = await findStudentByAnyId(req.user.id);
        
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const coachingId = student.coachingId?._id || student.coachingId;

        // Step 2: Wahi Teachers dhoondo jinki coachingId student se match karti ho
        const teachers = await User.find({ 
            coachingId: coachingId, 
            role: 'TEACHER' 
        }).select('name subject qualifications profilePhoto contactNumber whatsappNumber');
        
        // Step 3: Response bhejo
        res.status(200).json({ 
            success: true, 
            count: teachers.length,
            teachers 
        });
    } catch (error) {
        console.error("Error in getMyTeachers:", error);
        res.status(500).json({ success: false, message: "Error fetching teachers" });
    }
};

exports.getHomeworkHistory = async (req, res) => {
    try {
        const history = await Homework.find({ 
            teacherId: req.user._id || req.user.id 
        }).sort({ createdAt: -1 });

        res.status(200).json({ 
            success: true, 
            history: history 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
