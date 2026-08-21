CREATE TABLE IF NOT EXISTS subscriptions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    plan_id UUID NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    provider VARCHAR(50),

    provider_subscription_id VARCHAR(255),

    current_period_start TIMESTAMP,

    current_period_end TIMESTAMP,

    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_subscriptions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_subscriptions_plan
        FOREIGN KEY (plan_id)
        REFERENCES plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
    ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id
    ON subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
    ON subscriptions(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id
    ON subscriptions(provider_subscription_id)
    WHERE provider_subscription_id IS NOT NULL;