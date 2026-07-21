const userService = require("./userService");

function createUsage(user) {

    return {
        buildsUsed: user.buildsUsed,
        buildLimit: user.buildLimit,
        remainingBuilds:
            user.buildLimit === 0
                ? null
                : Math.max(
                    0,
                    user.buildLimit - user.buildsUsed
                ),

        exportsUsed: user.exportsUsed,
        exportLimit: user.exportLimit,
        remainingExports:
            user.exportLimit === 0
                ? null
                : Math.max(
                    0,
                    user.exportLimit - user.exportsUsed
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
            user.buildLimit > 0 &&
            user.buildsUsed >= user.buildLimit
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
            user.exportLimit > 0 &&
            user.exportsUsed >= user.exportLimit
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

    const user = await userService.getUserById(userId);

    if (!user) {
        return null;
    }

    if (type === "build") {
        user.buildsUsed++;
    }

    if (type === "export") {
        user.exportsUsed++;
    }

    await userService.save();

    return createUsage(user);

}

module.exports = {
    createUsage,
    checkLimit,
    increment
};