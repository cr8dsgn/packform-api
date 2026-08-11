ALTER TABLE plans
ADD COLUMN IF NOT EXISTS devices_limit INTEGER NOT NULL DEFAULT 1;

UPDATE plans
SET price = 100
WHERE name = 'Enterprise';

UPDATE users
SET plan_id = (
    SELECT id
    FROM plans
    WHERE name = 'Enterprise'
)
WHERE id = 'c3e5100e-dc5e-48da-be97-33f529f41650';

UPDATE users
SET plan_id = (
    SELECT id
    FROM plans
    WHERE name = 'Tester'
)
WHERE id = 'cbacfb14-098e-4926-b0e2-31042655a239';

UPDATE plans
SET devices_limit = 1
WHERE devices_limit IS NULL;

ALTER TABLE users
DROP COLUMN IF EXISTS build_limit;

ALTER TABLE users
DROP COLUMN IF EXISTS export_limit;