function normalizeDimensions(x, y, z) {

    const max = Math.max(x, y, z);

    return {

        x: x / max * 2.2,
        y: y / max * 2.2,
        z: z / max * 2.2

    };

}

module.exports = {

    normalizeDimensions

};