const planService = require("../services/planService");
const rbacService = require("../services/rbacService");

async function getPlans(req, res) {

    const plans = await planService.getPlans();

    return res.json({
        success: true,
        count: plans.length,
        plans
    });

}

async function getPlanById(req, res) {

    const plan = await planService.getPlanById(req.params.id);

    if (!plan) {

        return res.status(404).json({
            success: false,
            message: "Plan not found"
        });

    }

    return res.json({
        success: true,
        plan
    });

}

async function assignPlan(req, res) {

    const { userId, planId } = req.body;

    if (!userId || !planId) {

        return res.status(400).json({
            success: false,
            message: "userId and planId are required"
        });

    }

    const allowed = await rbacService.canChangePlan(
        req.user.id,
        userId
    );

    if (!allowed) {

        return res.status(403).json({
            success: false,
            message: "Permission denied"
        });

    }

    const result = await planService.assignPlan(
        userId,
        planId
    );

    if (!result.success) {

        return res.status(404).json(result);

    }

    return res.json(result);

}

module.exports = {

    getPlans,

    getPlanById,

    assignPlan

};