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

module.exports = {
    approveUser,
    setLimits
};