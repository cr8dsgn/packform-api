const { verifyToken } = require("../utils/jwt");
const userService = require("../services/userService");

async function auth(req, res, next) {

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

        const user = await userService.getUserById(
            payload.id
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.status !== "Active") {
            return res.status(403).json({
                success: false,
                message: "User is blocked",
                status: user.status
            });
        }

        req.user = user;

        next();

    } catch {

        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });

    }

}

module.exports = auth;