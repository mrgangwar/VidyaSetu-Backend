const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coachingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coaching', required: true },
    title: { type: String, required: true },
    description: { type: String }, // Text format ke liye
    attachments: [{ 
        fileUrl: String, 
        fileType: { type: String, enum: ['image', 'pdf'] } 
    }], // Images aur PDF store karne ke liye array
    batchTime: { type: String, required: true }, // Kis batch ke liye hai
    dueDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Homework', homeworkSchema);
