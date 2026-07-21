const usageService = require("./usageService");

async function checkBuildLimit(userId) {

    return await usageService.checkLimit(
        userId,
        "build"
    );

}

async function incrementBuild(userId) {

    return await usageService.increment(
        userId,
        "build"
    );

}

module.exports = {
    checkBuildLimit,
    incrementBuild
};