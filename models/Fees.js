const mongoose = require('mongoose');

const FeesSchema = new mongoose.Schema({
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Student', 
        required: [true, "Student ID is required"] 
    },
    coachingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Coaching', 
        required: [true, "Coaching ID is required"] 
    },
    amountPaid: { 
        type: Number, 
        required: [true, "Amount paid is required"],
        min: [0, "Amount cannot be negative"]
    },
    balanceLeft: { 
        type: Number, 
        required: [true, "Balance calculation is required"],
        default: 0 
    },
    paymentDate: { 
        type: Date, 
        default: Date.now 
    },
    // Useful for showing "Fees for January", "Fees for February"
    monthPaidFor: { 
        type: String,
        trim: true 
    },
    // Receipt number automatically generate hoga agar aap nahi bhejenge
    receiptNo: { 
        type: String, 
        unique: true,
        required: true,
        default: () => `REC-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`
    },
    remarks: {
        type: String,
        trim: true,
        default: "Monthly Fees"
    }
}, { 
    timestamps: true // Isse 'createdAt' aur 'updatedAt' apne aap mil jayenge
});

// Indexing for faster reporting
FeesSchema.index({ coachingId: 1, paymentDate: -1 });
FeesSchema.index({ studentId: 1 });

module.exports = mongoose.model('Fees', FeesSchema);
