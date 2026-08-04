const planRepository = require("../repositories/planRepository");
const userRepository = require("../repositories/userRepository");

function mapPlan(plan) {

    if (!plan) {
        return null;
    }

    return {

        id: plan.id,

        name: plan.name,

        priceMonthly: Number(plan.price),

        buildLimit: plan.build_limit,

        exportLimit: plan.export_limit,

        isDefault: plan.is_default,

        isActive: plan.is_active,

        displayOrder: plan.display_order,

        createdAt: plan.created_at

    };

}

async function getPlans() {

    const plans = await planRepository.findAll();

    return plans.map(mapPlan);

}

async function getPlanById(id) {

    const plan = await planRepository.findById(id);

    return mapPlan(plan);

}

async function getPlanByName(name) {

    const plan = await planRepository.findByName(name);

    return mapPlan(plan);

}

async function assignPlan(userId, planId) {

    const plan = await planRepository.findById(planId);

    if (!plan) {

        return {
            success: false,
            message: "Plan not found"
        };

    }

    const user = await userRepository.updatePlan(
        userId,
        planId
    );

    if (!user) {

        return {
            success: false,
            message: "User not found"
        };

    }

    await userRepository.updateLimits(
        userId,
        plan.build_limit,
        plan.export_limit
    );

    return {

        success: true,

        userId,

        plan: mapPlan(plan)

    };

}

module.exports = {

    getPlans,

    getPlanById,

    getPlanByName,

    assignPlan

};