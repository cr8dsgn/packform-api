const express = require("express");

const adminController = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.get(
    "/users",
    adminAuth,
    adminController.getUsers
);

router.get(
    "/users/:id",
    adminAuth,
    adminController.getUserById
);

router.post(
    "/approve",
    adminAuth,
    adminController.approveUser
);

router.post(
    "/block",
    adminAuth,
    adminController.blockUser
);

router.post(
    "/unblock",
    adminAuth,
    adminController.unblockUser
);

router.post(
    "/reset-usage",
    adminAuth,
    adminController.resetUsage
);

router.post(
    "/limits",
    adminAuth,
    adminController.setLimits
);

module.exports = router;