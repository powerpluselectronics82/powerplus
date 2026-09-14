const { rateLimit } = require("express-rate-limit");

// ==========================================
// 1. LOGIN / AUTH RATE LIMITER
//    IP BASED
// ==========================================

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes

    limit: 10, // 10 requests per IP

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});


// ==========================================
// 2. GENERAL API RATE LIMITER
//    USER ID BASED
// ==========================================

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes

    limit: 500, // 500 requests per user

    keyGenerator: (req) => {
        // authMiddleware should add req.user
        if (!req.user || !req.user._id) {
            return req.ip;
        }

        return `user:${req.user._id.toString()}`;
    },

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});


module.exports = {
    loginLimiter,
    apiLimiter
};