const planRepository = require("../repositories/planRepository");
const userRepository = require("../repositories/userRepository");
const userStateService = require("./userStateService");

function mapPlan(plan) {

    if (!plan) {
        return null;
    }

    return {

        id: plan.id,

        name: plan.name,

        priceMonthly: Number(plan.price),

        buildLimit: plan.buildLimit,

        exportLimit: plan.exportLimit,

        isDefault: plan.isDefault,

        isActive: plan.isActive,

        displayOrder: plan.displayOrder,

        createdAt: plan.createdAt

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

    const user = await userRepository.findById(userId);

    if (!user) {

        return {
            success: false,
            message: "User not found"
        };

    }

    const state = userStateService.resolveStateForPlanChange(
        user,
        plan.name
    );

    if (!state.success) {

        return {
            success: false,
            message: state.message
        };

    }

    const updatedUser = await userRepository.updateRoleAndPlan(
        userId,
        state.role,
        plan.id
    );

    if (!updatedUser) {

        return {
            success: false,
            message: "User not found"
        };

    }

    return {

        success: true,

        userId,

        role: updatedUser.role,

        plan: mapPlan(plan)

    };

}

module.exports = {

    getPlans,

    getPlanById,

    getPlanByName,

    assignPlan

};
