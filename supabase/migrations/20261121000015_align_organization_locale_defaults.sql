-- Align database-created organizations with the onboarding defaults.
-- Explicit organization currency and timezone values remain unchanged.
ALTER TABLE public.organizations
    ALTER COLUMN currency SET DEFAULT 'PHP',
    ALTER COLUMN timezone SET DEFAULT 'Asia/Manila';
