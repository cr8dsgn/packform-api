const express = require("express");

const router = express.Router();

router.post("/", (req, res) => {

    console.log("HEADERS:");
    console.log(req.headers);

    console.log("BODY:");
    console.log(req.body);

    res.json({
        success: true
    });

});

module.exports = router;