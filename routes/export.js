const express = require("express");

const auth = require("../middleware/auth");
const exportController = require("../controllers/exportController");

const router = express.Router();

router.post(
    "/",
    auth,
    exportController.exportModel
);

module.exports = router;