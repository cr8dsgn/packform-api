require("dotenv").config();

const pool = require("./utils/postgres");

async function bootstrap() {

    await pool.query(`

        CREATE TABLE IF NOT EXISTS users (

            id UUID PRIMARY KEY,

            name TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            role TEXT NOT NULL,

            status TEXT NOT NULL,

            build_limit INTEGER NOT NULL DEFAULT -1,
            export_limit INTEGER NOT NULL DEFAULT -1,

            builds_used INTEGER NOT NULL DEFAULT 0,
            exports_used INTEGER NOT NULL DEFAULT 0,

            created_at TIMESTAMP NOT NULL,
            last_login TIMESTAMP

        );

    `);

    console.log("✅ PostgreSQL initialized");

    process.exit(0);

}

bootstrap().catch(error => {

    console.error(error);

    process.exit(1);

});