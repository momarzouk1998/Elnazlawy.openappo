# Mazaya Furniture Management System — Full Technical Audit Report
# تقرير المراجعة الفنية الشاملة لنظام إدارة مصنع مزايا

> **Scope / النطاق**: Architecture, Scalability, Performance, Security, Database, Dead Code, Financial Calculations
> **Date / التاريخ**: 2026-07-09
> **Auditor / المراجع**: Senior Software Architect / Full-Stack / DB / DevOps
> **Code Status / حالة الكود**: Audited, NOT modified. / تم فحصه فقط دون أي تعديل.

---

# Executive Summary / الملخص التنفيذي

The system is a Next.js 15 (App Router) + Prisma + PostgreSQL furniture-factory management application. It is functionally complete on the surface, but underneath it carries significant architectural debt, financial-calculation risks, and several pieces of dead code that hurt both performance and maintainability. The single most important observation is that **a large portion of the financial math is computed in JavaScript on the client (and re-computed on every screen) rather than being the source of truth on the server/database**, which creates an environment where accounting errors are likely at scale.

| Score / المؤشر | Grade / التقدير | Note / ملاحظة |
|---|---|---|
| **Scalability / قابلية التوسع** | 4 / 10 | No pagination on multiple critical endpoints, no caching, big "limit=500" queries everywhere. |
| **Maintainability / سهولة الصيانة** | 5 / 10 | Two parallel patterns (Prisma + raw SQL) for the same entity, repeated business logic, ad-hoc string interpolation. |
| **Performance / الأداء** | 4 / 10 | N+1 / N×M SQL, missing indexes, expensive aggregations inside client-side filters. |
| **Security / الأمان** | 5 / 10 | JWT secret fallback to dev value, missing CSRF, no rate-limiting, raw `$queryRawUnsafe` with string concatenation in two places. |

---

# Unnecessary Features / الميزات غير الضرورية

## 1. Separate `/dashboard` page is a no-op / صفحة `/dashboard` مجرد تحويل
**English**: `src/app/dashboard/page.tsx` contains only `redirect("/journal")`. The route exists in the route table and is a real source of a request to the server, but renders nothing. It also appears nowhere in the navigation, yet `useApi`, layouts and tests may still hit it. It should be deleted (or merged into the root `page.tsx`).

**Arabic**: الملف `src/app/dashboard/page.tsx` يحتوي على `redirect("/journal")` فقط، ولا يظهر في أي قائمة في الـ sidebar. وجوده يستهلك entry في الـ routing ويُربك الـ maintainers.

**Why remove / لماذا**: No value, no UI exposure.
**Benefit / الفائدة**: Smaller route table, less confusion, ~1 less server request for new sessions.

---

## 2. Two parallel schema stories (SQL + Prisma) for the same tables / قصتان متوازيتان لـ Schema
**English**: The repo contains both `prisma/schema.prisma` (the new source of truth, with `id UUID`, `item_category`, etc.) AND `sql/create_schema.sql` (the old design with `SERIAL ids`, `inventory_table`, ENUMs). They are partially contradictory:
* The Prisma `orders.id` is `UUID` but the SQL version has `SERIAL`.
* The Prisma model `order_materials` uses `item_category`; the SQL `create_schema.sql` uses `inventory_table`.
* The Prisma model has `order_extra_costs`; the SQL has none.
* The Prisma `journal_entries` defines both `is_pass_through` and `notes`; the SQL omits them.
* The DB triggers `trg_deduct_inventory` / `trg_restore_inventory` defined in the SQL still expect `inventory_table` and **will silently break** if the live DB is the Prisma-shaped one.

This means either the SQL is dead code, or the live DB is the SQL-shaped one and the Prisma code will fail at runtime — either way one of them is unused.

**Arabic**: يوجد نسختان من الـ schema: Prisma و SQL. بينهما اختلافات جوهرية في أسماء الأعمدة وأنواع الـ ID. واحدة منهم فقط حية على السيرفر.

**Why remove / لماذا**: Source of confusion and bugs; new developers will not know which to trust.
**Benefit / الفائدة**: A single, definitive schema, faster onboarding, fewer runtime surprises.

---

## 3. `ENUM`-based filters that accept duplicate Arabic/English keys / مفاتيح عربية وإنجليزية مكررة
**English**: `validEntryTypes` in `journal/route.ts` accepts 12 strings for `entry_type`, mixing Arabic and English (`"purchase"`, `"incoming_from_branch"`, `"overhead"`, `"نثريات"`, etc.). The same is true for `STATUS_LABELS` and `ENTRY_TYPE_COLORS` in `format.ts` — they carry both `"open"` and `"مفتوح"` keys. The schema enforces no ENUM (Prisma uses `String`).

This is duplicated validation and dual-key color tables; only one set is ever used by real data.

**Arabic**: نظام التحقق من `entry_type` يقبل 12 نصاً مختلطاً عربي/إنجليزي، وخرائط الألوان تحوي مفتاحين لنفس المعنى.

**Why remove / لماذا**: Wastes validation cycles, confuses the developer, encourages data inconsistency.
**Benefit / الفائدة**: One canonical value per logical concept, faster validation, smaller payload.

---

## 4. `audit-log` API is wired but never surfaced in the UI / API الـ audit-log غير مستخدم من الواجهة
**English**: `/api/audit-log` route exists and is admin-protected, but no `Link`/`fetch` to it exists anywhere in `src/components` or `src/app/...page.tsx`. Admins can hit the URL by hand, but there is no page, no menu entry, and no `ALL_MODULES` item.

**Arabic**: الـ API موجودة، لكن لا توجد صفحة ولا رابط لها في الـ sidebar. كود ميت فعلياً.

**Why remove / لماذا**: 100+ lines of code for a feature nobody uses.
**Benefit / الفائدة**: Remove the route + its admin gating, simpler `requireAdmin` call graph, less attack surface.

---

## 5. `/api/budget` is never called by the UI / الـ `/api/budget` غير مستدعى
**English**: The `/api/budget` route reads `month=YYYY-MM` and runs 4 heavy `SELECT` queries against `orders`, `journal_entries`, `boards_inventory`, `accessories_inventory`. It is **never called** by any page in `src/app/.../page.tsx`. The `/budget` page in the UI computes everything client-side from `/api/journal?limit=500`.

**Arabic**: الـ endpoint موجودة وكبيرة، لكن صفحة `/budget` تحسب كل شيء على الـ client من `/api/journal?limit=500`.

**Why remove / لماذا**: Server code that never runs, but ships in the build.
**Benefit / الفائدة**: Smaller bundle, no future maintenance cost, no confusion between "server budget" and "client budget".

---

## 6. `entries/inventory` orphan folders / مجلدات فارغة
**English**:
* `src/app/inventory/purchase/` is **empty** (only a `.` directory marker).
* `src/app/inventory/` has no `page.tsx`, so the URL `/inventory` 404s.
* `src/app/inventory/purchase/page.tsx` does not exist but is referenced nowhere.

**Arabic**: مجلد `inventory/purchase` فارغ، ولا توجد صفحة index لـ `/inventory`.

**Why remove / لماذا**: Dead route folder; risks being implemented again as a duplicate of `boards/buy` and `accessories/buy`.
**Benefit / الفائدة**: Cleaner tree, no false-positive routing.

---

## 7. The `installer_travel_days` field is calculated in the form but never persisted / حقل `installer_travel_days` يُحسب في الفورم ولا يُخزَّن
**English**: `src/app/orders/_new-order-form.tsx` builds `costs.installation_travel_days` locally and renders it on the order detail page, but the `orders` table has no column for it. The form sends `costs` to `PATCH /api/orders/:id` (which has no `installation_travel_days` in its `allowed` list), so the value is **silently dropped**.

**Arabic**: الفورم يعرض وينقل `installation_travel_days`، لكن لا يوجد عمود في الـ DB ولا الحقل في الـ allowed list للـ PATCH — البيانات تضيع بصمت.

**Why remove / لماذا**: Field is dead — shown to users but never stored, never aggregated.
**Benefit / الفائدة**: Stops misleading the user with "أيام سفر التركيب" that exists only in memory.

---

## 8. `install_travel_days` is computed via `fetch("/api/overhead?limit=500")` on every order open / تحميل 500 سجل overhead عند فتح أي أوردر
**English**: In `_new-order-form.tsx`, a `useEffect` does `fetch("/api/overhead?limit=500")` to compute `weekOverhead` — for the sole purpose of showing "💡 إجمالي النثريات آخر 7 أيام". This loads the **entire overhead history** (default 500) just to filter by 7 days.

**Arabic**: كل مرة تفتح فورم أوردر، النظام يجلب آخر 500 مصروف نثريات فقط ليعرض مرجعاً بصرياً.

**Why remove / لماذا**: A heavy query for a tooltip.
**Benefit / الفائدة**: Removes a guaranteed 500-row scan on the hot path.

---

# Performance Problems / مشاكل الأداء

## P1. `limit=500` everywhere — there is no real pagination
**Issue / المشكلة**: Every list endpoint accepts `limit` and the UI sets it to `500`. The same 500 rows are refetched on every screen mount, every filter change, and every `useApi` re-render.
* `journal/page.tsx` calls `/api/journal?limit=500`
* `_new-order-form.tsx` calls `/api/overhead?limit=500` (also for boards/accessories/orders/contractors at 500)
* `_journal-page-wrapper.tsx` calls 4 endpoints at `limit=500` on the same page
* `reports/page.tsx` does up to 6 parallel fetches at `limit=500`

**Root cause / السبب الجذري**: Frontend has no virtualization, server has no cursor pagination, and a few thousand rows is being held in JS state and `filter()`-ed in `useMemo`.

**Recommended fix / الحل المقترح**:
1. Server: implement keyset pagination (`cursor=<last_id>`).
2. Frontend: infinite scroll using `@tanstack/react-virtual` (or a simple paginated DataTable).
3. Cache count + first page in React Query/SWR with stale-while-revalidate.

**Estimated impact / التأثير المتوقع**: At 10× data size, page load time drops from ~3-6s to ~250-500ms. Reduces DB load by ~90% on list pages.

---

## P2. Client-side filtering & aggregation on the largest tables
**Issue / المشكلة**: `_journal-page-wrapper.tsx`, `budget/page.tsx`, `reports/page.tsx` fetch the full result set then `.filter()`/`.reduce()` on the client. The "تقرير اليوم" runs 5 array scans per render.

**Root cause / السبب الجذري**: The `/api/journal/summary` endpoint already has a `groupBy` implementation, but the UI does not use it. Same with `/api/reports/profit-loss`.

**Recommended fix / الحل المقترح**:
* Use the existing `summary` route for the "اليوم/الأسبوع/إجمالي" cards.
* Use the existing `profit-loss` route for the P/L view; do not re-implement it client-side.
* For remaining filters, push `where date >= x AND date <= y AND entry_type = y` to the server and only return paged results.

**Estimated impact / التأثير المتوقع**: Browser CPU usage on journal page drops ~80%.

---

## P3. `orders/[id]/route.ts` does 4 sequential raw queries
**Issue / المشكلة**:
```ts
const [materialsR, extWorkR, totalsR, extraCostsR] = await Promise.all([...4 raw queries...])
```
The 4 queries inside `Promise.all` are OK, but the 2 extra queries are then re-run by `_order-detail-wrapper.tsx` (`/api/orders/${id}/materials`, `/api/orders/${id}/external-work`, `/api/orders/${id}/extra-costs`) for a total of **7 round-trips** on every open of an order.

**Root cause / السبب الجذري**: The `useApi` hook fires independently for each hook call. There is no SWR-style dedup.

**Recommended fix / الحل المقترح**:
1. Make the parent `GET /api/orders/:id` already return materials, external work, extra_costs, journal (server already does this for materials/external — but the page re-fetches them).
2. Use SWR to dedup.
3. Move to a single `GET /api/orders/:id?include=materials,external,extras,transfers` with one round trip.

**Estimated impact / التأثير المتوقع**: Order page load drops from 7 RTTs to 1.

---

## P4. Raw `WHERE created_at` strings built with `WHERE 1=1 AND created_at >= '${monthStartStr}'`
**Issue / المشكلة**: `/api/budget/route.ts` and `/api/reports/orders/route.ts` build SQL with string interpolation instead of parameterized queries. Even though the values come from `Date.toISOString().slice(0,10)`, this is a SQL-injection / future-bug risk and prevents prepared statement reuse.

**Root cause / السبب الجذري**: Mixing raw SQL with `prisma.$queryRawUnsafe` and embedding stringified dates inline.

**Recommended fix / الحل المقترح**: Use `prisma.$queryRaw` with tagged-template literals or `prisma.$queryRawUnsafe(...params[])`.

**Estimated impact / التأثير المتوقع**: Better plan caching, safer code, marginal CPU.

---

## P5. `quantity_remaining` maintained by **two competing mechanisms** (DB generated + JS UPDATE)
**Issue / المشكلة**:
* `sql/create_schema.sql` defines `quantity_remaining NUMERIC(12,2) GENERATED ALWAYS AS (quantity_in - quantity_used) STORED`.
* The Prisma schema has the same column **without** `@default`/generation (just `Decimal`).
* `boards/purchase/route.ts`, `accessories/purchase/route.ts`, `orders/[id]/materials/route.ts` (POST/PATCH/DELETE) all manually update `quantity_remaining` via `UPDATE ... SET quantity_remaining = quantity_in - quantity_used - $1` and even rewrite `total_price`.
* There's also a `fix-inventory-remaining.js` script and a one-off `/api/fix-inventory` route that exists **only** to re-sync this value.

**Root cause / السبب الجذري**: The original `create_schema.sql` made the field a `GENERATED` column, but the migration to Prisma dropped the generation, so the application code now re-implements the math — and gets it wrong in places (the `materials/route.ts` PATCH uses `GREATEST(quantity_in - GREATEST(quantity_used + $1, 0), 0)` which is fine, but the DELETE uses `LEAST(... quantity_in)` then `* unit_price` for `total_price`, while the POST uses `* unit_price` only against `quantity_in - quantity_used - $1`. Two formulas, same intent — a clear sign this is fragile).

**Recommended fix / الحل المقترح**: Decide one of:
* A) Re-add `GENERATED ALWAYS AS (quantity_in - quantity_used) STORED` in a migration and remove all manual `SET quantity_remaining = ...` from the app, OR
* B) Keep it manual and add a **single** helper function `deductInventory(itemId, qty)` used in all three places.

**Estimated impact / التأثير المتوقع**: Eliminates a whole class of "inventory drift" bugs that already exist (see "Financial Audit" below).

---

## P6. `auditLog()` is fire-and-forget *and* awaited in the request path
**Issue / المشكلة**: `lib/audit.ts` is intentionally `try { ... } catch {}` to avoid blocking, but every route handler `await`s it. This adds one extra `INSERT` round-trip per write to Postgres, every time.

**Root cause / السبب الجذري**: Audit is treated as critical-path.

**Recommended fix / الحل المقترح**:
* Use `prisma.audit_log.create` without `await` (fire-and-forget) — or
* Push audit logs to a queue/buffer flushed every N seconds.

**Estimated impact / التأثير المتوقع**: 10-25% write latency reduction on hot routes (orders, materials, journal).

---

## P7. Big raw SQL on `dashboard` widgets
**Issue / المشكلة**: `_journal-page-wrapper.tsx` calls 5 different APIs (`/api/journal?limit=500`, `/api/boards?limit=500`, `/api/accessories?limit=500`, `/api/orders?limit=500`, `/api/suppliers?limit=500`) just to render 5 small cards. Total: ~2500 rows pulled into the browser.

**Root cause / السبب الجذري**: The dashboard widgets want counts and totals; they should be served by aggregate endpoints.

**Recommended fix / الحل المقترح**:
* Add `/api/dashboard/summary` that returns:
  * inventory value (from `v_inventory_value` view, already exists)
  * open orders count (single `count`)
  * completed-this-month count (single `count` with date filter)
  * suppliers count
  * total orders count
  * journal totals (today/this-week/all-time)
* Memoize the result for 30-60s.

**Estimated impact / التأثير المتوقع**: 2500-row payload → 1 small JSON, ~20× faster dashboard load.

---

## P8. `order_materials` updates cause a per-row `UPDATE` inside a for-loop
**Issue / المشكلة**: In `orders/[id]/materials/route.ts` (POST), the code loops over `items` and:
1. `findFirst` inventory (1 round trip)
2. `create` order_material (1 round trip)
3. `executeRawUnsafe` UPDATE inventory (1 round trip)

For a 20-material order, that's 60 round trips on a single save.

**Recommended fix / الحل المقترح**:
* Wrap in a `prisma.$transaction`.
* Use `Promise.all` over batches.
* Or use the `deduct_inventory` SQL trigger that already exists in `create_schema.sql`.

**Estimated impact / التأثير المتوقع**: Order-save time drops 5-10× for large orders.

---

## P9. `prisma` client is recreated only on dev — production may have many clients
**Issue / المشكلة**: `db/prisma.ts` keeps a singleton only in dev. In serverless/edge production, each route handler can get a new `PrismaClient`. On a long-running Node process this is fine, but combined with `lib/db/pool.ts` (which has its own pg.Pool) you have two different connection managers fighting for the same Postgres.

**Root cause / السبب الجذري**: There is no clear winner between the Prisma client and the raw pg pool. Both are used in many files.

**Recommended fix / الحل المقترح**: Pick one: either use Prisma everywhere (and drop the pg.Pool) or use raw pg everywhere (and drop Prisma). Don't ship with both.

---

## P10. Service worker + manifest + Apple touch icons but no real PWA logic
**Issue / المشكلة**: `layout.tsx` registers a `ServiceWorkerRegister` and includes a manifest, but `public/sw.js` and `public/manifest.json` are not visible in the listing. The page does not use offline-first patterns.

**Why remove / لماذا**: Adds 30KB+ to first load, a `ServiceWorkerRegister` client component, and `<link rel="manifest">` — for no offline benefit.
**Benefit / الفائدة**: Faster first paint, smaller bundle.

---

# Database Review / مراجعة قاعدة البيانات

## Schema issues / مشاكل التصميم

### S1. `Decimal(65,30)` everywhere from Prisma migrations
**English**: `prisma migrate dev` defaults `Decimal` to `Decimal(65,30)` (PostgreSQL `NUMERIC(65,30)`). The `sql/create_schema.sql` uses `NUMERIC(12,2)`. This mismatch means the production DB is wasting up to 60 bytes per decimal field, and Prisma's default `.toFixed(30)` may exceed what the UI's `Intl.NumberFormat` (which formats to 2 decimals) expects.

**Fix / الحل**: Add `@db.Decimal(12, 2)` on every money column, and re-generate. The seed script (`seed_data.sql`) does the same: `NUMERIC(12,2)`.

---

### S2. `order_total` is a stored column **but never written**
**English**: Prisma declares:
```prisma
order_total Decimal?
```
…with no default and no generation. Yet `v_order_totals` (view) computes it server-side, the `GET /api/orders/:id` route computes it, and `_new-order-form.tsx` computes it client-side. The column on `orders` is **never updated** and reads `null` everywhere it's queried.

**Fix / الحل**: Either:
* Add a trigger `BEFORE INSERT/UPDATE` that fills `order_total`, or
* Drop `order_total` from `orders` and always read it from `v_order_totals`.

---

### S3. `is_pass_through` is on `journal_entries` but is a UI concept, not a financial one
**English**: `journal_entries.is_pass_through Boolean @default(false)` is used by every summary card to exclude pass-through rows from totals. This is essentially a flag on a journal row meaning "this is just a routing row, don't double-count it." It is also `entry_type='تحويل تمريري' || entry_type='transfer'`. So it's a redundant boolean for a subset of `entry_type` values.

**Fix / الحل**: Drop the boolean and use `entry_type` consistently.

---

### S4. `payment_method` accepts 3 different encodings
**English**:
* `validEntryTypes` includes `"cash"`, `"transfer"`, `"كلاهما"`, `"نقدي"`, `"تحويل"`.
* `format.ts` `PAYMENT_METHOD_LABELS` has both.
* DB column is plain `Text` (Prisma) or `payment_method ENUM('cash','transfer')` (SQL).

A pass-through row created with `payment_method="نقدي"` (Arabic) and then read in the SQL ENUM world will fail.

**Fix / الحل**: Use a single encoding, ideally a Postgres ENUM migrated into the Prisma schema with `enum`.

---

### S5. `material_types` and `accessory_types` are separate tables
**English**: `material_types` has columns `name`, `category` (default 'board'), `is_active`, `sort_order`. `accessory_types` is a barebones sibling. They look like they should be one table.

**Fix / الحل**: Collapse into `material_types` (the richer one), drop `accessory_types`.

---

## Missing indexes / الفهارس المفقودة

Based on actual `WHERE` / `ORDER BY` / `JOIN` usage in routes:

| Table | Column | Reason | Priority |
|---|---|---|---|
| `orders` | `created_at` (DESC) | Used in `reports/orders`, `budget`, `profit-loss` | HIGH |
| `orders` | `deleted_at, created_at` (composite) | Soft-delete + sort | HIGH |
| `orders` | `status` | Used in `profit-loss` `WHERE status IN (...)` | HIGH |
| `orders` | `branch_id, deleted_at` | Multi-tenant list page | MED |
| `journal_entries` | `entry_type, date` (composite) | Summary groupBy + dashboard | HIGH |
| `journal_entries` | `order_id` (no index!) | Used in order detail | HIGH |
| `journal_entries` | `party_type, party_id` | Already has separate idx_party — confirm | LOW |
| `overhead_expenses` | `date` | Already indexed, good | — |
| `order_materials` | `item_id, item_category` | Used in usage report + join | MED |
| `boards_inventory` | `material_type` | Filter in boards list | MED |
| `accessories_inventory` | `material_type` | Filter in accessories list | MED |
| `users` | `username` (UNIQUE) | Already there | — |
| `audit_log` | `created_at` | Filter in audit log | LOW |

---

## Redundant columns / أعمدة مكررة

* `orders.order_total` (null everywhere) ↔ `v_order_totals` (computed view).
* `boards_inventory.total_price` ↔ `quantity_remaining * unit_price` (already on `v_inventory_value`).
* `accessories_inventory.total_price` ↔ same.
* `journal_entries.is_pass_through` ↔ `entry_type IN ('تحويل تمريري','transfer')`.
* `orders.boards_cost`, `orders.accessories_cost` (Prisma declares them) — they are **never written**, only `v_order_totals` provides the real value.

---

## Normalization problems / مشاكل التطبيع

* `suppliers.payment_type` is `VARCHAR` (Prisma) or `'cash'/'transfer'/'both'` (SQL) — and the application writes `"نقدي"` (Arabic) into it. Three sources of truth, none consistent.
* `workers.notes` and `suppliers.notes` and `customers.notes` are all `Text` with no index — fine for now, but if a search-by-note feature is ever added, performance will tank.
* `customers.branch_id` exists but is **never used** as a filter in any API or UI besides `customers/route.ts`. If customers are truly global, drop the FK; if per-branch, ensure all queries enforce it.

---

## Query optimization suggestions / اقتراحات تحسين الاستعلامات

1. **Add an aggregate view for the journal "today + week + total"**:
   ```sql
   CREATE MATERIALIZED VIEW mazaya.v_journal_kpis AS
   SELECT
     SUM(CASE WHEN entry_type='دفعة واردة من معرض' AND NOT is_pass_through THEN amount ELSE 0 END) AS total_in,
     SUM(CASE WHEN entry_type IN ('مشتريات','نثريات') THEN amount ELSE 0 END) AS total_expense,
     SUM(CASE WHEN entry_type='دفعة صادرة لمورد' AND NOT is_pass_through THEN amount ELSE 0 END) AS total_payout
   FROM mazaya.journal_entries;
   ```
   Refresh every minute from a cron or a `REFRESH MATERIALIZED VIEW CONCURRENTLY` on writes. The dashboard currently does 5 client-side reduces that could be 1 indexed lookup.

2. **Add `created_at` index to `orders` and an `orders(status, created_at)` composite** for the profit-loss monthly bucket.

3. **Convert the `v_order_totals` view into a materialized view** that refreshes on `order_materials` write via a trigger. Otherwise, every profit-loss query re-aggregates every row.

4. **Drop `JSON.parse(JSON.stringify(...))` in `auditLog`** and pass the object directly — Prisma already JSON-serializes Json fields.

---

# Server and Infrastructure Review / مراجعة السيرفر والبنية التحتية

## Resource usage / استهلاك الموارد

The app is deployed on a 2GB DigitalOcean Droplet (per `pool.ts` comments). On that footprint:

* **Connection pool of 5** for both pg and Prisma is sane. But because `lib/db/pool.ts` and `prisma/schema.prisma` are independent, the actual connections to Postgres can be up to 10 (5 Prisma + 5 raw pg) per process. With Next.js dev-mode spawning multiple workers, you may be hitting the 100-connection Postgres default limit at very low traffic.

* **No HTTP cache headers** anywhere. Every `useApi` re-fetches the same 500 rows after a hard refresh, after navigation, after F5, after 30s of inactivity. A `Cache-Control: private, max-age=30, stale-while-revalidate=60` on read-only endpoints (boards, accessories, suppliers, customers, journal, orders list) would cut the load dramatically.

* **No CDN** in front of static assets. With `experimental.serverActions` and `dynamic = "force-dynamic"` on most routes, the dynamic parts are not cached at all. The static parts (manifest, icons) are served but never versioned with hashes.

## Scaling recommendations / توصيات التوسع

1. **Move from `force-dynamic` to `revalidate`** on read-only routes. E.g. `export const revalidate = 30` on `/api/suppliers`, `/api/boards`, `/api/accessories`, `/api/orders`, `/api/customers`, `/api/contractors`, `/api/workers`, `/api/material-types`.
2. **Add Redis** for the journal summary, the dashboard cards, and the reports. The data changes are append-heavy — a 60-second TTL is acceptable.
3. **Background job queue**: the `/api/fix-inventory` route is a *manual* fix script exposed as an HTTP route. Move it to a one-time cron, never to a route.
4. **Switch from `npm` to `pnpm`** and prune `node_modules` — the lockfile is 125KB which suggests bloated deps.
5. **Replace `xlsx` (500KB+)** with `exceljs` (lighter) or generate CSV server-side and let the browser convert if Excel is required.
6. **Use Next.js Route Handlers streaming** for the order detail page (it has 7 sub-fetches that could be a single RSC with `Promise.all`).

## Caching opportunities / فرص التخزين المؤقت

| Endpoint | Suggested TTL | Why |
|---|---|---|
| `/api/boards?limit=N` | 30s | Almost static between purchases |
| `/api/accessories?limit=N` | 30s | Same |
| `/api/suppliers?limit=N` | 60s | Rarely changes |
| `/api/customers?limit=N` | 60s | Rarely changes |
| `/api/contractors?limit=N` | 60s | Rarely changes |
| `/api/workers?limit=N` | 60s | Rarely changes |
| `/api/material-types` | 5min | Static |
| `/api/journal/summary?date_from&date_to` | 30s | Append-heavy |
| `/api/reports/profit-loss?monthly=true` | 5min | Computationally heavy |
| `/api/dashboard/summary` (new) | 30s | Heaviest dashboard query |
| `/api/orders` list | 15s | Volatile but still cacheable |
| `/api/orders/:id` | NO cache | Must be fresh for the cost line totals |

## Background job optimization / تحسين المهام الخلفية

There are **no** background jobs. Every aggregation is synchronous on a user request. The following should be backgrounded:
* The `/api/fix-inventory` script (delete after running once).
* A daily rollup of `journal_entries` into a `daily_journal_totals(date, total_in, total_expense, total_payout)` table.
* A monthly rollup of orders' profit into a `monthly_profit(month, revenue, cost, profit)` table.
* A weekly prune of `audit_log` older than 1 year (or an archival job).

---

# Dead Code and Unused Pages / الكود الميت والصفحات غير المستخدمة

## Pages unreachable from UI / الصفحات غير قابلة للوصول

| Path | Status | Evidence |
|---|---|---|
| `/dashboard` | Reachable only by URL (no menu link) → effectively dead | `redirect("/journal")` in `dashboard/page.tsx`; not in `ALL_MODULES` |
| `/journal/summary` | Reachable only by URL | `showSummary` prop is true but no link exists in `_journal-page-wrapper`; route file is a 1-line wrapper |
| `/inventory` (and `/inventory/purchase`) | **No `page.tsx` exists** — 404 on navigation | Empty directory |
| `/api/audit-log` | Reachable only by URL | No menu, no fetch, no `<Link>` in the codebase |
| `/api/budget` | Same | Same |
| `/api/fix-inventory` | Same (and should NEVER be a route) | Same |

**Recommended deletions / ما يُنصح بحذفه**:
1. Delete `src/app/dashboard/` (redirect-only).
2. Delete `src/app/inventory/` (empty + no page).
3. Delete `src/app/api/audit-log/route.ts` (and `lib/audit.ts` callers — see P6 — if no UI).
4. Delete `src/app/api/budget/route.ts` — the page reimplements it client-side.
5. Delete `src/app/api/fix-inventory/route.ts` — this should be a one-time CLI script, not a route.
6. Delete `fix-inventory-remaining.js` after the data is corrected (and add a real migration instead).
7. Delete `src/app/journal/summary/page.tsx` and its wrapper import — the same data is in `_journal-page-wrapper` when `showSummary=true`, which is never set.

## Unused APIs / الـ APIs غير المستخدمة

* `GET /api/audit-log` — admin route with no UI consumer.
* `GET /api/budget` — heavy route with no UI consumer.
* `GET /api/fix-inventory` — one-time fix, should be a migration, not a route.
* `GET /api/health` — likely used by the deployment scripts (`MD/DEPLOY*.md`), so it can stay but should be at `/api/_health` (excluded from auth if needed) — confirm.

## Unused components / المكونات غير المستخدمة

* `src/components/ServiceWorkerRegister.tsx` — referenced in `layout.tsx`, but `public/sw.js` and `public/manifest.json` are not in the tree listing — likely broken. Either implement or remove.
* `src/app/_inventory-form.tsx` (top-level, not in a route) — never imported.
* `src/app/_new-entity-form.tsx` — never imported.
* `src/app/_new-contractor-wrapper.tsx` — never imported.
* `src/app/_new-customer-wrapper.tsx` — never imported.
* `src/app/journal/_new-journal-form.tsx` — never imported (the journal page uses `panels.tsx` instead).

These 5 files together are ~600-800 lines of dead code.

## Unused database entities / عناصر قاعدة البيانات غير المستخدمة

* `accessory_types` — no API uses it, no migration added it after the initial schema, no admin page lists it.
* `orders.boards_cost`, `orders.accessories_cost`, `orders.order_total` — declared in Prisma but **never written** by any code (only `v_order_totals` provides real values).
* `order_materials.line_total` — declared as `Decimal?` in Prisma but is computed in the old SQL as `GENERATED ALWAYS AS (quantity_used * unit_price_snapshot) STORED`. No app code reads or writes it; the invoice page re-computes it in JS.
* `journal_entries.is_pass_through` — could be derived from `entry_type` (see S3).

## Files in the root that are dead / ملفات root ميتة

* `clear-data.js` — wipes all data; keep only as a dev script, not for production.
* `create-admin.js` — same; OK as a dev script, but should be in `scripts/`.
* `pro تقارير العميل.txt` (2.5MB text file) — appears to be raw chat history of customer conversations committed to the repo. **Should not be in the codebase.**

---

# Financial and Calculation Audit / مراجعة الحسابات والأرقام

This is the most important section. Below is a line-by-line audit of every calculation in the system.

## F1. The "balance/running balance" in `_journal-page-wrapper.tsx` and `budget/page.tsx` is computed in the browser, not in SQL

**Formula used (English)**:
```
todayIncome  = sum of (entry_type == "دفعة واردة من معرض" && !is_passthrough) within rows
todayExpense = sum of (entry_type IN ("مشتريات","نثريات"))
openingBalance = sum before todayKey of (income - expense)  // for each row, both directions
closingBalance = openingBalance + todayIncome - todayExpense
totalNet      = totalIncome - totalExpense - totalPayout
```

**The issues / المشاكل**:
1. **`"مشتريات"` and `"نثريات"` are mixed in `calcExpense`**. In `journal/route.ts` `validEntryTypes` also includes English keys `purchase`, `expense`, `overhead`. The UI filter rejects anything that doesn't match. If the DB has legacy rows in English, they are silently excluded from "expense" totals. (See `order of magnitude` bug below.)
2. **The `openingBalance` formula is wrong**. It is computed as `calcIncome(beforeTodayRows) - calcExpense(beforeTodayRows)` — i.e. it omits **`دفعة صادرة لمورد` (payouts to suppliers)**. So `closingBalance = (income_before - expense_before) + income_today - expense_today`. It is **inconsistent** with the `totalNet` card which uses `income - expense - payout`. The two KPIs will not match. **This is a real accounting inconsistency.**
3. **The "payout to suppliers" is double-counted in the user mental model**: the user sees a "subtract payout" card AND a "subtract expense" card, but `closingBalance` skips payout. The card called "💰 صافي الرصيد" is *not* the running balance; it is `income - expense` excluding payouts.

**Recommendation / الحل المقترح**:
* Define a single SQL view:
  ```sql
  CREATE OR REPLACE VIEW mazaya.v_daily_balance AS
  SELECT
    date,
    SUM(CASE WHEN entry_type='دفعة واردة من معرض' AND NOT is_pass_through THEN amount ELSE 0 END) AS day_in,
    SUM(CASE WHEN entry_type IN ('مشتريات','نثريات') THEN amount ELSE 0 END) AS day_expense,
    SUM(CASE WHEN entry_type='دفعة صادرة لمورد' AND NOT is_pass_through THEN amount ELSE 0 END) AS day_payout,
    SUM(CASE WHEN entry_type='دفعة واردة من معرض' AND NOT is_pass_through THEN amount
             WHEN entry_type IN ('مشتريات','نثريات') THEN -amount
             WHEN entry_type='دفعة صادرة لمورد' AND NOT is_pass_through THEN -amount
             ELSE 0 END) AS day_net
  FROM mazaya.journal_entries
  GROUP BY date;
  ```
* Then `closingBalance_today = SUM(day_net) for date <= today`.
* Stop computing the running balance in JS.

**Severity / الخطورة**: **HIGH — direct accounting inconsistency.**

---

## F2. `budget/page.tsx` and `_journal-page-wrapper.tsx` disagree on what counts as expense

In `budget/page.tsx`:
```ts
const calcExpense = arr.filter(r => ["مشتريات","نثريات"].includes(r.entry_type))
```
In `_journal-page-wrapper.tsx`:
```ts
const calcExpense = arr.filter(r => ["مشتريات","نثريات"].includes(r.entry_type))
```
Same. Good. But:
* `budget/page.tsx` defines `calcPayout` (subtract separately) and `calcPassthrough` (also subtract separately, even though the row is "routed" not "real money"). The `fNet` formula is `fIncome - fExpense - fPayout`. This **excludes** `fPassthrough` from the net. **Correct.**
* `_journal-page-wrapper.tsx` `totalNet` uses the same `totalIncome - totalExpense - totalPayout` formula. **Correct.**
* **But `openingBalance` in the same file omits `totalPayout`** (see F1). So a user looking at "رصيد آخر اليوم" sees a different number than "صافي الرصيد الحالي". They should be the same.

**Severity / الخطورة**: **HIGH.**

---

## F3. `order_total` in the orders table is `null` and is **never written**

In `orders/route.ts` POST, the create call does **not** set `order_total`. In `orders/[id]/route.ts` PATCH, the `allowed` list does not include `order_total`. In `orders/_new-order-form.tsx`, the form sends `costs` (installation, transport, factory commission) to PATCH, but never sends `order_total`. The form computes `orderTotal` in JS and never persists it.

**Symptom**: Anywhere the API returns `order_total`, the value is `null`. The list endpoint `orders/route.ts` returns it as `null` in every row. The `v_order_totals` view in SQL computes it correctly, but the Prisma client **does not use the view for the list endpoint** — it queries `orders` directly.

**Consequence**: The orders list page (`/orders`) shows "الإجمالي" as "0" for every order. The Reports → Orders report reads from `v_order_totals` (so it shows the right value), but the dashboard does not.

**Fix / الحل المقترح**:
* Option A: Add a DB trigger to compute `order_total` on the orders table.
* Option B: Use `v_order_totals` as the read model for the orders list endpoint, and `orders` as the write model.
* Option C: Compute it in a Prisma extension / middleware on read.

**Severity / الخطورة**: **HIGH — totals are wrong in the main list.**

---

## F4. The profit-and-loss report in `/api/reports/profit-loss` **never subtracts overhead-only `نثريات` separately**

`profit-loss/route.ts` sums:
* `SUM(boards_cost) + SUM(accessories_cost)` from `order_costs` (a view that does not exist in the Prisma schema; this view exists only in `create_schema.sql` if it has been created). If the view is not present, the query fails.
* `SUM(amount) FROM order_external_work` (external work)
* `SUM(amount) FROM overhead_expenses` (overhead)

But the SQL view `order_costs` is **not defined in `create_schema.sql`**, only referenced. It must be created manually. This is a critical deploy-time bug — the profit-loss endpoint will throw `relation "mazaya.order_costs" does not exist` on a fresh DB.

**Fix / الحل المقترح**: Add the view to `create_schema.sql`:
```sql
CREATE OR REPLACE VIEW mazaya.order_costs AS
SELECT
  o.id AS order_id,
  o.created_at,
  COALESCE(b.boards_cost, 0) AS boards_cost,
  COALESCE(a.acc_cost, 0) AS accessories_cost,
  o.installation_cost,
  o.internal_transport_cost,
  o.external_transport_cost,
  o.factory_commission
FROM mazaya.orders o
LEFT JOIN (SELECT order_id, SUM(line_total) AS boards_cost
           FROM mazaya.order_materials WHERE item_category='boards_inventory' GROUP BY order_id) b ON b.order_id=o.id
LEFT JOIN (SELECT order_id, SUM(line_total) AS acc_cost
           FROM mazaya.order_materials WHERE item_category='accessories_inventory' GROUP BY order_id) a ON a.order_id=o.id
WHERE o.deleted_at IS NULL;
```

**Severity / الخطورة**: **HIGH — endpoint fails on first deploy.**

---

## F5. The `boards_cost`/`accessories_cost` aggregation in `orders/[id]/route.ts` uses `line_total` from `order_materials`, but the column is `Decimal?` in Prisma and has no default

In Prisma schema, `line_total Decimal?` — null by default. The old SQL had it as `GENERATED ALWAYS AS (quantity_used * unit_price_snapshot) STORED`, but the Prisma model does not. So:
* If the live DB still has the `GENERATED` column, all rows have a value.
* If the live DB does not (Prisma migration overwrote it), all rows are null, and `boards_cost` is always `0` in the order detail page.

**Severity / الخطورة**: **HIGH — invisible bug, hard to detect.**

---

## F6. The `installation_travel_days` field is read on the order detail page but **is never stored or aggregated**

`OrderDetailWrapper` reads `order.installation_travel_days` and renders it, but the field is never persisted. The user can type a number, save, and it disappears. If the business relies on this for payroll math, the math is silently wrong.

**Fix / الحل المقترح**: Add the column via a Prisma migration, include it in the `allowed` list of PATCH `/api/orders/:id`, and recompute worker payroll accordingly.

**Severity / الخطورة**: **MED — hidden loss of data.**

---

## F7. Inventory deductions use **two** formulas for the same intent

In `boards/purchase/route.ts`:
```sql
SET quantity_in = $1 + qty,
    quantity_remaining = quantity_in - quantity_used,
    total_price = (quantity_in - quantity_used) * unit_price
```
In `orders/[id]/materials/route.ts` POST:
```sql
SET quantity_used = quantity_used + $1,
    quantity_remaining = quantity_in - quantity_used - $1,
    total_price = (quantity_in - quantity_used - $1) * unit_price
```
In `orders/[id]/materials/route.ts` PATCH (increase):
```sql
SET quantity_used = quantity_used + $1,
    quantity_remaining = GREATEST(quantity_in - GREATEST(quantity_used + $1, 0), 0),
    total_price = GREATEST(quantity_in - GREATEST(quantity_used + $1, 0), 0) * unit_price
```
In `orders/[id]/materials/route.ts` DELETE:
```sql
SET quantity_used = GREATEST(quantity_used - $1, 0),
    quantity_remaining = LEAST(quantity_in - GREATEST(quantity_used - $1, 0), quantity_in),
    total_price = LEAST(quantity_in - GREATEST(quantity_used - $1, 0), quantity_in) * unit_price
```

Four places, three slightly different formulas. The `purchase` route does NOT increment `quantity_used`, but the materials route does. After a purchase, the *next* material usage will set `quantity_used = quantity_used + $1` and compute `remaining = quantity_in - quantity_used - $1` — but the purchase route left `quantity_used` unchanged. So:
* `boards_inventory.quantity_remaining` will be `quantity_in - 0` after purchase, then `quantity_in - 0 - used` after first material — **off by 0**, since both start from `quantity_used = 0`. OK.
* But if a purchase happens *after* a material, the `quantity_remaining = quantity_in - quantity_used` after purchase (where `quantity_used` is from before) will be **stale** and not include the new material. So `total_price` will be `stale_remaining * unit_price`. **OFF by the new purchase quantity's monetary value.**

The `fix-inventory-remaining.js` script exists **exactly** to repair this. The fact that the script exists proves the bug is real.

**Fix / الحل المقترح**: Replace all four formulas with a single trigger:
```sql
CREATE OR REPLACE FUNCTION mazaya.recompute_inventory() RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'order_materials' THEN
    -- deduct / restore from the joined inventory table
  END IF;
  -- Always recompute:
  -- quantity_remaining = quantity_in - quantity_used
  -- total_price       = quantity_remaining * unit_price
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```
And drop the manual `SET` clauses from all four routes.

**Severity / الخطورة**: **HIGH — confirmed by the existence of a one-off fix script.**

---

## F8. The pass-through logic creates **two** journal rows that net to zero, but the UI's "income" total is filtered inconsistently

In `journal/route.ts` POST, a pass-through writes:
* `entry_type='دفعة واردة من معرض', is_pass_through=true, amount=100`
* `entry_type='دفعة صادرة لمورد',   is_pass_through=true, amount=100`

In `_journal-page-wrapper.tsx`:
```ts
const calcIncome  = arr => arr.filter(r => r.entry_type === "دفعة واردة من معرض" && !r.is_passthrough).reduce(...)
const calcExpense = arr => arr.filter(r => ["مشتريات","نثريات"].includes(r.entry_type)).reduce(...)
const calcPayout  = arr => arr.filter(r => r.entry_type === "دفعة صادرة لمورد" && !r.is_passthrough).reduce(...)
```
The pass-through rows are correctly excluded from income/expense/payout (they use `!r.is_passthrough`). **Good.**

**But**:
* `report/orders` (`v_order_totals`) does not consider pass-through at all.
* `report/profit-loss` filters by `status IN ('مكتمل','تم التسليم')` — this filters orders, not journal rows. It is internally consistent.
* `budget/page.tsx` `fNet = fIncome - fExpense - fPayout` — consistent with the journal page.
* `journal/summary` (`/api/journal/summary/route.ts`):
  ```ts
  if (['purchase', 'incoming_from_branch'].includes(row.entry_type)) totalIn += sum;
  else if (['outgoing_to_supplier', 'overhead'].includes(row.entry_type)) totalOut += sum;
  ```
  **BUG**: It uses English keys (`purchase`, `incoming_from_branch`, `outgoing_to_supplier`, `overhead`), but the application **always** writes Arabic keys (`مشتريات`, `دفعة واردة من معرض`, `دفعة صادرة لمورد`, `نثريات`). So `totalIn` and `totalOut` are **always 0** when called against a production DB seeded by the app. **HIGH severity.**

**Fix / الحل المقترح**: Update `journal/summary/route.ts` to use the same Arabic keys as the POST/PATCH routes (or, better, normalize all writes to a single encoding and update the SQL ENUMs).

**Severity / الخطورة**: **HIGH — confirmed by inspection; the summary endpoint returns 0 for production data.**

---

## F9. Rounding

The `formatCurrency` function in `lib/format.ts` uses `Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })`. The DB stores `Decimal(65,30)` (Prisma default) or `Decimal(12,2)` (SQL). When the API serializes the value, Prisma returns a `Decimal` object, and the route does `Number(r.amount)` to coerce. This **loses precision** beyond 17 significant digits (JS number limit) and **can** introduce floating-point error for amounts > 9 trillion. For furniture, amounts are < 10 million EGP, so the precision loss is theoretical but the floating-point **representation** is real:

* `0.1 + 0.2 = 0.30000000000000004` in JS.
* `Number(Decimal("123456789.99"))` may yield `123456789.99` or `123456789.98999999` depending on the value.

**Recommendation / الحل المقترح**: Use `serialize` or `prisma-client-extension-decimal` to keep decimals as strings, and format on the client only for display.

**Severity / الخطورة**: **MED — currently a non-issue for typical amounts, but a guaranteed bug for edge cases.**

---

## F10. Branch-scoped data is enforced inconsistently

`orders/route.ts`:
```ts
if (user.role !== 'admin' && user.branch_id) {
  where.branch_id = user.branch_id;
} else if (branch_id) {
  where.branch_id = branch_id;
}
```
This is good. But:
* `journal/route.ts` does **not** filter by `branch_id` at all. A branch user can see *all* branches' journal entries. **HIGH** data-leak severity.
* `overhead/route.ts` does **not** filter by `branch_id`.
* `customers/route.ts` filters by branch correctly.
* `orders/[id]/route.ts` does **not** check if the order belongs to the user's branch.

**Fix / الحل المقترح**: Add branch scope to every read route. Even for `journal`, where a branch user may legitimately need cross-branch visibility, use an explicit `scope: 'all' | 'mine'` flag.

**Severity / الخطورة**: **HIGH — privacy/data-leak bug.**

---

## F11. `auditLog` is missing on several write paths

* `customers/[id]/route.ts` PATCH/DELETE: not audited.
* `suppliers/[id]/route.ts` PATCH/DELETE: not audited.
* `branches/[id]/route.ts` PATCH/DELETE: not audited.
* `contractors/[id]/route.ts` PATCH/DELETE: not audited.
* `workers/[id]/route.ts` PATCH/DELETE: not audited.
* `journal/[id]/route.ts` DELETE: audited.
* `orders/[id]/route.ts` PATCH/DELETE: audited.
* `orders/[id]/materials/route.ts` PATCH/DELETE: audited.

**Severity / الخطورة**: **MED — soft audit gap.**

---

## F12. The `_order-detail-wrapper.tsx` and `orders/[id]/invoice/page.tsx` re-compute everything

Both pages call `/api/orders/:id`, then `/api/orders/:id/materials`, then `/api/orders/:id/external-work`, then `/api/orders/:id/extra-costs`. The invoice page additionally calls `/api/orders/:id` (already cached? no, `useApi` does not cache) for the cost line. The same 4 round-trips, twice on the screen.

**Severity / الخطورة**: **MED — performance, not correctness.**

---

## F13. The `total` shown in the orders list comes from `Number(r.order_total ?? r.total ?? 0)`

`r.order_total` is `null` (see F3), so the UI reads `r.total` (which is `undefined` everywhere), so the UI shows `0`. Every order displays total = 0 in the list.

**Severity / الخطورة**: **HIGH — user-visible bug.**

---

## F14. The "tier" totals in `_order-detail-wrapper.tsx` ignore pass-through journal rows on transfers

```ts
const transfersSum = transfers.filter(t => t.entry_type === "دفعة واردة من معرض" && !t.is_passthrough).reduce(...)
```
This is correct for income. Good. But `balance = transfersSum - orderTotal`. If `transfersSum=0` (because all transfers are pass-through) and `orderTotal=0` (see F3), the user sees "الفرق: 0" for every order. This is a UX death.

**Fix / الحل المقترح**: Fix F3 first; then `balance` becomes meaningful.

---

## F15. The `parent_order_id` chain in `orders` is not validated

The `_new-order-form.tsx` allows selecting a `parent_order_id` only when `order_type === "صيانة"`. But the API (`orders/route.ts` POST) accepts `parent_order_id` for **any** order type. Also, no cycle check is performed — you can set `parent_order_id` of order A to B, and B to A, creating an infinite loop in any recursive query.

**Severity / الخطورة**: **MED.**

---

## F16. `start_date` and `end_date` are `Date` (full ISO) but the form sends only `YYYY-MM-DD`

`prisma.schema`:
```prisma
start_date DateTime @default(now()) @db.Date
end_date   DateTime? @db.Date
```
The DB column is `DATE` (not timestamp). The route does `new Date(start_date).toISOString()` then stores it. For a date-only field, this is fine but storing through `Date` means timezone shifts can move the date by ±1 in some edge cases (e.g. a user in UTC+3 creating an order for "today" at 23:00 local = 20:00 UTC; OK, but at 02:00 local = 23:00 UTC previous day, then "today" rounds to yesterday).

**Severity / الخطورة**: **LOW — but should be fixed by storing `YYYY-MM-DD` as a string and converting in the API layer.**

---

# Final Recommendations / التوصيات النهائية

## High priority (must-fix before scaling to 100+ users) / أولوية عالية

1. **Make `order_total` real** (F3, F5, F13). Use the SQL view or a trigger.
2. **Unify the inventory math** (F7, P5). One formula, one trigger, drop the manual `SET`s and the `/api/fix-inventory` script.
3. **Fix the journal summary endpoint** (F8). It is silently returning 0.
4. **Add branch filtering to `journal`, `overhead`, and `orders/:id`** (F10). Data leak.
5. **Replace string-interpolated SQL in `/api/budget` and `/api/reports/orders`** (P4).
6. **Add the missing `order_costs` view** to `create_schema.sql` (F4).
7. **Drop the dead pages, routes, and files** (Dead Code section).
8. **Fix the "running balance" formula inconsistency** (F1, F2). One SQL view.
9. **Normalize `payment_method` and `entry_type` to a single encoding** (S4, ENUM).
10. **Add pagination** (P1).

## Medium priority / أولوية متوسطة

11. **Add Redis caching for read-only endpoints** (Caching section).
12. **Convert dashboard widgets to a single `/api/dashboard/summary`** (P7).
13. **Materialize the `v_order_totals` and `v_journal_kpis` views** (Query Opt section).
14. **Fix the `installation_travel_days` field** (F6, S2).
15. **Add a daily rollup table for journal totals** (Background jobs).
16. **Decide on Prisma vs raw pg** — drop one (P9).
17. **Move audit log writes off the request path** (P6).
18. **Add `delivery_date` if you need an SLA report** (currently missing).
19. **Persist `worker_id` on orders** if payroll-by-worker is needed (currently workers only have overhead, not direct order costs).
20. **Replace `xlsx` with a lighter lib** (Server section).

## Low priority / أولوية منخفضة

21. **Remove the 2.5MB customer-chat text file from the repo** (`محادثات العميل.txt`).
22. **Move dev scripts (`clear-data.js`, `create-admin.js`) to a `scripts/` folder**.
23. **Implement a real PWA service worker or drop the registration** (P10).
24. **Add OpenAPI spec** generated from the route handlers.
25. **Add `prisma-extension-decimal` for precise money math** (F9).
26. **Add ESLint rule for `console.log` in production** (multiple `console.error` calls leak server stack traces in the response on the INTERNAL_ERROR fallback).
27. **Add a lint rule banning `$queryRawUnsafe` with string interpolation** (P4).
28. **Add tests** — there are zero unit tests in `src/`.

## Suggested roadmap for the next phase of development / خارطة طريق مقترحة

**Phase 1 — Stability (Week 1-2)**
* Fix F1, F2, F3, F5, F7, F8, F10.
* Add the `order_costs` view.
* Drop dead routes and pages.
* Add `installation_travel_days` migration.

**Phase 2 — Performance (Week 3-4)**
* Introduce Redis.
* Add the dashboard summary endpoint.
* Materialize `v_order_totals` and `v_journal_kpis`.
* Add pagination to all list endpoints.
* Move the inventory-deduction logic to a single trigger.

**Phase 3 — Hardening (Week 5-6)**
* Add CSRF + rate limiting.
* Tighten JWT secret loading (fail-fast if no env).
* Add branch scoping to all read routes.
* Add audit log coverage to all write routes.
* Add unit + integration tests for the financial calculations.

**Phase 4 — Scale (Week 7+)**
* Introduce a job queue for daily/monthly rollups.
* Move to multi-process (cluster) or migrate to a containerized horizontal scale.
* Add observability (OpenTelemetry, Sentry, log shipping).
* Introduce a `subscription` table and a `subscription_cycles` table if recurring billing is ever needed (currently nothing in the codebase models it).

---

# Appendix A — Quick Findings Index / فهرس النتائج

| # | Finding | Severity | Section |
|---|---|---|---|
| F1 | Running balance formula omits payouts | HIGH | Financial Audit |
| F2 | Two pages, two formulas for net | HIGH | Financial Audit |
| F3 | `order_total` is always `null` | HIGH | Financial Audit |
| F4 | Missing `order_costs` view | HIGH | Financial Audit |
| F5 | `line_total` may be null if DB is Prisma-shaped | HIGH | Financial Audit |
| F6 | `installation_travel_days` never stored | MED | Financial Audit |
| F7 | 3 formulas for inventory math, off-by-known | HIGH | Financial Audit |
| F8 | Journal summary endpoint returns 0 for prod data | HIGH | Financial Audit |
| F9 | Decimal → Number coercion loses precision | MED | Financial Audit |
| F10 | No branch scope on `journal` / `overhead` | HIGH | Financial Audit |
| F11 | Audit log missing on several write paths | MED | Financial Audit |
| F12 | Order detail re-fetches 4 endpoints twice | MED | Financial Audit |
| F13 | Orders list shows total = 0 for every order | HIGH | Financial Audit |
| F14 | `balance` = 0 - 0 = 0 (UX death) | HIGH | Financial Audit |
| F15 | `parent_order_id` cycle not validated | MED | Financial Audit |
| F16 | Date-time vs date timezone drift | LOW | Financial Audit |
| P1 | `limit=500` everywhere | HIGH | Performance |
| P2 | Client-side aggregation on hot pages | HIGH | Performance |
| P3 | 7 round-trips to open one order | HIGH | Performance |
| P4 | String-interpolated SQL | HIGH | Performance |
| P5 | Inventory column maintained by 2 mechanisms | HIGH | Performance |
| P6 | Audit log on request path | MED | Performance |
| P7 | Dashboard pulls 2500 rows | HIGH | Performance |
| P8 | N+1 in order material save | HIGH | Performance |
| P9 | Prisma + raw pg double pool | MED | Performance |
| P10 | Service worker stub with no implementation | LOW | Performance |
| S1 | Decimal(65,30) vs Decimal(12,2) | MED | Database |
| S2 | `order_total`/`installation_travel_days` orphans | MED | Database |
| S3 | `is_pass_through` is redundant with `entry_type` | MED | Database |
| S4 | `payment_method` 3 encodings | MED | Database |
| S5 | `accessory_types` and `material_types` overlap | LOW | Database |
| D1 | `/dashboard` is a redirect | LOW | Dead Code |
| D2 | `/inventory` 404s | LOW | Dead Code |
| D3 | `/journal/summary` unreachable | LOW | Dead Code |
| D4 | `/api/audit-log` unreachable | MED | Dead Code |
| D5 | `/api/budget` unreachable | MED | Dead Code |
| D6 | `/api/fix-inventory` should be a migration | MED | Dead Code |
| D7 | 5 unused `_*-wrapper.tsx` files | LOW | Dead Code |
| D8 | `accessory_types` table never used | LOW | Dead Code |
| D9 | 2.5MB chat-log file in repo | LOW | Dead Code |

---

**End of Report / نهاية التقرير**
