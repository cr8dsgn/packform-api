const hierarchyService = require("./hierarchyService");

const ACTIONS = {
    VIEW_USER: "view_user",
    CHANGE_PLAN: "change_plan",
    CHANGE_BONUS: "change_bonus",
    CHANGE_ROLE: "change_role",
    DELETE_USER: "delete_user"
};

async function can(actorId, targetId, action) {

    if (!actorId || !targetId || !action) {
        return false;
    }

    if (!Object.values(ACTIONS).includes(action)) {
        return false;
    }

    if (action === ACTIONS.DELETE_USER) {
        return hierarchyService.canDelete(
            actorId,
            targetId
        );
    }

    return hierarchyService.canManage(
        actorId,
        targetId
    );

}

async function canViewUser(actorId, targetId) {

    if (!actorId || !targetId || actorId === targetId) {
        return false;
    }

    return can(
        actorId,
        targetId,
        ACTIONS.VIEW_USER
    );

}

async function canChangePlan(actorId, targetId) {

    if (!actorId || !targetId || actorId === targetId) {
        return false;
    }

    return can(
        actorId,
        targetId,
        ACTIONS.CHANGE_PLAN
    );

}

async function canChangeBonus(actorId, targetId) {

    if (!actorId || !targetId || actorId === targetId) {
        return false;
    }

    return can(
        actorId,
        targetId,
        ACTIONS.CHANGE_BONUS
    );

}

async function canChangeRole(actorId, targetId) {

    if (!actorId || !targetId) {
        return false;
    }

    if (actorId === targetId) {
        return false;
    }

    return can(
        actorId,
        targetId,
        ACTIONS.CHANGE_ROLE
    );

}

async function canDeleteUser(actorId, targetId) {

    return can(
        actorId,
        targetId,
        ACTIONS.DELETE_USER
    );

}

module.exports = {
    ACTIONS,
    can,
    canViewUser,
    canChangePlan,
    canChangeBonus,
    canChangeRole,
    canDeleteUser
};