const express = require("express");

const adminController = require("../controllers/adminController");

const router = express.Router();

router.post("/approve", adminController.approveUser);

module.exports = router;