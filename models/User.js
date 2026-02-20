const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Name is required"],
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, "Email is required"], 
        unique: true, // ⚠️ Ensure no two users have the same email
        lowercase: true, 
        trim: true,
        index: true // Searching fast karne ke liye
    },
    password: { 
        type: String, 
        required: [true, "Password is required"] 
    },
    role: { 
        type: String, 
        enum: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT'], 
        default: 'STUDENT' 
    },
    coachingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Coaching',
        default: null 
    },
    address: { type: String, trim: true, default: '' },
    qualifications: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: '' },
    contactNumber: { 
        type: String, 
        trim: true,
        default: ''
    },
    whatsappNumber: { 
        type: String, 
        trim: true,
        default: ''
    }, 
    profilePhoto: { 
        type: String, 
        default: '' 
    }, 
    pushToken: { 
        type: String, 
        default: '' 
    },
}, { 
    timestamps: true 
});

// 🛠️ Mongoose Error Handling Middleware
// Agar duplicate email aata hai, toh ye crash hone se bachayega
userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Email already exists. Please use a different email.'));
    } else {
        next(error);
    }
});

module.exports = mongoose.model('User', userSchema);
