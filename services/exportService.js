const usageService = require("./usageService");

async function checkExportLimit(userId) {

    return await usageService.checkLimit(
        userId,
        "export"
    );

}

async function incrementExport(userId) {

    return await usageService.increment(
        userId,
        "export"
    );

}

module.exports = {
    checkExportLimit,
    incrementExport
};