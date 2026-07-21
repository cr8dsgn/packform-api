const db = require("../utils/db");

async function getDatabase() {
    return await db;
}

async function getUserById(id) {

    const database = await getDatabase();

    return database.data.users.find(
        user => user.id === id
    );

}

async function getUserByEmail(email) {

    const database = await getDatabase();

    return database.data.users.find(
        user => user.email === email
    );

}

async function save() {

    const database = await getDatabase();

    await database.write();

}

async function approveUser(email) {

    const user = await getUserByEmail(email);

    if (!user) {
        return null;
    }

    user.status = "Active";

    await save();

    return user;

}

async function setLimits(email, buildLimit, exportLimit) {

    const user = await getUserByEmail(email);

    if (!user) {
        return null;
    }

    user.buildLimit = buildLimit;
    user.exportLimit = exportLimit;

    await save();

    return user;

}

module.exports = {
    getDatabase,
    getUserById,
    getUserByEmail,
    save,
    approveUser,
    setLimits
};