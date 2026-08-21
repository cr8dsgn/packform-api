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

function mapUser(row) {
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        buildsUsed: row.builds_used,
        exportsUsed: row.exports_used,
        bonusBuilds: row.bonus_builds,
        bonusExports: row.bonus_exports,
        createdAt: row.created_at,
        lastLogin: row.last_login,
        plan: mapPlan(row.plan)
    };
}

async function countUsers() {
    const result = await pool.query(`
        SELECT COUNT(*) AS count
        FROM users
    `);

    return Number(result.rows[0].count);
}

async function findAll() {
    const result = await pool.query(`
        SELECT
            users.*,
            row_to_json(plans) AS plan
        FROM users
        LEFT JOIN plans ON plans.id = users.plan_id
        ORDER BY users.created_at DESC
    `);

    return result.rows.map(mapUser);
}

async function findActiveAdmins() {

    const result = await pool.query(`
        SELECT
            users.*,
            row_to_json(plans) AS plan
        FROM users
        LEFT JOIN plans ON plans.id = users.plan_id
        WHERE users.role = 'Admin'
          AND users.status = 'Active'
        ORDER BY users.created_at ASC
    `);

    return result.rows.map(mapUser);

}

async function findById(id) {
    const result = await pool.query(
        `
        SELECT
            users.*,
            row_to_json(plans) AS plan
        FROM users
        LEFT JOIN plans ON plans.id = users.plan_id
        WHERE users.id = $1
        `,
        [id]
    );

    return mapUser(result.rows[0]);
}

async function findByEmail(email) {
    const result = await pool.query(
        `
        SELECT
            users.*,
            row_to_json(plans) AS plan
        FROM users
        LEFT JOIN plans ON plans.id = users.plan_id
        WHERE users.email = $1
        `,
        [email]
    );

    return mapUser(result.rows[0]);
}

// Authentication-only lookup. Intentionally bypasses mapUser() so that it can
// return the password hash. This result must NEVER be returned from profile,
// admin, or any other general-purpose user endpoint — authController.login()
// is the only consumer.
async function findAuthByEmail(email) {
    const result = await pool.query(
        `
        SELECT
            id,
            email,
            password,
            role,
            status
        FROM users
        WHERE email = $1
        `,
        [email]
    );

    return result.rows[0] || null;
}

async function findAuthById(id) {

    const result = await pool.query(
        `
        SELECT
            id,
            email,
            password,
            role,
            status
        FROM users
        WHERE id = $1
        `,
        [id]
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
            plan_id,
            bonus_builds,
            bonus_exports,
            builds_used,
            exports_used,
            created_at,
            last_login
        )
        VALUES (
            $1,$2,$3,$4,$5,$6,
            COALESCE($7, (SELECT id FROM plans WHERE is_default = true LIMIT 1)),
            $8,$9,$10,$11,$12,$13
        )
        RETURNING id
        `,
        [
            user.id,
            user.name,
            user.email,
            user.passwordHash,
            user.role,
            user.status,
            user.planId,
            user.bonusBuilds,
            user.bonusExports,
            user.buildsUsed,
            user.exportsUsed,
            user.createdAt,
            user.lastLogin
        ]
    );

    const insertedId = result.rows[0] && result.rows[0].id;

    if (!insertedId) {
        return null;
    }

    return findById(insertedId);
}

async function deleteById(id) {
    await pool.query(
        `
        DELETE FROM users
        WHERE id = $1
        `,
        [id]
    );
}

async function updateStatus(id, status) {
    const result = await pool.query(
        `
        UPDATE users
        SET status = $1
        WHERE id = $2
        RETURNING id
        `,
        [status, id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);
}

async function updateRole(id, role) {
    const result = await pool.query(
        `
        UPDATE users
        SET role = $1
        WHERE id = $2
        RETURNING id
        `,
        [role, id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);
}

async function updateRoleAndPlan(id, role, planId) {
    const result = await pool.query(
        `
        UPDATE users
        SET
            role = $1,
            plan_id = $2,
            builds_used = 0,
            exports_used = 0
        WHERE id = $3
        RETURNING id
        `,
        [role, planId, id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);
}

async function updateLimits(id, bonusBuilds, bonusExports) {

    const result = await pool.query(
        `
        UPDATE users
        SET
            bonus_builds = $1,
            bonus_exports = $2
        WHERE id = $3
        RETURNING id
        `,
        [bonusBuilds, bonusExports, id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);

}

async function resetUsage(id) {
    const result = await pool.query(
        `
        UPDATE users
        SET
            builds_used = 0,
            exports_used = 0
        WHERE id = $1
        RETURNING id
        `,
        [id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);
}

async function incrementBuildsUsed(id) {

    const result = await pool.query(
        `
        UPDATE users
        SET
            builds_used = builds_used + 1
        WHERE id = $1
        RETURNING id
        `,
        [id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);

}

async function incrementExportsUsed(id) {

    const result = await pool.query(
        `
        UPDATE users
        SET
            exports_used = exports_used + 1
        WHERE id = $1
        RETURNING id
        `,
        [id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);

}

async function updatePassword(id, passwordHash) {

    const result = await pool.query(
        `
        UPDATE users
        SET password = $1
        WHERE id = $2
        RETURNING id
        `,
        [passwordHash, id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);

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

async function updatePlan(id, planId) {

    const result = await pool.query(
        `
        UPDATE users
        SET
            plan_id = $1,
            builds_used = 0,
            exports_used = 0
        WHERE id = $2
        RETURNING id
        `,
        [planId, id]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(result.rows[0].id);

}

async function deleteByEmail(email) {

    const existing = await pool.query(
        `
        SELECT
            users.*,
            row_to_json(plans) AS plan
        FROM users
        LEFT JOIN plans ON plans.id = users.plan_id
        WHERE users.email = $1
        `,
        [email]
    );

    const user = mapUser(existing.rows[0]);

    if (!user) {
        return null;
    }

    await pool.query(
        `
        DELETE FROM users
        WHERE email = $1
        `,
        [email]
    );

    return user;

}

module.exports = {
    countUsers,
    findAll,
    findActiveAdmins,
    findById,
    findByEmail,
    findAuthByEmail,
    findAuthById,
    create,
    deleteById,
    deleteByEmail,
    updateStatus,
    updateRole,
    updateRoleAndPlan,
    updateLimits,
    updatePlan,
    resetUsage,
    incrementBuildsUsed,
    incrementExportsUsed,
    updatePassword,
    updateLastLogin
};