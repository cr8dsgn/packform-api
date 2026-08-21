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

async function changePlan(req, res) {

    /*
     * TEMPORARY BILLING PROTECTION
     *
     * Self-service plan changes are disabled until
     * a real payment/subscription flow is connected.
     *
     * Admin plan assignment remains available through
     * /api/plans/assign and its RBAC protection.
     */

    if (req.user.role !== "Admin") {

        return res.status(403).json({
            success: false,
            message:
                "Plan changes require an active subscription."
        });

    }

    const { planId } = req.body;

    if (!planId) {

        return res.status(400).json({
            success: false,
            message: "planId is required"
        });

    }

    const result = await planService.assignPlan(
        req.user.id,
        planId
    );

    if (!result.success) {

        const status =
            result.message === "User not found"
                ? 404
                : result.message === "Plan not found"
                    ? 404
                    : 400;

        return res.status(status).json(result);

    }

    return res.json({
        success: true,
        message: "Plan updated successfully",
        userId: result.userId,
        role: result.role,
        plan: result.plan
    });

}

async function changePassword(req, res) {

    const {
        currentPassword,
        newPassword
    } = req.body;

    if (!currentPassword || !newPassword) {

        return res.status(400).json({
            success: false,
            message: "Current password and new password are required"
        });

    }

    if (newPassword.length < 8) {

        return res.status(400).json({
            success: false,
            message: "New password must be at least 8 characters"
        });

    }

    if (currentPassword === newPassword) {

        return res.status(400).json({
            success: false,
            message: "New password must be different from current password"
        });

    }

    const result =
        await userService.changePassword(
            req.user.id,
            currentPassword,
            newPassword
        );

    if (!result.success) {

        const status =
            result.message === "User not found"
                ? 404
                : 401;

        return res.status(status).json(result);

    }

    return res.json(result);

}

module.exports = {
    me,
    plans,
    changePassword,
    changePlan
};