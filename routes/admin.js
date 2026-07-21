const express = require("express");

const adminController = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.post(
    "/approve",
    adminAuth,
    adminController.approveUser
);

router.post(
    "/limits",
    adminAuth,
    adminController.setLimits
);

module.exports = router;