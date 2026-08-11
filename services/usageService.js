const userService = require("./userService");

function createUsage(user) {

    return {

        buildsUsed: user.buildsUsed,
        buildLimit: user.effectiveBuildLimit,

        remainingBuilds:
            user.effectiveBuildLimit === -1
                ? null
                : Math.max(
                    0,
                    user.effectiveBuildLimit - user.buildsUsed
                ),

        exportsUsed: user.exportsUsed,
        exportLimit: user.effectiveExportLimit,

        remainingExports:
            user.effectiveExportLimit === -1
                ? null
                : Math.max(
                    0,
                    user.effectiveExportLimit - user.exportsUsed
                )

    };

}

async function checkLimit(userId, type) {

    const user = await userService.getUserById(userId);

    if (!user) {

        return {
            success: false,
            status: 404,
            message: "User not found"
        };

    }

    if (type === "build") {

        if (
            user.effectiveBuildLimit !== -1 &&
            user.buildsUsed >= user.effectiveBuildLimit
        ) {

            return {
                success: false,
                status: 403,
                message: "Build limit reached",
                usage: createUsage(user)
            };

        }

    }

    if (type === "export") {

        if (
            user.effectiveExportLimit !== -1 &&
            user.exportsUsed >= user.effectiveExportLimit
        ) {

            return {
                success: false,
                status: 403,
                message: "Export limit reached",
                usage: createUsage(user)
            };

        }

    }

    return {
        success: true,
        user
    };

}

async function increment(userId, type) {

    let user = null;

    if (type === "build") {

        user = await userService.incrementBuildsUsed(userId);

    }
    else if (type === "export") {

        user = await userService.incrementExportsUsed(userId);

    }

    if (!user) {
        return null;
    }

    return createUsage(user);

}

module.exports = {
    createUsage,
    checkLimit,
    increment
};
