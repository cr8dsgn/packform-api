const userService = require("./userService");

async function approveUser(email) {

    const user = await userService.getUserByEmail(email);

    if (!user) {
        return null;
    }

    user.status = "Active";

    await userService.save();

    return user;

}

async function blockUser(email) {

    const user = await userService.getUserByEmail(email);

    if (!user) {
        return null;
    }

    user.status = "Blocked";

    await userService.save();

    return user;

}

async function unblockUser(email) {

    const user = await userService.getUserByEmail(email);

    if (!user) {
        return null;
    }

    user.status = "Active";

    await userService.save();

    return user;

}

async function resetUsage(email) {

    const user = await userService.getUserByEmail(email);

    if (!user) {
        return null;
    }

    user.buildsUsed = 0;
    user.exportsUsed = 0;

    await userService.save();

    return user;

}

async function setLimits(email, buildLimit, exportLimit) {

    const user = await userService.getUserByEmail(email);

    if (!user) {
        return null;
    }

    user.buildLimit = buildLimit;
    user.exportLimit = exportLimit;

    await userService.save();

    return user;

}

async function getUsers() {

    const database = await userService.getDatabase();

    return database.data.users.map(user => ({

        id: user.id,
        name: user.name,
        email: user.email,

        role: user.role,
        status: user.status,

        buildLimit: user.buildLimit,
        exportLimit: user.exportLimit,

        buildsUsed: user.buildsUsed,
        exportsUsed: user.exportsUsed,

        createdAt: user.createdAt,
        lastLogin: user.lastLogin

    }));

}

async function getUserById(id) {

    const user = await userService.getUserById(id);

    if (!user) {
        return null;
    }

    return {

        id: user.id,
        name: user.name,
        email: user.email,

        role: user.role,
        status: user.status,

        buildLimit: user.buildLimit,
        exportLimit: user.exportLimit,

        buildsUsed: user.buildsUsed,
        exportsUsed: user.exportsUsed,

        createdAt: user.createdAt,
        lastLogin: user.lastLogin

    };

}

module.exports = {
    approveUser,
    blockUser,
    unblockUser,
    resetUsage,
    setLimits,
    getUsers,
    getUserById
};