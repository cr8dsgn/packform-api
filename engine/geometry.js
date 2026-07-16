function normalizeDimensions(x, y, z) {

    const max = Math.max(x, y, z);

    return {

        x: x / max * 2.2,
        y: y / max * 2.2,
        z: z / max * 2.2

    };

}

function calculateHalfSizes(size) {

    return {

        halfWidth: size.x / 2,
        halfHeight: size.y / 2,
        halfDepth: size.z / 2

    };

}

function calculateBounds(size) {

    return {

        min: {

            x: -size.x / 2,
            y: -size.y / 2,
            z: -size.z / 2

        },

        max: {

            x: size.x / 2,
            y: size.y / 2,
            z: size.z / 2

        }

    };

}

function buildGeometryData(normalized) {

    return {

    size: normalized,

    half: calculateHalfSizes(normalized),

    bounds: calculateBounds(normalized)

    };

}

module.exports = {

    normalizeDimensions,
    calculateHalfSizes,
    calculateBounds,
    buildGeometryData

};