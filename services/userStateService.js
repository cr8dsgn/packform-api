const VALID_ROLES = [
    "Admin",
    "Tester",
    "User"
];

const VALID_PLANS = [
    "Tester",
    "Starter",
    "Pro",
    "Enterprise"
];

const VALID_STATES = {
    Tester: new Set([
        "Tester"
    ]),

    User: new Set([
        "Starter",
        "Pro",
        "Enterprise"
    ]),

    Admin: new Set([
        "Enterprise"
    ])
};

function normalizeRole(role) {
    return typeof role === "string"
        ? role.trim()
        : "";
}

function normalizePlanName(planName) {
    return typeof planName === "string"
        ? planName.trim()
        : "";
}

function isValidRole(role) {
    return VALID_ROLES.includes(
        normalizeRole(role)
    );
}

function isValidPlan(planName) {
    return VALID_PLANS.includes(
        normalizePlanName(planName)
    );
}

function isValidState(role, planName) {

    const normalizedRole = normalizeRole(role);
    const normalizedPlan = normalizePlanName(planName);

    if (!isValidRole(normalizedRole)) {
        return false;
    }

    if (!isValidPlan(normalizedPlan)) {
        return false;
    }

    const allowedPlans = VALID_STATES[normalizedRole];

    return allowedPlans.has(normalizedPlan);
}

function getState(role, planName) {

    const normalizedRole = normalizeRole(role);
    const normalizedPlan = normalizePlanName(planName);

    return {
        role: normalizedRole,
        plan: normalizedPlan,
        valid: isValidState(
            normalizedRole,
            normalizedPlan
        )
    };
}

function resolvePlanForRole(role, currentPlan) {

    const normalizedRole = normalizeRole(role);
    const normalizedCurrentPlan = normalizePlanName(currentPlan);

    if (!isValidRole(normalizedRole)) {
        return {
            success: false,
            message: "Invalid role"
        };
    }

    if (normalizedRole === "Admin") {
        return {
            success: true,
            role: "Admin",
            plan: "Enterprise"
        };
    }

    if (normalizedRole === "Tester") {
        return {
            success: true,
            role: "Tester",
            plan: "Tester"
        };
    }

    if (normalizedRole === "User") {

        if (
            normalizedCurrentPlan === "Starter" ||
            normalizedCurrentPlan === "Pro" ||
            normalizedCurrentPlan === "Enterprise"
        ) {
            return {
                success: true,
                role: "User",
                plan: normalizedCurrentPlan
            };
        }

        return {
            success: true,
            role: "User",
            plan: "Starter"
        };
    }

    return {
        success: false,
        message: "Unable to resolve role and plan"
    };
}

function resolveRoleForPlan(planName, currentRole) {

    const normalizedPlan = normalizePlanName(planName);
    const normalizedCurrentRole = normalizeRole(currentRole);

    if (!isValidPlan(normalizedPlan)) {
        return {
            success: false,
            message: "Invalid plan"
        };
    }

    if (normalizedPlan === "Tester") {

        if (normalizedCurrentRole === "Tester") {
            return {
                success: true,
                role: "Tester",
                plan: "Tester"
            };
        }

        return {
            success: false,
            message: "Cannot change to Tester plan from current role"
        };
    }

    if (normalizedPlan === "Starter") {
        return {
            success: true,
            role: "User",
            plan: "Starter"
        };
    }

    if (normalizedPlan === "Pro") {
        return {
            success: true,
            role: "User",
            plan: "Pro"
        };
    }

    if (normalizedPlan === "Enterprise") {

        if (normalizedCurrentRole === "Admin") {
            return {
                success: true,
                role: "Admin",
                plan: "Enterprise"
            };
        }

        return {
            success: true,
            role: "User",
            plan: "Enterprise"
        };
    }

    return {
        success: false,
        message: "Unable to resolve role and plan"
    };
}

function resolveStateForRoleChange(currentUser, newRole) {

    if (!currentUser) {
        return {
            success: false,
            message: "User not found"
        };
    }

    const currentPlan = currentUser.plan
        ? currentUser.plan.name
        : null;

    return resolvePlanForRole(
        newRole,
        currentPlan
    );
}

function resolveStateForPlanChange(currentUser, newPlan) {

    if (!currentUser) {
        return {
            success: false,
            message: "User not found"
        };
    }

    return resolveRoleForPlan(
        newPlan,
        currentUser.role
    );
}

module.exports = {
    VALID_ROLES,
    VALID_PLANS,
    isValidRole,
    isValidPlan,
    isValidState,
    getState,
    resolvePlanForRole,
    resolveRoleForPlan,
    resolveStateForRoleChange,
    resolveStateForPlanChange
};