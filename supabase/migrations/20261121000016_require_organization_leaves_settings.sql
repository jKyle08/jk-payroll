-- Keep the JSON settings shape consistent for existing and newly created organizations.
-- Existing leave policy values are preserved; missing values receive the shared defaults.
ALTER TABLE public.organizations
    ALTER COLUMN settings SET DEFAULT '{
        "payroll": {
            "standardDailyHours": 8,
            "standardWorkingDaysPerYear": 261,
            "prorationMethod": "WorkingDays",
            "statutoryDeductionSplit": "SplitEqually"
        },
        "timeAndAttendance": {
            "gracePeriodMinutes": 15,
            "overtimeMinimumMinutes": 60,
            "allowWebClockIn": true,
            "requireGeofence": false,
            "geofenceRadiusMeters": 100
        },
        "leaves": {
            "allowNegativeBalance": false,
            "requireApprovalLevels": 1,
            "carryOverLimitDays": 5
        },
        "security": {
            "enforce2FA": false,
            "protectPayslipWithPassword": true,
            "payslipPasswordFormat": "BIRTHDATE_YYYYMMDD"
        }
    }'::jsonb;

UPDATE public.organizations
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{leaves}',
    '{"allowNegativeBalance": false, "requireApprovalLevels": 1, "carryOverLimitDays": 5}'::jsonb
        || CASE
            WHEN jsonb_typeof(settings->'leaves') = 'object' THEN settings->'leaves'
            ELSE '{}'::jsonb
        END,
    true
);
