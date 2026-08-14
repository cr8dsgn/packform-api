const userRepository = require("../repositories/userRepository");
const userStateService = require("./userStateService");

function mapUser(user) {
    if (!user) {
        return null;
    }

    const plan = user.plan || null;

    const planBuildLimit = plan ? plan.buildLimit : 0;
    const planExportLimit = plan ? plan.exportLimit : 0;

    const effectiveBuildLimit =
        planBuildLimit === -1
            ? -1
            : planBuildLimit + (user.bonusBuilds || 0);

    const effectiveExportLimit =
        planExportLimit === -1
            ? -1
            : planExportLimit + (user.bonusExports || 0);

    return {
        id: user.id,
        name: user.name,
        email: user.email,

        role: user.role,
        status: user.status,

        plan: user.plan,

        bonusBuilds: user.bonusBuilds,
        bonusExports: user.bonusExports,

        buildsUsed: user.buildsUsed,
        exportsUsed: user.exportsUsed,

        effectiveBuildLimit,
        effectiveExportLimit,

        createdAt: user.createdAt,
        lastLogin: user.lastLogin

    };

}

async function getUsers() {

    const users = await userRepository.findAll();

    return users.map(mapUser);

}

async function getUserById(id) {

    const user = await userRepository.findById(id);

    return mapUser(user);

}

async function approveUser(email) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.updateStatus(
        user.id,
        "Active"
    );

    return mapUser(updated);

}

async function blockUser(email) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.updateStatus(
        user.id,
        "Blocked"
    );

    return mapUser(updated);

}

async function unblockUser(email) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.updateStatus(
        user.id,
        "Active"
    );

    return mapUser(updated);

}

async function resetUsage(email) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.resetUsage(
        user.id
    );

    return mapUser(updated);

}

async function setLimits(email, bonusBuilds, bonusExports) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.updateLimits(
        user.id,
        bonusBuilds,
        bonusExports
    );

    return mapUser(updated);

}

async function getUserByEmail(email) {

    const user = await userRepository.findByEmail(email);

    return mapUser(user);

}

async function changeRole(email, newRole) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return {
            success: false,
            message: "User not found"
        };
    }

    const state = userStateService.resolveStateForRoleChange(
        user,
        newRole
    );

    if (!state.success) {
        return {
            success: false,
            message: state.message
        };
    }

    const plan = await require("../repositories/planRepository").findByName(
        state.plan
    );

    if (!plan) {
        return {
            success: false,
            message: "Required plan not found"
        };
    }

    const updated = await userRepository.updateRoleAndPlan(
        user.id,
        state.role,
        plan.id
    );

    if (!updated) {
        return {
            success: false,
            message: "User not found"
        };
    }

    return {
        success: true,
        user: mapUser(updated)
    };

}

async function deleteUser(email) {

    const user = await userRepository.deleteByEmail(email);

    if (!user) {
        return null;
    }

    return mapUser(user);

}

module.exports = {
    approveUser,
    blockUser,
    unblockUser,
    deleteUser,
    resetUsage,
    setLimits,
    changeRole,
    getUserByEmail,
    getUsers,
    getUserById
};
