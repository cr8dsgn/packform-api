const pool = require("../utils/postgres");

function mapUser(user) {

    if (!user) {
        return null;
    }

    return {

        id: user.id,

        name: user.name,
        email: user.email,

        password: user.password,

        role: user.role,
        status: user.status,

        buildLimit: user.build_limit,
        exportLimit: user.export_limit,

        buildsUsed: user.builds_used,
        exportsUsed: user.exports_used,

        createdAt: user.created_at,
        lastLogin: user.last_login,

        planId: user.plan_id,
        bonusBuilds: user.bonus_builds,
        bonusExports: user.bonus_exports

    };

}

async function getUserById(id) {

    const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE id = $1
        `,
        [id]
    );

    return mapUser(result.rows[0]);

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

    return mapUser(result.rows[0]);

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

    return mapUser(result.rows[0]);

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

    return mapUser(result.rows[0]);

}

async function incrementBuildsUsed(id) {

    const result = await pool.query(
        `
        UPDATE users
        SET builds_used = builds_used + 1
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    return mapUser(result.rows[0]);

}

async function incrementExportsUsed(id) {

    const result = await pool.query(
        `
        UPDATE users
        SET exports_used = exports_used + 1
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    return mapUser(result.rows[0]);

}

module.exports = {
    getUserById,
    getUserByEmail,
    approveUser,
    setLimits,
    incrementBuildsUsed,
    incrementExportsUsed
};