const Student = require('../models/Student');
const Coaching = require('../models/Coaching');
const Fees = require('../models/Fees');
const User = require('../models/User');
const { createRazorpayOrder, verifyPaymentSignature } = require('../config/razorpay');
const sendEmail = require('../utils/sendEmail');

// ==========================================
// STUDENT: Create Razorpay Order for Fee Payment
// ==========================================
exports.createOnlinePaymentOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        
        // Get student from auth middleware
        const student = await Student.findOne({ userId: req.user.id });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const coachingId = student.coachingId?._id || student.coachingId;
        const receipt = `REC-${Date.now()}-${student._id.toString().slice(-6)}`;

        // Create Razorpay order
        const order = await createRazorpayOrder(amount, 'INR', receipt);

        // Store pending payment info (you could store this in a temporary collection or session)
        // For now, we'll verify it when the student confirms payment

        res.status(200).json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt,
                studentName: student.name,
                studentId: student._id
            }
        });
    } catch (error) {
        console.error("Create Payment Order Error:", error);
        res.status(500).json({ success: false, message: "Payment initialization failed: " + error.message });
    }
};

// ==========================================
// STUDENT: Verify and Complete Online Payment
// ==========================================
exports.verifyAndCompletePayment = async (req, res) => {
    try {
        const { 
            razorpayPaymentId, 
            razorpayOrderId, 
            razorpaySignature, 
            amount 
        } = req.body;

        // Get student from auth middleware
        const student = await Student.findOne({ userId: req.user.id });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        // Verify payment signature
        const isValidSignature = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        
        if (!isValidSignature) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        const today = new Date();
        const joinDate = new Date(student.joiningDate || student.createdAt);
        
        // Calculate fee logic (same as teacher collectFees)
        const diffTime = Math.max(0, today - joinDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const monthlyFee = Number(student.monthlyFees) || 0;
        const dailyRate = monthlyFee / 30;
        const totalExpectedTillNow = Math.round(diffDays * dailyRate);
        
        const previousPayments = await Fees.find({ studentId: student._id });
        const totalPaidBefore = previousPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

        const currentBalance = totalExpectedTillNow - (totalPaidBefore + Number(amount));

        // Create fee record with Razorpay details
        const receiptNumber = `REC-${Date.now()}`;
        const newFeeRecord = await Fees.create({
            studentId: student._id,
            coachingId: student.coachingId?._id || student.coachingId,
            amountPaid: Number(amount),
            balanceLeft: currentBalance,
            paymentDate: today,
            monthPaidFor: today,
            receiptNo: receiptNumber,
            paymentMethod: 'RAZORPAY',
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            paymentStatus: 'COMPLETED'
        });

        // Get coaching and teacher info for email
        const coaching = await Coaching.findById(student.coachingId?._id || student.coachingId);
        const coachingDisplayName = coaching ? coaching.coachingName : "Our Coaching Center";

        // Send payment confirmation email
        if (student.email) {
            try {
                const feeEmailTemplate = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6fb; padding:40px 0;">
                    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                        <div style="background:linear-gradient(135deg,#2e7d32,#43a047); padding:30px; text-align:center; color:#fff;">
                            <h1 style="margin:0; font-size:24px;">Online Payment Received ✅</h1>
                            <p style="margin:5px 0 0; opacity:0.9;">${coachingDisplayName}</p>
                        </div>
                        <div style="padding:35px;">
                            <h2 style="margin-top:0; color:#333;">Hi ${student.name},</h2>
                            <p style="font-size:16px; color:#444;">Your online payment has been successfully received. Here are the details:</p>
                            
                            <div style="background:#f9f9f9; border:1px solid #eee; padding:20px; border-radius:8px; margin:25px 0;">
                                <table style="width:100%; border-collapse:collapse;">
                                    <tr><td style="padding:8px 0; color:#666;">Receipt No:</td><td style="text-align:right; font-weight:bold;">${receiptNumber}</td></tr>
                                    <tr><td style="padding:8px 0; color:#666;">Date:</td><td style="text-align:right; font-weight:bold;">${today.toLocaleDateString('en-IN')}</td></tr>
                                    <tr><td style="padding:8px 0; color:#666;">Payment Method:</td><td style="text-align:right; font-weight:bold;">Online (Razorpay)</td></tr>
                                    <tr style="border-top:1px solid #eee;"><td style="padding:15px 0 8px; color:#2e7d32; font-size:18px; font-weight:bold;">Amount Paid:</td><td style="text-align:right; padding:15px 0 8px; color:#2e7d32; font-size:18px; font-weight:bold;">₹${amount}</td></tr>
                                    <tr><td style="padding:8px 0; color:#d32f2f; font-weight:bold;">Balance Remaining:</td><td style="text-align:right; padding:8px 0; color:#d32f2f; font-weight:bold;">₹${currentBalance}</td></tr>
                                </table>
                            </div>

                            <p style="font-size:14px; color:#777; text-align:center;">Thank you for your payment! VidyaSetu app par apni saari history check karein.</p>
                            <hr style="border:0; border-top:1px solid #eee; margin:30px 0;">
                            <p style="margin:0; color:#444;">Warm Regards,</p>
                            <p style="margin:5px 0; font-weight:bold; color:#2e7d32;">${coachingDisplayName}</p>
                            <p style="margin:0; font-size:12px; color:#888;">Powered by VidyaSetu</p>
                        </div>
                    </div>
                </div>`;

                await sendEmail({
                    email: student.email,
                    subject: `✅ Online Payment Received: ₹${amount} - ${coachingDisplayName}`,
                    html: feeEmailTemplate
                });
            } catch (mailErr) {
                console.error("⚠️ Fee Email error:", mailErr.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "Payment successful!",
            data: {
                receiptNumber,
                amountPaid: amount,
                balanceRemaining: currentBalance,
                paymentDate: today
            },
            record: newFeeRecord
        });
    } catch (error) {
        console.error("Verify Payment Error:", error);
        res.status(500).json({ success: false, message: "Payment verification failed: " + error.message });
    }
};

// ==========================================
// STUDENT: Get Fee Details & Due Amount
// ==========================================
exports.getStudentFeeDetails = async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user.id });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        const studentId = student._id;
        
        // Get all fee records
        const feeRecords = await Fees.find({ studentId }).sort({ paymentDate: -1 });
        const totalPaid = feeRecords.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);

        // Calculate expected fee
        const today = new Date();
        const joinDate = new Date(student.joiningDate || student.createdAt);
        const diffTime = Math.max(0, today - joinDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const monthlyFee = Number(student.monthlyFees) || 0;
        const dailyRate = monthlyFee / 30;
        const totalExpectedTillNow = Math.round(diffDays * dailyRate);
        const totalDue = Math.max(0, totalExpectedTillNow - totalPaid);

        // Get Razorpay key for frontend
        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;

        res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    name: student.name,
                    monthlyFees: monthlyFee
                },
                feeDetails: {
                    totalPaid,
                    totalDue,
                    totalExpected: totalExpectedTillNow,
                    daysActive: diffDays,
                    monthlyFee
                },
                history: feeRecords,
                razorpayKeyId
            }
        });
    } catch (error) {
        console.error("Get Fee Details Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// TEACHER: Get All Students Fee Status
// ==========================================
exports.getAllStudentsFeeStatus = async (req, res) => {
    try {
        const coachingId = req.user.coachingId;
        
        // Get all students for this coaching
        const students = await Student.find({ coachingId }).lean();
        
        const today = new Date();
        const studentFeeStatus = [];

        for (const student of students) {
            // Get all fee records for this student
            const feeRecords = await Fees.find({ studentId: student._id }).lean();
            const totalPaid = feeRecords.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);

            // Calculate expected fee
            const joinDate = new Date(student.joiningDate || student.createdAt);
            const diffTime = Math.max(0, today - joinDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            const monthlyFee = Number(student.monthlyFees) || 0;
            const dailyRate = monthlyFee / 30;
            const totalExpectedTillNow = Math.round(diffDays * dailyRate);
            const totalDue = Math.max(0, totalExpectedTillNow - totalPaid);

            // Determine payment status
            let paymentStatus = 'UNPAID';
            if (totalDue <= 0) {
                paymentStatus = 'PAID';
            } else if (totalPaid > 0) {
                paymentStatus = 'PARTIAL';
            }

            studentFeeStatus.push({
                _id: student._id,
                name: student.name,
                studentLoginId: student.studentLoginId,
                mobileNumber: student.mobileNumber,
                monthlyFees: monthlyFee,
                totalPaid,
                totalDue,
                totalExpected: totalExpectedTillNow,
                paymentStatus,
                lastPaymentDate: feeRecords.length > 0 ? feeRecords[0].paymentDate : null,
                paymentHistory: feeRecords.slice(0, 3) // Last 3 payments
            });
        }

        // Sort: Unpaid first, then partial, then paid
        studentFeeStatus.sort((a, b) => {
            const statusOrder = { 'UNPAID': 0, 'PARTIAL': 1, 'PAID': 2 };
            return statusOrder[a.paymentStatus] - statusOrder[b.paymentStatus];
        });

        // Calculate summary
        const summary = {
            totalStudents: students.length,
            paidStudents: studentFeeStatus.filter(s => s.paymentStatus === 'PAID').length,
            partialStudents: studentFeeStatus.filter(s => s.paymentStatus === 'PARTIAL').length,
            unpaidStudents: studentFeeStatus.filter(s => s.paymentStatus === 'UNPAID').length,
            totalCollected: studentFeeStatus.reduce((sum, s) => sum + s.totalPaid, 0),
            totalPending: studentFeeStatus.reduce((sum, s) => sum + s.totalDue, 0)
        };

        res.status(200).json({
            success: true,
            students: studentFeeStatus,
            summary
        });
    } catch (error) {
        console.error("Get All Students Fee Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// TEACHER: Get Single Student Fee Details
// ==========================================
exports.getStudentFeeHistory = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const feeRecords = await Fees.find({ studentId }).sort({ paymentDate: -1 });
        const totalPaid = feeRecords.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);

        // Calculate expected fee
        const today = new Date();
        const joinDate = new Date(student.joiningDate || student.createdAt);
        const diffTime = Math.max(0, today - joinDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const monthlyFee = Number(student.monthlyFees) || 0;
        const dailyRate = monthlyFee / 30;
        const totalExpectedTillNow = Math.round(diffDays * dailyRate);
        const totalDue = Math.max(0, totalExpectedTillNow - totalPaid);

        res.status(200).json({
            success: true,
            student: {
                _id: student._id,
                name: student.name,
                studentLoginId: student.studentLoginId,
                monthlyFees: monthlyFee
            },
            feeDetails: {
                totalPaid,
                totalDue,
                totalExpected: totalExpectedTillNow,
                daysActive: diffDays
            },
            history: feeRecords
        });
    } catch (error) {
        console.error("Get Student Fee History Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// TEACHER: Add Old/Backdated Fee Payment
// ==========================================
exports.addOldFeePayment = async (req, res) => {
    try {
        const { studentId, amountPaid, paymentDate, paymentMethod, remarks } = req.body;
        
        if (!studentId || !amountPaid || !paymentDate) {
            return res.status(400).json({ success: false, message: "Student ID, amount, and payment date are required" });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const paymentDateObj = new Date(paymentDate);
        const joinDate = new Date(student.joiningDate || student.createdAt);
        
        // Calculate expected fee up to the payment date
        const diffTime = Math.max(0, paymentDateObj - joinDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const monthlyFee = Number(student.monthlyFees) || 0;
        const dailyRate = monthlyFee / 30;
        const totalExpectedTillPaymentDate = Math.round(diffDays * dailyRate);
        
        // Get all payments before this payment date
        const previousPayments = await Fees.find({ 
            studentId,
            paymentDate: { $lt: paymentDateObj }
        });
        const totalPaidBefore = previousPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

        const currentBalance = totalExpectedTillPaymentDate - (totalPaidBefore + Number(amountPaid));

        const receiptNumber = `REC-${Date.now()}`;
        const newFeeRecord = await Fees.create({
            studentId,
            coachingId: student.coachingId?._id || student.coachingId,
            amountPaid: Number(amountPaid),
            balanceLeft: currentBalance,
            paymentDate: paymentDateObj,
            monthPaidFor: paymentDateObj,
            receiptNo: receiptNumber,
            paymentMethod: paymentMethod || 'CASH',
            remarks: remarks || 'Old Fee Payment',
            paymentStatus: 'COMPLETED'
        });

        res.status(200).json({
            success: true,
            message: "Old fee payment added successfully",
            record: newFeeRecord
        });
    } catch (error) {
        console.error("Add Old Fee Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// TEACHER: Update Student Monthly Fees and Joining Date
// ==========================================
exports.updateStudentFeeSettings = async (req, res) => {
    try {
        const { studentId, monthlyFees, joiningDate } = req.body;
        
        if (!studentId) {
            return res.status(400).json({ success: false, message: "Student ID is required" });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const updateData = {};
        
        if (monthlyFees !== undefined) {
            updateData.monthlyFees = Number(monthlyFees);
        }
        
        if (joiningDate) {
            updateData.joiningDate = new Date(joiningDate);
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            studentId,
            { $set: updateData },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Student fee settings updated successfully",
            student: {
                _id: updatedStudent._id,
                name: updatedStudent.name,
                monthlyFees: updatedStudent.monthlyFees,
                joiningDate: updatedStudent.joiningDate
            }
        });
    } catch (error) {
        console.error("Update Student Fee Settings Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
