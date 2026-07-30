require("dotenv").config();

const pool = require("./utils/postgres");

(async () => {

    const result = await pool.query(`
        SELECT
            email,
            role,
            status,
            created_at
        FROM users
        ORDER BY created_at;
    `);

    console.table(result.rows);

    process.exit(0);

})();