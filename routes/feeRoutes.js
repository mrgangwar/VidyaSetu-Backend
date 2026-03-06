const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const feeController = require('../controllers/feeController');

// ==========================================
// STUDENT ROUTES (Online Payment)
// ==========================================

// Create Razorpay order for fee payment
router.post('/create-payment-order', protect, authorize('STUDENT'), feeController.createOnlinePaymentOrder);

// Verify and complete Razorpay payment
router.post('/verify-payment', protect, authorize('STUDENT'), feeController.verifyAndCompletePayment);

// Get student's fee details and due amount
router.get('/student-fee-details', protect, authorize('STUDENT'), feeController.getStudentFeeDetails);

// ==========================================
// TEACHER ROUTES (Fee Management)
// ==========================================

// Get all students fee status (for teacher dashboard)
router.get('/all-students-fee-status', protect, authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN'), feeController.getAllStudentsFeeStatus);

// Get single student fee history
router.get('/student-fee-history/:studentId', protect, authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN'), feeController.getStudentFeeHistory);

// Add old/backdated fee payment
router.post('/add-old-fee', protect, authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN'), feeController.addOldFeePayment);

// Update student monthly fees and joining date
router.put('/update-student-fee-settings', protect, authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN'), feeController.updateStudentFeeSettings);

module.exports = router;
