const jwt = require("jsonwebtoken");

// Verifies JWT from cookie `token` or `Authorization: Bearer <token>` header
// Attaches decoded payload to `req.user` as { userId, companyId, branchId, role }
module.exports = function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    let token = null;

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: payload.userId,
      companyId: payload.companyId,
      branchId: payload.branchId,
      role: payload.role,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
