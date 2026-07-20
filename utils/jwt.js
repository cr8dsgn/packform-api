const jwt = require("jsonwebtoken");

const JWT_SECRET =
    process.env.JWT_SECRET || "packform_jwt_secret";

function generateToken(user) {

    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

}

function verifyToken(token) {

    return jwt.verify(token, JWT_SECRET);

}

module.exports = {
    generateToken,
    verifyToken
};