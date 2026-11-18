# `src/features/organizations/` Agent Instructions

## Responsibility
Multi-tenant organization lifecycle (`Onboarding`, `Active`, `Suspended`), subscription tiers (`Starter`, `Standard`, `Enterprise`), sector settings (`Private`, `Public`, `NonProfit`), statutory IDs, and onboarding wizards.

## Key Files
- `components/OrganizationMain.tsx`: Organization directory with table/card view switching.
- `components/OrganizationSettingsForm.tsx`: Multi-tab organization settings and sector configuration form.
- `organization.service.ts`: Manages organization CRUD, module enablement, and subscription expiration rules.
