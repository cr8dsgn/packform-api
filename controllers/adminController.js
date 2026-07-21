const adminService = require("../services/adminService");

async function approveUser(req, res) {

    const { email } = req.body;

    const user = await adminService.approveUser(email);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,
        message: "User approved",
        status: user.status
    });

}

async function setLimits(req, res) {

    const {
        email,
        buildLimit,
        exportLimit
    } = req.body;

    const user = await adminService.setLimits(
        email,
        buildLimit,
        exportLimit
    );

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,
        message: "Limits updated",
        buildLimit: user.buildLimit,
        exportLimit: user.exportLimit
    });

}

module.exports = {
    approveUser,
    setLimits
};