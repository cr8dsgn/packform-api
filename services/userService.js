const pool = require("../utils/postgres");

async function getUserById(id) {
    const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function getUserByEmail(email) {
    const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE email = $1
        `,
        [email]
    );

    return result.rows[0] || null;
}

async function approveUser(email) {
    const result = await pool.query(
        `
        UPDATE users
        SET status = 'Active'
        WHERE email = $1
        RETURNING *
        `,
        [email]
    );

    return result.rows[0] || null;
}

async function setLimits(email, buildLimit, exportLimit) {
    const result = await pool.query(
        `
        UPDATE users
        SET
            build_limit = $2,
            export_limit = $3
        WHERE email = $1
        RETURNING *
        `,
        [email, buildLimit, exportLimit]
    );

    return result.rows[0] || null;
}

module.exports = {
    getUserById,
    getUserByEmail,
    approveUser,
    setLimits
};