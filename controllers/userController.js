const userService = require("../services/userService");
const usageService = require("../services/usageService");

async function me(req, res) {

    const user = await userService.getUserById(
        req.user.id
    );

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,

        user: {
            id: user.id,
            name: user.name,
            email: user.email,

            role: user.role,
            status: user.status,

            usage: usageService.createUsage(user)
        }
    });

}

module.exports = {
    me
};