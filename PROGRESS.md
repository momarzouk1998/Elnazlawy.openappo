# Mazaya - Progress Report
# Date: 2026-06-28

========================================
  DONE (Completed)
========================================

Phase 1: Infrastructure
  [DONE] sql/create_schema.sql - Full rewrite, branches BEFORE users, 14 tables, indexes, views, triggers
  [DONE] sql/seed_data.sql - admin user, 4 branches, 7 suppliers, contractors, materials
  [DONE] Deleted 8 dead files: supabase client/server, db/query-builder, proxy, db-proxy, signup, whoami, update-password
  [DONE] lib/db/auth.ts - JWT jose HS256, cookie mazaya_session, bcrypt
  [DONE] lib/auth-server.ts - requireAuth(), requireAdmin(), hasPermission(), canSeeModule()
  [DONE] lib/auth.ts - Client types, CurrentProfile, ALL_MODULES, canSeeModule()
  [DONE] proxy.ts - JWT route guard, redirects /login (migrated from middleware.ts)
  [DONE] lib/audit.ts - auditLog() fire-and-forget

Phase 2: Auth API (all DONE)
  [DONE] api/auth/login/route.ts - unified {ok,data/error}, username-based, sets cookie
  [DONE] api/auth/logout/route.ts - clears cookie
  [DONE] api/auth/user/route.ts - returns full user with modules+permissions
  [DONE] api/auth/change-password/route.ts - rewritten with requireAuth()
  [DONE] api/admin/create-user/route.ts - rewritten, GET+POST, username-based
  [DONE] api/admin/users/[id]/route.ts - GET/PATCH/DELETE, admin only

Phase 3: REST API (33/33 — ALL DONE)
  [DONE] api/suppliers/route.ts - GET+POST
  [DONE] api/suppliers/[id]/route.ts - GET+PATCH+DELETE, soft delete
  [DONE] api/branches/route.ts - GET+POST, admin only create
  [DONE] api/branches/[id]/route.ts - GET+PATCH+DELETE, reference checks
  [DONE] api/journal/route.ts - GET+POST, party name joins
  [DONE] api/journal/[id]/route.ts - GET+PATCH+DELETE, hard delete
  [DONE] api/journal/summary/route.ts - totals by entry_type
  [DONE] api/overhead/route.ts - GET+POST, optional journal entry creation
  [DONE] api/overhead/[id]/route.ts - GET+PATCH+DELETE
  [DONE] api/material-types/route.ts - GET+POST, admin only
  [DONE] api/material-types/[id]/route.ts - GET+PATCH+DELETE, admin only
  [DONE] api/reports/inventory/route.ts - v_inventory_value view
  [DONE] api/reports/orders/route.ts - v_order_totals view
  [DONE] api/reports/profit-loss/route.ts - profit/loss calculation
  [DONE] api/audit-log/route.ts - GET, admin only
  [DONE] api/health/route.ts - health check, no auth
  [DONE] api/customers/route.ts - GET+POST, branch filtering
  [DONE] api/customers/[id]/route.ts - GET+PATCH+DELETE, branch check
  [DONE] api/contractors/route.ts - GET+POST
  [DONE] api/contractors/[id]/route.ts - GET+PATCH+DELETE
  [DONE] api/boards/route.ts - GET+POST, supplier join, UNIQUE check
  [DONE] api/boards/[id]/route.ts - GET+PATCH+DELETE, soft delete
  [DONE] api/accessories/route.ts - GET+POST, same as boards
  [DONE] api/accessories/[id]/route.ts - GET+PATCH+DELETE
  [DONE] api/orders/route.ts - GET+POST, branch filtering, customer/branch joins
  [DONE] api/orders/[id]/route.ts - GET with materials+external_work, PATCH, DELETE
  [DONE] api/orders/[id]/materials/route.ts - GET+POST+DELETE, inventory trigger
  [DONE] api/orders/[id]/external-work/route.ts - GET+POST+PATCH+DELETE

Phase 4: Supabase → useApi Migration (ALL DONE)
  [DONE] hooks/useApi.ts - useApi<T> (GET) + useApiMutation() (POST/PATCH/DELETE)
  [DONE] store/user-store.ts - Zustand user store
  [DONE] zustand installed in package.json
  [DONE] src/app/page.tsx - Dashboard redirect (fixed getCurrentProfile → getCurrentUser)
  [DONE] src/app/accessories/page.tsx - migrated to useApi
  [DONE] src/app/boards/page.tsx - migrated to useApi
  [DONE] src/app/branches/page.tsx - migrated to useApi
  [DONE] src/app/branches/[id]/page.tsx - migrated to useApi
  [DONE] src/app/admin/material-types/page.tsx - migrated to useApi
  [DONE] src/app/admin/users/page.tsx - migrated to useApi
  [DONE] src/app/_inventory-form.tsx - migrated to useApi
  [DONE] src/app/_new-entity-form.tsx - migrated to useApi
  [DONE] src/app/_order-detail-wrapper.tsx - migrated to useApi
  [DONE] src/app/_new-contractor-wrapper.tsx - migrated to useApi
  [DONE] src/app/_new-customer-wrapper.tsx - migrated to useApi
  [DONE] All remaining pages already used useApi/useUserStore pattern
  [DONE] Removed all supabase references from src/ (0 matches for createClient / supabase.from)
  [DONE] Removed @supabase/ssr and @supabase/supabase-js from package.json (if present)

Phase 5: Build Fixes (ALL DONE)
  [DONE] src/app/contractors/[id]/page.tsx - useState → useEffect (wrong hook)
  [DONE] src/app/orders/_new-order-form.tsx - fixed useApi<any[]> type → useApi<{items:any[]}>
  [DONE] src/app/orders/[id]/invoice/page.tsx - useState → useEffect + dep array
  [DONE] src/app/api/branches/route.ts - fixed broken SQL (backslash + missing $)
  [DONE] 17 API routes - fixed auditLog() keys: before_json/after_json → before/after
  [DONE] src/app/suppliers/page.tsx - added missing useState import
  [DONE] src/lib/db/auth.ts - fixed JWT sub type (number → string) + payload parsing
  [DONE] npm run build passes cleanly (0 errors, 0 warnings)

========================================
  FIXED ISSUES
========================================

  FIX.1: users table FK to branches defined AFTER branches -> moved branches BEFORE users
  FIX.2: change-password imported non-existent getCurrentProfile -> rewrote with requireAuth()
  FIX.3: create-user used email + admin_permissions table -> rewrote username-based
  FIX.4: create_schema.sql truncated during write -> full rewrite (381 lines)
  FIX.5: 17 API routes used auditLog() with wrong keys (before_json/after_json)
  FIX.6: branches/route.ts had broken SQL (backslash instead of trim) + missing placeholder
  FIX.7: Multiple pages used useState(() => ...) instead of useEffect
  FIX.8: lib/db/auth.ts - JWT sub must be string, not number (jose type check)

========================================
  STATS
========================================

  API Routes:    33/33 done (100%)
  Pages:         30+ all migrated to useApi/useUserStore
  Supabase refs: 0 (completely removed)
  Build:         PASSES (0 errors)
  Proxy:         middleware.ts → proxy.ts (Next.js 16 convention)

========================================
  REMAINING (Optional / Non-blocking)
========================================

  [ ] Convert API routes from raw SQL to Prisma (like GYM Management pattern)
  [ ] Update Dockerfile for any new dependencies
  [ ] Update PROJECT_STATUS.md with full migration details
