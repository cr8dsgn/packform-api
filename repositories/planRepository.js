const pool = require("../utils/postgres");

async function findAll() {

    const result = await pool.query(
        `
        SELECT *
        FROM plans
        WHERE is_active = TRUE
        ORDER BY display_order ASC
        `
    );

    return result.rows;

}

async function findById(id) {

    const result = await pool.query(
        `
        SELECT *
        FROM plans
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;

}

async function findByName(name) {

    const result = await pool.query(
        `
        SELECT *
        FROM plans
        WHERE name = $1
        `,
        [name]
    );

    return result.rows[0] || null;

}

async function getDefaultPlan() {

    const result = await pool.query(
        `
        SELECT *
        FROM plans
        WHERE is_default = TRUE
        LIMIT 1
        `
    );

    return result.rows[0] || null;

}

async function findByUserId(userId) {

    const result = await pool.query(
        `
        SELECT
            p.*
        FROM users u
        JOIN plans p
            ON p.id = u.plan_id
        WHERE u.id = $1
        `,
        [userId]
    );

    return result.rows[0] || null;

}

module.exports = {

    findAll,

    findById,

    findByName,

    findByUserId,

    getDefaultPlan

};