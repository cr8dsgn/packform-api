ALTER TABLE users
ADD COLUMN IF NOT EXISTS plan_id UUID;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS bonus_builds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS bonus_exports INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_plan'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT fk_users_plan
        FOREIGN KEY (plan_id)
        REFERENCES plans(id);
    END IF;
END $$;