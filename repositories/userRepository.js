const pool = require("../utils/postgres");

async function countUsers() {
    const result = await pool.query(`
        SELECT COUNT(*) AS count
        FROM users
    `);

    return Number(result.rows[0].count);
}

async function findByEmail(email) {
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

async function create(user) {
    const result = await pool.query(
        `
        INSERT INTO users (
            id,
            name,
            email,
            password,
            role,
            status,
            build_limit,
            export_limit,
            builds_used,
            exports_used,
            created_at,
            last_login
        )
        VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )
        RETURNING *
        `,
        [
            user.id,
            user.name,
            user.email,
            user.passwordHash,
            user.role,
            user.status,
            user.buildLimit,
            user.exportLimit,
            user.buildsUsed,
            user.exportsUsed,
            user.createdAt,
            user.lastLogin
        ]
    );

    return result.rows[0];
}

async function updateLastLogin(id) {
    await pool.query(
        `
        UPDATE users
        SET last_login = NOW()
        WHERE id = $1
        `,
        [id]
    );
}

module.exports = {
    countUsers,
    findByEmail,
    create,
    updateLastLogin
};