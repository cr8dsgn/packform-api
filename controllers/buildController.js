const geometry = require("../engine/geometry");
const rounded = require("../engine/rounded");

const usageService = require("../services/usageService");

async function build(req, res) {

    const limit = await usageService.checkLimit(
        req.user.id,
        "build"
    );

    if (!limit.success) {

        return res.status(limit.status).json(limit);

    }

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

    const usage = await usageService.increment(
        req.user.id,
        "build"
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

        rounded: roundedData,

        usage

    });

}

module.exports = {
    build
};