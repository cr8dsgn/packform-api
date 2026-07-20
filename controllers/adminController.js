const db = require("../utils/db");

async function approveUser(req, res) {

    const { email } = req.body;

    const database = await db;

    const user = database.data.users.find(
        user => user.email === email
    );

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    user.status = "Active";

    await database.write();

    return res.json({
        success: true,
        message: "User approved",
        status: user.status
    });

}

module.exports = {
    approveUser
};