const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const teacherController = require('../controllers/teacherController');
const multer = require('multer');
const path = require('path');

// --- 🛠️ Multer Configurations ---
// Profile Photo Storage - Use memory storage for Cloudinary upload
const uploadProfile = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Homework Files Storage
const homeworkStorage = multer.diskStorage({
    destination: 'uploads/homework/',
    filename: (req, file, cb) => {
        cb(null, `HW-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadHomework = multer({ storage: homeworkStorage });

// --- 🛡️ Global Middleware (Teacher & Admin Only) ---
router.use(protect);
router.use(authorize('TEACHER', 'SUPER_ADMIN'));

// --- 1. Student Management ---
router.post('/create-student', uploadProfile.single('profilePhoto'), teacherController.createStudent);
router.get('/my-students', teacherController.getMyStudents);
router.get('/student/:id', teacherController.getStudentDetails);
router.put('/update-student/:id', uploadProfile.single('profilePhoto'), teacherController.updateStudent);
router.delete('/delete-student/:id', teacherController.deleteStudent);

// --- 2. Attendance ---
router.post('/mark-attendance', teacherController.markAttendance);
router.get('/today-attendance', teacherController.getTodayAttendance);
router.get('/attendance-history', teacherController.getAttendanceByDate); 
router.delete('/delete-attendance', teacherController.deleteAttendanceByDate); // ✅ ADDED: Missing delete route
router.get('/student-attendance-stats/:studentId', teacherController.getStudentAttendanceStats); // ✅ ADDED: Missing stats route

// --- 3. Fees ---
router.post('/collect-fee', teacherController.collectFees);
router.get('/fee-stats', teacherController.getCoachingFeeStats);

// --- 4. Notice Board ---
router.post('/create-notice', teacherController.teacherCreateNotice);
router.get('/my-notices', teacherController.getMyNotices);
router.delete('/notice/:id', teacherController.deleteNotice);
router.get('/broadcasts', teacherController.getSuperAdminNotices);

// --- 5. Homework ---
router.post('/create-homework', uploadHomework.array('files', 5), teacherController.createHomework);
router.get('/my-homeworks', teacherController.getHomeworkHistory); // ✅ FIXED: Removed duplicate line
router.delete('/delete-homework/:id', teacherController.deleteHomework); 

// --- 6. Profile & Support ---
router.get('/profile', teacherController.getTeacherProfile);
router.get('/developer-contact', teacherController.getDeveloperContact);

/**
 * ✅ Profile Updates
 * Case 1: Teacher edits self
 * Case 2: Super Admin edits teacher by ID
 */
router.put('/update-profile', uploadProfile.single('profilePhoto'), teacherController.updateTeacherProfile);
router.put('/update-profile/:id', uploadProfile.single('profilePhoto'), teacherController.updateTeacherProfile);

module.exports = router;
