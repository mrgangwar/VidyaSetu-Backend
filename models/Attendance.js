const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coachingId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    date: {
        type: Date,
        required: true,
        set: (d) => {
            const newDate = new Date(d);
            newDate.setHours(0, 0, 0, 0);
            return newDate;
        }
    },
    status: {
        type: String,
        // ✅ 'Holiday' add kiya taaki percentage calculation mein ise exclude kar sakein
        enum: ['Present', 'Absent', 'Late', 'Leave', 'Holiday'],
        default: 'Present'
    },
    remark: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// ✅ Compound index: Student + Date + Coaching (Extra Safety)
attendanceSchema.index({ studentId: 1, date: 1, coachingId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
