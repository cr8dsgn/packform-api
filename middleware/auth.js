const { verifyToken } = require("../utils/jwt");

function auth(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Authorization token required"
        });
    }

    const token = authHeader.replace("Bearer ", "");

    try {

        req.user = verifyToken(token);

        next();

    } catch {

        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });

    }

}

module.exports = auth;