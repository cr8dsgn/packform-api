CREATE TABLE IF NOT EXISTS plans (

    id UUID PRIMARY KEY,

    name VARCHAR(50) NOT NULL UNIQUE,

    price DECIMAL(10,2) NOT NULL DEFAULT 0,

    build_limit INTEGER NOT NULL,

    export_limit INTEGER NOT NULL,

    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()

);

INSERT INTO plans (
    id,
    name,
    price,
    build_limit,
    export_limit,
    is_default,
    is_active,
    display_order
)
VALUES

(
    gen_random_uuid(),
    'Tester',
    0,
    3,
    3,
    TRUE,
    TRUE,
    1
),

(
    gen_random_uuid(),
    'Starter',
    20,
    25,
    25,
    FALSE,
    TRUE,
    2
),

(
    gen_random_uuid(),
    'Pro',
    30,
    50,
    50,
    FALSE,
    TRUE,
    3
),

(
    gen_random_uuid(),
    'Enterprise',
    50,
    -1,
    -1,
    FALSE,
    TRUE,
    4
);