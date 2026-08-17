const adminService = require("../services/adminService");
const rbacService = require("../services/rbacService");

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

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "email is required"
        });
    }

    const targetUser = await adminService.getUserByEmail(email);

    if (!targetUser) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const allowed = await rbacService.canManageStatus(
        req.user.id,
        targetUser.id
    );

    if (!allowed) {
        return res.status(403).json({
            success: false,
            message: "Permission denied"
        });
    }

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

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "email is required"
        });
    }

    const targetUser = await adminService.getUserByEmail(email);

    if (!targetUser) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const allowed = await rbacService.canManageStatus(
        req.user.id,
        targetUser.id
    );

    if (!allowed) {
        return res.status(403).json({
            success: false,
            message: "Permission denied"
        });
    }

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

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "email is required"
        });
    }

    const targetUser = await adminService.getUserByEmail(email);

    if (!targetUser) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const allowed = await rbacService.canManageStatus(
        req.user.id,
        targetUser.id
    );

    if (!allowed) {
        return res.status(403).json({
            success: false,
            message: "Permission denied"
        });
    }

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

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "email is required"
        });
    }

    const targetUser = await adminService.getUserByEmail(email);

    if (!targetUser) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const allowed = await rbacService.canManageStatus(
        req.user.id,
        targetUser.id
    );

    if (!allowed) {
        return res.status(403).json({
            success: false,
            message: "Permission denied"
        });
    }

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

    const targetUser = await adminService.getUserByEmail(email);

    if (!targetUser) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const allowed = await rbacService.canChangeBonus(
        req.user.id,
        targetUser.id
    );

    if (!allowed) {
        return res.status(403).json({
            success: false,
            message: "Permission denied"
        });
    }

    const result = await adminService.setLimits(
        email,
        buildLimit,
        exportLimit
    );

    if (result && result.validationError) {
        return res.status(400).json({
            success: false,
            message: result.message
        });
    }

    if (!result) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,
        message: "Limits updated",
        bonusBuilds: result.bonusBuilds,
        bonusExports: result.bonusExports
    });

}

async function changeRole(req, res) {

    const {
        email,
        role
    } = req.body;

    if (!email || !role) {
        return res.status(400).json({
            success: false,
            message: "email and role are required"
        });
    }

    const targetUser = await adminService.getUserByEmail(email);

    if (!targetUser) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const allowed = await rbacService.canChangeRole(
        req.user.id,
        targetUser.id
    );

    if (!allowed) {
        return res.status(403).json({
            success: false,
            message: "Permission denied"
        });
    }

    const user = await adminService.changeRole(
        email,
        role
    );

    if (!user.success) {
        return res.status(400).json(user);
    }

    return res.json({
        success: true,
        message: "Role updated",
        user: user.user
    });

}

async function deleteUser(req, res) {

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "email is required"
        });
    }

    const targetUser = await adminService.getUserByEmail(email);

    if (!targetUser) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const allowed = await rbacService.canDeleteUser(
        req.user.id,
        targetUser.id
    );

    if (!allowed) {
        return res.status(403).json({
            success: false,
            message: "Permission denied"
        });
    }

    const user = await adminService.deleteUser(email);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.json({
        success: true,
        message: "User deleted"
    });

}

module.exports = {
    getUsers,
    getUserById,
    approveUser,
    blockUser,
    unblockUser,
    deleteUser,
    resetUsage,
    setLimits,
    changeRole
};
