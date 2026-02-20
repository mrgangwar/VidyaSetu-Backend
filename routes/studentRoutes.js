const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const teacherController = require('../controllers/teacherController');
// Sabhi functions ko yahan add karein
const { 
    getStudentHomework, 
    getStudentDashboard, 
    getAttendanceHistory, 
    getFeeHistory,
    getMyTeachers,
    getAllStudentNotices
    
} = require('../controllers/studentController');

// Routes definitions
router.get('/my-homework', protect, getStudentHomework);
router.get('/dashboard', protect, getStudentDashboard);
router.get('/attendance-history', protect, getAttendanceHistory);
router.get('/fee-history', protect, getFeeHistory);
router.get('/my-teachers', protect, getMyTeachers);
router.get('/all-notices', protect, getAllStudentNotices);
router.get('/developer-contact', protect, teacherController.getDeveloperContact);
module.exports = router;
