const express = require("express");

const planController = require("../controllers/plansController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.get(
    "/",
    adminAuth,
    planController.getPlans
);

router.get(
    "/:id",
    adminAuth,
    planController.getPlanById
);

router.post(
    "/assign",
    adminAuth,
    planController.assignPlan
);

module.exports = router;