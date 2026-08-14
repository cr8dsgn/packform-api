const userRepository = require("../repositories/userRepository");

async function getActiveAdmins() {

    return userRepository.findActiveAdmins();

}

async function getSuperAdmin() {

    const admins = await getActiveAdmins();

    if (!admins.length) {
        return null;
    }

    return admins[0];

}

async function isSuperAdmin(userId) {

    const superAdmin = await getSuperAdmin();

    if (!superAdmin) {
        return false;
    }

    return superAdmin.id === userId;

}

async function canManage(actorId, targetId) {

    if (!actorId || !targetId) {
        return false;
    }

    if (actorId === targetId) {
        return true;
    }

    const actor = await userRepository.findById(actorId);
    const target = await userRepository.findById(targetId);

    if (!actor || !target) {
        return false;
    }

    if (
        actor.role !== "Admin" ||
        actor.status !== "Active"
    ) {
        return false;
    }

    if (
        target.role === "Admin" &&
        target.status === "Active"
    ) {
        return isSuperAdmin(actorId);
    }

    return true;

}

async function canDelete(actorId, targetId) {

    if (!actorId || !targetId) {
        return false;
    }

    const actor = await userRepository.findById(actorId);
    const target = await userRepository.findById(targetId);

    if (!actor || !target) {
        return false;
    }

    if (
        actor.role !== "Admin" ||
        actor.status !== "Active"
    ) {
        return false;
    }

    if (actorId === targetId) {

        const admins = await getActiveAdmins();

        return admins.length > 1;
    }

    if (
        target.role === "Admin" &&
        target.status === "Active"
    ) {
        return isSuperAdmin(actorId);
    }

    return true;

}

module.exports = {
    getActiveAdmins,
    getSuperAdmin,
    isSuperAdmin,
    canManage,
    canDelete
};