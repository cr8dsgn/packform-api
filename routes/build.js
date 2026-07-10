const express = require("express");
const geometry = require("../engine/geometry");

const router = express.Router();

router.post("/", (req, res) => {

    console.log("HEADERS:");
    console.log(req.headers);

    console.log("BODY:");
    console.log(req.body);

    const { dimensionsMm } = req.body;

console.log("Dimensions:");
console.log(dimensionsMm);

const normalized = geometry.normalizeDimensions(
    dimensionsMm.x,
    dimensionsMm.y,
    dimensionsMm.z
);

console.log("Normalized:");
console.log(normalized);

    res.json({
    success: true,
    normalized
});

});

module.exports = router;