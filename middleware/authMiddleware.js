// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');

/**
 * Protect routes and attach user info from JWT + DB
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let user;
            if (decoded.role === 'STUDENT') {
                user = await Student.findById(decoded.id).select('-password').lean();
            } else {
                user = await User.findById(decoded.id).select('-password').lean();
            }

            if (!user) {
                return res.status(401).json({ success: false, message: "User not found in database" });
            }

            // ✅ Merge JWT info into DB object to avoid missing role/ID
            req.user = {
                ...user,
                id: decoded.id,
                role: decoded.role,
                coachingId: decoded.coachingId
            };

            next();

        } catch (error) {
            console.error("❌ Auth Middleware Error:", error.message);
            return res.status(401).json({ success: false, message: "Token expired or invalid" });
        }
    } else {
        return res.status(401).json({ success: false, message: "No token, authorization denied" });
    }
};

/**
 * Authorize only specific roles
 * Usage: authorize('ADMIN', 'TEACHER')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                message: `Access Denied: Your role (${req.user?.role || 'Unknown'}) cannot access this.` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
