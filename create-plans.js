require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("./utils/postgres");

async function run() {

    const sql = fs.readFileSync(
        path.join(__dirname, "migrations", "001_create_plans.sql"),
        "utf8"
    );

    await pool.query(sql);

    console.log("✅ Plans table created successfully.");

    process.exit(0);

}

run().catch(error => {

    console.error(error);

    process.exit(1);

});