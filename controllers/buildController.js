const geometry = require("../engine/geometry");
const rounded = require("../engine/rounded");

const buildService = require("../services/buildService");

async function build(req, res) {

    const limit = await buildService.checkBuildLimit(
        req.user.id
    );

    if (!limit.success) {
        return res.status(limit.status).json({
            success: false,
            message: limit.message,
            usage: limit.usage ?? null
        });
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

    const usage = await buildService.incrementBuild(
        req.user.id
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