const userService = require("../services/userService");
const usageService = require("../services/usageService");
const planService = require("../services/planService");

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

            createdAt: user.createdAt,
            lastLogin: user.lastLogin,

            plan: user.plan,

            usage: usageService.createUsage(user)
        }
    });
}

async function plans(req, res) {

    const plans = await planService.getPlans();

    return res.json({
        success: true,
        count: plans.length,
        plans
    });

}

module.exports = {
    me,
    plans
};