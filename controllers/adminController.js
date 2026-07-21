const adminService = require("../services/adminService");

async function getUsers(req, res) {

    const users = await adminService.getUsers();

    return res.json({
        success: true,
        count: users.length,
        users
    });

}

async function getUserById(req, res) {

    const user = await adminService.getUserById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,
        user
    });

}

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

async function blockUser(req, res) {

    const { email } = req.body;

    const user = await adminService.blockUser(email);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,
        message: "User blocked",
        status: user.status
    });

}

async function unblockUser(req, res) {

    const { email } = req.body;

    const user = await adminService.unblockUser(email);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,
        message: "User unblocked",
        status: user.status
    });

}

async function resetUsage(req, res) {

    const { email } = req.body;

    const user = await adminService.resetUsage(email);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,
        message: "Usage reset",
        buildsUsed: user.buildsUsed,
        exportsUsed: user.exportsUsed
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
    getUsers,
    getUserById,
    approveUser,
    blockUser,
    unblockUser,
    resetUsage,
    setLimits
};