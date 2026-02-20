const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['NOTICE', 'UPDATE'], 
        default: 'NOTICE',
        required: [true, "Notice type is required"] 
    },
    target: { 
        type: String, 
        enum: ['TEACHER', 'STUDENT', 'ALL'], 
        default: 'STUDENT' 
    },
    title: { 
        type: String, 
        required: [true, "Title is required"],
        trim: true 
    },
    description: { 
        type: String, 
        required: [true, "Description is required"],
        trim: true 
    },
    // 🔍 FIX: coachingId is no longer required for Super Admin Broadcasts
    coachingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Coaching',
        required: false 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    version: { type: String, trim: true },
    downloadLink: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
}, { 
    timestamps: true 
});

noticeSchema.index({ coachingId: 1, target: 1 });

module.exports = mongoose.model('Notice', noticeSchema);
