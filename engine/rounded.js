function calculateRoundedBox(w, h, d, radius) {

    const r = Math.min(radius, w * 0.48, h * 0.48, d * 0.48);

    const segs = Math.max(8, Math.round(r * 80));

    return {

        radius: r,

        segments: segs,

        halfWidth: w / 2,

        halfHeight: h / 2,

        halfDepth: d / 2

    };

}

module.exports = {

    calculateRoundedBox

};