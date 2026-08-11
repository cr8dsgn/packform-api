const userRepository = require("../repositories/userRepository");

function withEffectiveLimits(user) {

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
        ...user,

        effectiveBuildLimit,
        effectiveExportLimit
    };

}

async function getUserById(id) {

    const user = await userRepository.findById(id);

    return withEffectiveLimits(user);

}

async function getUserByEmail(email) {

    const user = await userRepository.findByEmail(email);

    return withEffectiveLimits(user);

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

    return withEffectiveLimits(updated);

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

    return withEffectiveLimits(updated);

}

async function incrementBuildsUsed(id) {

    const updated = await userRepository.incrementBuildsUsed(id);

    return withEffectiveLimits(updated);

}

async function incrementExportsUsed(id) {

    const updated = await userRepository.incrementExportsUsed(id);

    return withEffectiveLimits(updated);

}

module.exports = {
    getUserById,
    getUserByEmail,
    approveUser,
    setLimits,
    incrementBuildsUsed,
    incrementExportsUsed
};
