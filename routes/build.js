const express = require("express");

const router = express.Router();

router.post("/", (req, res) => {

    console.log("PACKFORM REQUEST:");
    console.log(JSON.stringify(req.body, null, 2));

    res.json({
        success: true
    });

});

module.exports = router;