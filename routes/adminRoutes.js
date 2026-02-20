const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const multer = require('multer'); // Error check karne ke liye zaroori hai

const { 
    createTeacher, 
    getAllTeachers, 
    getTeacherById, 
    updateTeacher, 
    deleteTeacher,
    updateAdminProfile,
    createBroadcast,
    getNotices,
    deleteNotice 
} = adminController;

// 🛡️ Multer Error Handling Wrapper
// Ye function check karega ki upload mein koi error toh nahi aaya
const uploadWrapper = (req, res, next) => {
    upload.single('profilePhoto')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading (e.g. file too large)
            console.error("❌ Multer Error:", err.message);
            return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading
            console.error("❌ Unknown Upload Error:", err.message);
            return res.status(400).json({ success: false, message: err.message });
        }
        // Everything went fine
        next();
    });
};

// --- Teacher Management (UPDATED WITH WRAPPER) ---
router.post('/create-teacher', protect, authorize('ADMIN', 'SUPER_ADMIN'), uploadWrapper, createTeacher);

router.get('/teachers', protect, authorize('ADMIN', 'SUPER_ADMIN'), getAllTeachers);
router.get('/teacher/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), getTeacherById);

router.put('/teacher/update/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), uploadWrapper, updateTeacher);

router.delete('/teacher/delete/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), deleteTeacher);

// --- Admin Personal Profile ---
router.put('/profile/update', protect, authorize('SUPER_ADMIN', 'ADMIN'), uploadWrapper, updateAdminProfile);

// --- Broadcast System ---
router.post('/broadcast', protect, authorize('SUPER_ADMIN'), createBroadcast);
router.get('/notices', protect, authorize('SUPER_ADMIN'), getNotices);
router.delete('/broadcast/:id', protect, authorize('SUPER_ADMIN'), deleteNotice);

module.exports = router;
