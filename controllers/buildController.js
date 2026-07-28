const geometry = require("../engine/geometry");
const rounded = require("../engine/rounded");

async function build(req, res) {

    const {
        dimensionsMm,
        studio,
        export: exportOptions,
        action
    } = req.body;

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

    return res.json({
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

}

module.exports = {
    build
};