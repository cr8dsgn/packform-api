const { JSONFilePreset } = require("lowdb/node");

const db = JSONFilePreset("database/database.json", {
    users: []
});

module.exports = db;