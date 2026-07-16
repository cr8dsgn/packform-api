const express = require("express");
const geometry = require("../engine/geometry");
const rounded = require("../engine/rounded");

const router = express.Router();

router.post("/", (req, res) => {

    console.log("HEADERS:");
    console.log(req.headers);

    console.log("BODY:");
    console.log(req.body);

    const {
    dimensionsMm,
    studio,
    export: exportOptions,
    faces,
    action
} = req.body;

console.log("Dimensions:");
console.log(dimensionsMm);

const normalized = geometry.normalizeDimensions(
    dimensionsMm.x,
    dimensionsMm.y,
    dimensionsMm.z
);

const roundedData = rounded.calculateRoundedBox(
    normalized.x,
    normalized.y,
    normalized.z,
    studio.bevel
);

const geometryData = geometry.buildGeometryData(
    normalized,
    roundedData
);

console.log("Rounded:");
console.log(roundedData);

console.log("Normalized:");
console.log(normalized);

res.json({
    success: true,

    request: {
        action,
        dimensionsMm,
        studio,
        export: exportOptions
    },

    geometry: geometryData,
    normalized,
    rounded: roundedData
});

});

module.exports = router;