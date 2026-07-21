const exportService = require("../services/exportService");

async function exportModel(req, res) {

    const limit = await exportService.checkExportLimit(
        req.user.id
    );

    if (!limit.success) {
        return res.status(limit.status).json({
            success: false,
            message: limit.message,
            usage: limit.usage
        });
    }

    const usage = await exportService.incrementExport(
        req.user.id
    );

    return res.json({
        success: true,
        message: "Export completed",
        usage
    });

}

module.exports = {
    exportModel
};