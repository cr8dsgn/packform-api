const pool = require("../utils/postgres");

function mapPlan(plan) {
    if (!plan) return null;

    return {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        buildLimit: plan.build_limit,
        exportLimit: plan.export_limit,
        devicesLimit: plan.devices_limit,
        displayOrder: plan.display_order,
        isDefault: plan.is_default,
        isActive: plan.is_active
    };
}

async function findAll() {

    const result = await pool.query(
        `
        SELECT *
        FROM plans
        WHERE is_active = TRUE
        ORDER BY display_order ASC
        `
    );

    return result.rows.map(mapPlan);

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

    return mapPlan(result.rows[0]);

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

    return mapPlan(result.rows[0]);

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

    return mapPlan(result.rows[0]);

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

    return mapPlan(result.rows[0]);

}

module.exports = {

    findAll,

    findById,

    findByName,

    findByUserId,

    getDefaultPlan

};
