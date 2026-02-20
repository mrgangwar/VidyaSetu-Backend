const mongoose = require('mongoose');

const coachingSchema = new mongoose.Schema({
    coachingName: { type: String, required: true },
    address: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coaching', coachingSchema);
