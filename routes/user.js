const express = require("express");

const auth = require("../middleware/auth");
const userController = require("../controllers/userController");

const router = express.Router();

router.get(
    "/me",
    auth,
    userController.me
);

router.get(
    "/plans",
    auth,
    userController.plans
);

router.post(
    "/change-plan",
    auth,
    userController.changePlan
);

router.post(
    "/change-password",
    auth,
    userController.changePassword
);

module.exports = router;