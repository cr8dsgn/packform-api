require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("./utils/postgres");

async function run() {

    const file = process.argv[2];

    if (!file) {
        console.log("Usage:");
        console.log("node apply-migration.js 002_users_plan_bonus.sql");
        process.exit(1);
    }

    const sql = fs.readFileSync(
        path.join(__dirname, "migrations", file),
        "utf8"
    );

    await pool.query(sql);

    console.log(`✅ ${file} applied successfully.`);

    process.exit(0);

}

run().catch(error => {

    console.error(error);

    process.exit(1);

});