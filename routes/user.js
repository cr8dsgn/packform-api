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

module.exports = router;