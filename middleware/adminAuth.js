const { verifyToken } = require("../utils/jwt");

function adminAuth(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Authorization token required"
        });
    }

    const token = authHeader.replace("Bearer ", "");

    try {

        const payload = verifyToken(token);

        if (payload.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }

        req.user = payload;

        next();

    } catch {

        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });

    }

}

module.exports = adminAuth;