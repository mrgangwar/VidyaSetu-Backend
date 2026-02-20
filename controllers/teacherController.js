const Student = require('../models/Student');
const User = require('../models/User');
const Homework = require('../models/Homework');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const Fees = require('../models/Fees');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const { Expo } = require('expo-server-sdk');
const path = require('path');
const fs = require('fs');
const Coaching = require('../models/Coaching'); // Ye line add kar lena agar nahi hai
const { uploadToCloudinary } = require('../middleware/uploadMiddleware');

// Initialize Expo client for Push Notifications
let expo = new Expo();

// ==========================================
// 1. STUDENT MANAGEMENT
// ==========================================

/**
 * @desc Create Student
 */
exports.createStudent = async (req, res) => {
    try {
        const { 
            name, fatherName, collegeName, address, mobileNumber, 
            email, studentLoginId, password, batchTime, session, 
            parentMobile, monthlyFees, joiningDate 
        } = req.body;

        if (!name || !studentLoginId || !password || !monthlyFees) {
            return res.status(400).json({ success: false, message: "Required fields missing." });
        }

        if (!req.user?.coachingId) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please re-login." });
        }

        const studentExists = await Student.findOne({ studentLoginId });
        if (studentExists) return res.status(400).json({ success: false, message: "Login ID already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        let profilePhoto = "";
        if (req.file && req.file.buffer) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'students');
                profilePhoto = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("❌ Student Photo Upload Error:", uploadError.message);
            }
        } else if (req.file && req.file.filename) {
            profilePhoto = `/uploads/${req.file.filename}`;
        }

        const student = await Student.create({
            name, fatherName, collegeName, address, mobileNumber,
            email,
            studentLoginId, 
            password: hashedPassword,
            profilePhoto, 
            batchTime, 
            session, 
            parentMobile,
            monthlyFees: Number(monthlyFees),
            joiningDate: joiningDate || new Date(),
            role: 'STUDENT',
            coachingId: req.user.coachingId,
            teacherId: req.user.id
        });

        // Fetch Coaching and Teacher Details for Messaging
        const coaching = await Coaching.findById(req.user.coachingId);
        const coachingDisplayName = coaching ? coaching.coachingName : "Our Coaching Center";
        const teacherName = req.user.name;

        // ==========================================
        // 1. PROFESSIONAL EMAIL LOGIC
        // ==========================================
        if (email) {
            try {
                const studentProfessionalMessage = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6fb; padding:40px 0;">
                    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                        <div style="background:linear-gradient(135deg,#1a237e,#3949ab); padding:30px; text-align:center; color:#fff;">
                            <h1 style="margin:0; font-size:28px;">Welcome to ${coachingDisplayName} 🎓</h1>
                            <p style="margin:5px 0 0; opacity:0.9;">Powered by VidyaSetu</p>
                        </div>
                        <div style="padding:35px;">
                            <h2 style="margin-top:0; color:#333;">Hello ${name},</h2>
                            <p style="font-size:16px; color:#444; line-height:1.6;">
                                Aapka enrollment <b>${coachingDisplayName}</b> mein successfully ho gaya hai. 
                                Aapki classes <b>${teacherName}</b> sir/ma'am ke guidance mein rahegi.
                            </p>
                            <div style="background:#f2f7ff; border-left:5px solid #1a237e; padding:18px; border-radius:8px; margin:25px 0;">
                                <h3 style="margin-top:0; color:#1a237e;">🔐 Your Login Credentials</h3>
                                <p style="margin:8px 0; font-size:15px;"><b>Student ID:</b> <span style="color:#d32f2f;">${studentLoginId}</span></p>
                                <p style="margin:8px 0; font-size:15px;"><b>Password:</b> <span style="color:#d32f2f;">${password}</span></p>
                            </div>
                            <p style="color:#777;">Warm Regards,<br/><b>${teacherName}</b><br/>Team VidyaSetu</p>
                        </div>
                    </div>
                </div>`;

                await sendEmail({
                    email: email,
                    subject: `🎉 Welcome to ${coachingDisplayName} - Your Account is Ready`,
                    html: studentProfessionalMessage
                });
            } catch (mailErr) {
                console.error("⚠️ Student Email error:", mailErr.message);
            }
        }

        // ==========================================
        // 2. WHATSAPP LINK LOGIC (NEW ADDITION)
        // ==========================================
        const waMessage = `🎓 *Welcome to ${coachingDisplayName}!*

Hi *${name}* 👋, aapka student account successfully create ho gaya hai.

🔐 *Login Credentials:*
📧 *ID:* ${studentLoginId}
🔑 *Pass:* ${password}

App download karein aur apni progress track karein. 📚
— *${teacherName} (via VidyaSetu)*`;

        const encodedMsg = encodeURIComponent(waMessage); 
        const targetNumber = mobileNumber || parentMobile || "";
        const whatsappLink = `https://wa.me/${targetNumber}?text=${encodedMsg}`;

        // ==========================================

        res.status(201).json({ 
            success: true, 
            message: "Student created successfully",
            student,
            whatsappLink 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Get All My Students
 */
exports.getMyStudents = async (req, res) => {
    try {
        const coachingId = req.user?.coachingId;
        if (!coachingId) return res.status(401).json({ success: false, message: "Access Denied" });

        const students = await Student.find({ coachingId }).sort({ name: 1 }).lean();
        res.status(200).json({ success: true, count: students.length, students });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @desc Get Single Student Details
 */
exports.getStudentDetails = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });
        res.status(200).json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching details", error: error.message });
    }
};

/**
 * @desc Update Student
 */
exports.updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        let updateData = { ...req.body };

        if (updateData.password && updateData.password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        } else {
            delete updateData.password;
        }

        if (updateData.monthlyFees) updateData.monthlyFees = Number(updateData.monthlyFees);

        if (req.file && req.file.buffer) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'students');
                updateData.profilePhoto = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("❌ Student Photo Upload Error:", uploadError.message);
            }
        } else if (req.file && req.file.filename) {
            updateData.profilePhoto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const student = await Student.findByIdAndUpdate(
            id, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        res.status(200).json({ success: true, message: "Updated!", student });
    } catch (error) {
        console.error("❌ Deep Scan Error (Update Student):", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc Delete Student
 */
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        await Attendance.deleteMany({ studentId: req.params.id });
        await Fees.deleteMany({ studentId: req.params.id });

        res.status(200).json({ success: true, message: "Student record deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// 2. ATTENDANCE SYSTEM
// ==========================================

/**
 * @desc Mark Attendance (Bulk Write)
 */
exports.markAttendance = async (req, res) => {
    try {
        const { attendanceData, isHoliday, date } = req.body; 
        
        if (!isHoliday && (!attendanceData || !Array.isArray(attendanceData))) {
            return res.status(400).json({ success: false, message: "Attendance data is required." });
        }

        const teacherId = req.user.id || req.user._id;
        const coachingId = req.user.coachingId;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const ops = isHoliday 
            ? (await Student.find({ coachingId })).map(s => ({
                updateOne: {
                    filter: { studentId: s._id, date: targetDate },
                    update: { $set: { status: 'Holiday', teacherId, coachingId, date: targetDate } },
                    upsert: true
                }
              }))
            : attendanceData.map(record => ({
                updateOne: {
                    filter: { studentId: record.studentId, date: targetDate },
                    update: { $set: { status: record.status, teacherId, coachingId, date: targetDate } },
                    upsert: true
                }
              }));

        if (ops.length > 0) await Attendance.bulkWrite(ops);
        res.status(200).json({ success: true, message: "Sync successful!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc Get Today's Attendance
 */
exports.getTodayAttendance = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await Attendance.find({
            coachingId: req.user.coachingId,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).select('studentId status');

        res.status(200).json({ success: true, attendance }); 
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc Get Attendance History by Specific Date
 */
exports.getAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: "Date is required (YYYY-MM-DD)" });

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const attendanceRecords = await Attendance.find({
            coachingId: req.user.coachingId,
            date: targetDate
        }).populate('studentId', 'name studentLoginId batchTime');

        res.status(200).json({ 
            success: true, 
            count: attendanceRecords.length,
            attendance: attendanceRecords 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc Get Individual Student Attendance Stats
 */
exports.getStudentAttendanceStats = async (req, res) => {
    try {
        const { studentId } = req.params;
        const records = await Attendance.find({ studentId }).sort({ date: -1 });

        if (!records || records.length === 0) {
            return res.status(200).json({
                success: true,
                stats: { totalDays: 0, presentDays: 0, absentDays: 0, holidays: 0, percentage: "0%" },
                history: []
            });
        }

        const totalRecords = records.length;
        const presents = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
        const absents = records.filter(r => r.status === 'Absent').length;
        const holidays = records.filter(r => r.status === 'Holiday').length;
        const leaves = records.filter(r => r.status === 'Leave').length;

        const totalEffectiveDays = totalRecords - holidays;
        const percentage = totalEffectiveDays > 0 
            ? ((presents / totalEffectiveDays) * 100).toFixed(2) 
            : "0.00";

        res.status(200).json({
            success: true,
            stats: {
                totalDays: totalRecords,
                presentDays: presents,
                absentDays: absents,
                holidays: holidays,
                leaveDays: leaves,
                percentage: `${percentage}%`
            },
            history: records 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * @desc Delete Attendance Records by Date
 */
exports.deleteAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        await Attendance.deleteMany({
            coachingId: req.user.coachingId,
            date: targetDate
        });

        res.status(200).json({ success: true, message: "Attendance records deleted for this date." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// 3. FEES MANAGEMENT
// ==========================================

/**
 * @desc Collect Student Fees
 */
/**
 * @desc Collect Fees with Daily Accrual Logic
 */
exports.collectFees = async (req, res) => {
    try {
        const { studentId, amountPaid } = req.body;
        
        // 1. Fetch Student, Coaching, and Teacher Details
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const coaching = await Coaching.findById(req.user.coachingId);
        const coachingDisplayName = coaching ? coaching.coachingName : "Our Coaching Center";
        const teacherName = req.user.name;

        const today = new Date();
        const joinDate = new Date(student.joiningDate || student.createdAt);
        
        // 2. Calculation Logic
        const diffTime = Math.max(0, today - joinDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; 

        const monthlyFee = Number(student.monthlyFees) || 0;
        const dailyRate = monthlyFee / 30;
        const totalExpectedTillNow = Math.round(diffDays * dailyRate);
        
        const previousPayments = await Fees.find({ studentId });
        const totalPaidBefore = previousPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

        const currentBalance = totalExpectedTillNow - (totalPaidBefore + Number(amountPaid));

        // 3. Save Fee Record
        const receiptNumber = `REC-${Date.now()}`;
        const newFeeRecord = await Fees.create({
            studentId,
            coachingId: req.user.coachingId,
            amountPaid: Number(amountPaid),
            balanceLeft: currentBalance,
            paymentDate: today,
            monthPaidFor: today,
            receiptNo: receiptNumber
        });

        // ==========================================
        // 📧 PROFESSIONAL FEE RECEIPT EMAIL
        // ==========================================
        if (student.email) {
            try {
                const feeEmailTemplate = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6fb; padding:40px 0;">
                    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                        <div style="background:linear-gradient(135deg,#2e7d32,#43a047); padding:30px; text-align:center; color:#fff;">
                            <h1 style="margin:0; font-size:24px;">Fee Payment Receipt 📄</h1>
                            <p style="margin:5px 0 0; opacity:0.9;">${coachingDisplayName}</p>
                        </div>
                        <div style="padding:35px;">
                            <h2 style="margin-top:0; color:#333;">Hi ${student.name},</h2>
                            <p style="font-size:16px; color:#444;">Aapki fees successfully jama ho gayi hai. Niche details di gayi hain:</p>
                            
                            <div style="background:#f9f9f9; border:1px solid #eee; padding:20px; border-radius:8px; margin:25px 0;">
                                <table style="width:100%; border-collapse:collapse;">
                                    <tr><td style="padding:8px 0; color:#666;">Receipt No:</td><td style="text-align:right; font-weight:bold;">${receiptNumber}</td></tr>
                                    <tr><td style="padding:8px 0; color:#666;">Date:</td><td style="text-align:right; font-weight:bold;">${today.toLocaleDateString('en-IN')}</td></tr>
                                    <tr style="border-top:1px solid #eee;"><td style="padding:15px 0 8px; color:#2e7d32; font-size:18px; font-weight:bold;">Amount Paid:</td><td style="text-align:right; padding:15px 0 8px; color:#2e7d32; font-size:18px; font-weight:bold;">₹${amountPaid}</td></tr>
                                    <tr><td style="padding:8px 0; color:#d32f2f; font-weight:bold;">Balance Remaining:</td><td style="text-align:right; padding:8px 0; color:#d32f2f; font-weight:bold;">₹${currentBalance}</td></tr>
                                </table>
                            </div>

                            <p style="font-size:14px; color:#777; text-align:center;">Thank you for your payment! VidyaSetu app par apni saari history check karein.</p>
                            <hr style="border:0; border-top:1px solid #eee; margin:30px 0;">
                            <p style="margin:0; color:#444;">Warm Regards,</p>
                            <p style="margin:5px 0; font-weight:bold; color:#2e7d32;">${teacherName}</p>
                            <p style="margin:0; font-size:12px; color:#888;">${coachingDisplayName} | Powered by VidyaSetu</p>
                        </div>
                    </div>
                </div>`;

                await sendEmail({
                    email: student.email,
                    subject: `✅ Fee Receipt: ₹${amountPaid} received - ${coachingDisplayName}`,
                    html: feeEmailTemplate
                });
            } catch (mailErr) {
                console.error("⚠️ Fee Email error:", mailErr.message);
            }
        }

        // ==========================================
        // 💬 WHATSAPP RECEIPT LOGIC
        // ==========================================
        const waFeeMessage = `✅ *Fee Payment Received*

Hi *${student.name}* 👋,
Aapki fees successfully collect kar li gayi hai.

📊 *Payment Summary:*
💰 *Amount Paid:* ₹${amountPaid}
📅 *Date:* ${today.toLocaleDateString('en-IN')}
🧾 *Receipt No:* ${receiptNumber}
🛑 *Remaining Balance:* ₹${currentBalance}

_Tension na lein, VidyaSetu app par sab kuch update ho gaya hai._ 📚
— *${teacherName} (${coachingDisplayName})*`;

        const encodedMsg = encodeURIComponent(waFeeMessage);
        const targetNumber = student.mobileNumber || student.parentMobile || "";
        const whatsappLink = `https://wa.me/${targetNumber}?text=${encodedMsg}`;

        // Final Response
        res.status(200).json({ 
            success: true, 
            message: "Fee collected successfully",
            data: {
                daysCounted: diffDays,
                totalDue: totalExpectedTillNow,
                paidNow: amountPaid,
                balanceRemaining: currentBalance
            },
            record: newFeeRecord,
            whatsappLink
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Fee Error: " + error.message });
    }
};
/**
 * @desc Get Coaching-wide Fee Stats (Daily Basis)
 */
exports.getCoachingFeeStats = async (req, res) => {
    try {
        const coachingId = req.user?.coachingId;
        const [students, allPayments] = await Promise.all([
            Student.find({ coachingId }).lean(),
            Fees.find({ coachingId }).lean()
        ]);

        const totalCollected = allPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
        let totalExpected = 0;
        const today = new Date();

        students.forEach(student => {
            const joinDate = new Date(student.joiningDate || student.createdAt);
            const monthlyFee = Number(student.monthlyFees) || 0;
            const dailyRate = monthlyFee / 30;

            // Rozana ke hisab se kitni fees banti hai
            const diffTime = Math.max(0, today - joinDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            totalExpected += (diffDays * dailyRate);
        });

        res.status(200).json({
            success: true,
            stats: {
                totalCollected: Math.round(totalCollected),
                totalPending: Math.max(0, Math.round(totalExpected - totalCollected)),
                totalStudents: students.length,
                totalRevenueGenerated: Math.round(totalExpected)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// 4. NOTICE BOARD
// ==========================================

/**
 * @desc Create Notice for Students
 */
exports.teacherCreateNotice = async (req, res) => {
    try {
        const { title, description } = req.body;
        const coachingId = req.user?.coachingId;

        if(!title || !description) return res.status(400).json({ success: false, message: "Fields required" });

        const newNotice = await Notice.create({
            title, description, type: 'NOTICE', 
            createdBy: req.user.id, coachingId, target: 'STUDENT'
        });

        const students = await Student.find({ coachingId }).select('pushToken');
        let messages = [];

        for (let student of students) {
            if (student.pushToken && Expo.isExpoPushToken(student.pushToken)) {
                messages.push({
                    to: student.pushToken,
                    sound: 'default',
                    title: `📢 Notice: ${title}`,
                    body: description,
                    data: { screen: 'NoticeBoard' },
                });
            }
        }

        if (messages.length > 0) {
            let chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try { await expo.sendPushNotificationsAsync(chunk); } 
                catch (e) { console.error("❌ Notification fail", e); }
            }
        }

        res.status(201).json({ success: true, notice: newNotice });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * @desc Get My Coaching Notices
 */
exports.getMyNotices = async (req, res) => {
    try {
        const notices = await Notice.find({ coachingId: req.user.coachingId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, notices });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc Delete Notice
 */
exports.deleteNotice = async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Notice removed" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc Get Broadcasts from Super Admin
 */
exports.getSuperAdminNotices = async (req, res) => {
    try {
        const broadcasts = await Notice.find({
            $or: [
                { coachingId: null },
                { coachingId: { $exists: false } }
            ],
            target: { $in: ['TEACHER', 'ALL'] },
            isActive: true
        }).sort({ createdAt: -1 });

        res.status(200).json({ 
            success: true, 
            count: broadcasts.length,
            notices: broadcasts 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// 5. HOMEWORK MANAGEMENT
// ==========================================

/**
 * @desc Create Homework (with Push Notifications)
 */
exports.createHomework = async (req, res) => {
    try {
        const { title, description, batchTime, dueDate } = req.body;
        const teacherId = req.user._id || req.user.id;

        if (!title || !batchTime) {
            return res.status(400).json({ success: false, message: "Title and Batch Time are required." });
        }

        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => ({
                fileUrl: `/uploads/homework/${file.filename}`,
                fileType: file.mimetype.includes('pdf') ? 'pdf' : 'image'
            }));
        }

        const homework = await Homework.create({
            teacherId: teacherId,
            coachingId: req.user.coachingId,
            title,
            description,
            batchTime,
            dueDate: dueDate || null,
            attachments: attachments
        });

        try {
            const students = await Student.find({ 
                coachingId: req.user.coachingId, 
                batchTime: { $regex: batchTime, $options: 'i' } 
            }).select('pushToken');

            let messages = [];
            for (let student of students) {
                if (student.pushToken && Expo.isExpoPushToken(student.pushToken)) {
                    messages.push({
                        to: student.pushToken,
                        sound: 'default',
                        title: '📝 New Homework Assigned',
                        body: `${title} (Batch: ${batchTime})`,
                        data: { homeworkId: homework._id },
                    });
                }
            }
            if (messages.length > 0) {
                let chunks = expo.chunkPushNotifications(messages);
                for (let chunk of chunks) {
                    await expo.sendPushNotificationsAsync(chunk);
                }
            }
        } catch (pushError) {
            console.error("🔔 Push Error:", pushError.message);
        }

        res.status(201).json({ success: true, message: "Homework assigned! 🚀", homework });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Get Teacher's Homework History
 */
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

/**
 * @desc Delete Homework and associated files
 */
exports.deleteHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const homework = await Homework.findById(id);

        if (!homework) return res.status(404).json({ success: false, message: "Homework nahi mila" });

        if (homework.attachments && homework.attachments.length > 0) {
            homework.attachments.forEach(file => {
                const filePath = path.join(process.cwd(), file.fileUrl); 
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (err) {
                        console.error("File delete error:", err.message);
                    }
                }
            });
        }

        await Homework.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during delete" });
    }
};

// ==========================================
// 6. PROFILE & CONTACT
// ==========================================

/**
 * @desc Get Teacher's Own Profile
 */
exports.getTeacherProfile = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });

        const teacher = await User.findById(userId).select('-password');
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

        res.status(200).json({ success: true, user: teacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Update Teacher Profile (Self or Admin)
 */
exports.updateTeacherProfile = async (req, res) => {
    try {
        const targetId = req.params.id || req.user?.id;
        if (!targetId) return res.status(400).json({ success: false, message: "User ID is required" });

        const { 
            name, coachingName, contactNumber, whatsappNumber, 
            qualifications, address, subject 
        } = req.body;

        let updateData = {};
        if (name) updateData.name = name;
        if (coachingName) updateData.coachingName = coachingName;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (whatsappNumber) updateData.whatsappNumber = whatsappNumber;
        if (qualifications) updateData.qualifications = qualifications;
        if (address) updateData.address = address;
        if (subject) updateData.subject = subject;

        if (req.file && req.file.buffer) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'teachers');
                updateData.profilePhoto = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("❌ Cloudinary Upload Error:", uploadError.message);
            }
        } else if (req.file && req.file.filename) {
            // Fallback for disk storage
            updateData.profilePhoto = `/uploads/${req.file.filename}`;
        }

        const updatedUser = await User.findByIdAndUpdate(
            targetId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

        res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully!", 
            user: updatedUser 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Get Developer/Super Admin Contact Details
 */
exports.getDeveloperContact = async (req, res) => {
    try {
        const admin = await User.findOne({ role: 'SUPER_ADMIN' })
            .select('name email whatsappNumber contactNumber profilePhoto');
        if (!admin) return res.status(404).json({ success: false, message: "Developer details unavailable" });
        res.status(200).json({ success: true, admin });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
