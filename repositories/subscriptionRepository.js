const pool = require("../utils/postgres");

function mapSubscription(row) {

    if (!row) return null;

    return {
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        provider: row.provider,
        providerSubscriptionId:
            row.provider_subscription_id,
        currentPeriodStart:
            row.current_period_start,
        currentPeriodEnd:
            row.current_period_end,
        cancelAtPeriodEnd:
            row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };

}

async function findById(id) {

    const result = await pool.query(
        `
        SELECT
            *
        FROM subscriptions
        WHERE id = $1
        `,
        [id]
    );

    return mapSubscription(
        result.rows[0]
    );

}

async function findByUserId(userId) {

    const result = await pool.query(
        `
        SELECT
            *
        FROM subscriptions
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
    );

    return result.rows.map(
        mapSubscription
    );

}

async function findActiveByUserId(userId) {

    const result = await pool.query(
        `
        SELECT
            *
        FROM subscriptions
        WHERE user_id = $1
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId]
    );

    return mapSubscription(
        result.rows[0]
    );

}

async function create({
    userId,
    planId,
    status = "active",
    provider = null,
    providerSubscriptionId = null,
    currentPeriodStart = null,
    currentPeriodEnd = null,
    cancelAtPeriodEnd = false
}) {

    const result = await pool.query(
        `
        INSERT INTO subscriptions (
            user_id,
            plan_id,
            status,
            provider,
            provider_subscription_id,
            current_period_start,
            current_period_end,
            cancel_at_period_end
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
        )
        RETURNING *
        `,
        [
            userId,
            planId,
            status,
            provider,
            providerSubscriptionId,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd
        ]
    );

    return mapSubscription(
        result.rows[0]
    );

}

async function updateStatus(
    id,
    status
) {

    const result = await pool.query(
        `
        UPDATE subscriptions
        SET
            status = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [
            status,
            id
        ]
    );

    return mapSubscription(
        result.rows[0]
    );

}

module.exports = {

    findById,
    findByUserId,
    findActiveByUserId,
    create,
    updateStatus

};