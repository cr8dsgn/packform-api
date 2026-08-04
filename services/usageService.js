const userService = require("./userService");

function createUsage(user) {

    return {

        buildsUsed: user.buildsUsed,
        buildLimit: user.buildLimit,

        remainingBuilds:
            user.buildLimit === -1
                ? null
                : Math.max(
                    0,
                    user.buildLimit - user.buildsUsed
                ),

        exportsUsed: user.exportsUsed,
        exportLimit: user.exportLimit,

        remainingExports:
            user.exportLimit === -1
                ? null
                : Math.max(
                    0,
                    user.exportLimit - user.exportsUsed
                )

    };

}

async function checkLimit(userId, type) {

    const user = await userService.getUserById(userId);

    console.log("===== BUILD USER =====");
    console.log(user);
    console.log("======================");

    if (!user) {

        return {
            success: false,
            status: 404,
            message: "User not found"
        };

    }

    if (type === "build") {

        if (
            user.build_limit !== -1 &&
            user.builds_used >= user.build_limit
        ) {

            return {
                success: false,
                status: 403,
                message: "Build limit reached",
                usage: createUsage({

                    buildsUsed: user.builds_used,
                    buildLimit: user.build_limit,

                    exportsUsed: user.exports_used,
                    exportLimit: user.export_limit

                })
            };

        }

    }

    if (type === "export") {

        if (
            user.export_limit !== -1 &&
            user.exports_used >= user.export_limit
        ) {

            return {
                success: false,
                status: 403,
                message: "Export limit reached",
                usage: createUsage({

                    buildsUsed: user.builds_used,
                    buildLimit: user.build_limit,

                    exportsUsed: user.exports_used,
                    exportLimit: user.export_limit

                })
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

    return createUsage({

        buildsUsed: user.builds_used,
        buildLimit: user.build_limit,

        exportsUsed: user.exports_used,
        exportLimit: user.export_limit

    });

}

module.exports = {
    createUsage,
    checkLimit,
    increment
};