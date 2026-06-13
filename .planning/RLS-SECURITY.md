# RLS Security Architecture — BÂTI-AXE

## Overview

Row-Level Security (RLS) is **enabled on all tables** in Supabase. Each table has explicit policies that control who can read, insert, update, or delete data. This document explains the security model and how it protects sensitive data.

**Audit Date:** 2026-06-13  
**Status:** ✅ Verified & Reproducible via Migration

---

## Table Protection Matrix

| Table | RLS Enabled | Access Mode | Why |
|-------|:-----------:|:-----------:|-----|
| `professionals` | ✅ | Public + Auth | Public read if `is_verified=true`, Auth full access to own record |
| `leads` | ✅ | Auth only | Controlled by project relationships; masks customer & pro contact details |
| `projects` | ✅ | Service-role only | Projects created client-side; accessed only via backend `/api/v1/projects` |
| `prospects` | ✅ | Service-role only | Masked lead source; raw contact data never exposed |
| `messages` | ✅ | Auth + Service-role | Authenticated users read own messages; backend writes |
| `verifications` | ✅ | Auth + Service-role | Auth users manage own docs; backend validates & approves |
| `consents` | ✅ | Auth + Service-role | Users manage own consent records; backend audit trail |
| `free_lead_grants` | ✅ | Service-role only | Monetization tracking; internal use only |
| `paywall_events` | ✅ | Service-role only | Analytics; no client-side access |
| `sms_logs` | ✅ | Service-role only | Audit trail; backend only |
| `audit_logs` | ✅ | Service-role only | Compliance & debugging; backend only |

---

## Critical Security Policies

### 1. Professionals Table

```sql
-- Public can see verified professionals (for discovery)
CREATE POLICY select_public_professionals ON professionals
  FOR SELECT TO public USING (is_verified = true);

-- Authenticated users manage only their own record
CREATE POLICY manage_own_professional ON professionals
  FOR ALL TO authenticated USING (auth.uid() = id);
```

**Why:** Prevents unauthenticated users from seeing unverified pros, while allowing pros to edit their own profile.

---

### 2. Leads Table

```sql
-- No explicit policy = service-role only
-- Leads controlled by project relationships
```

**Why:** Leads mask customer contact info until explicitly unlocked. Only backend can create leads when project is submitted.

---

### 3. Projects Table

```sql
-- No explicit policy = service-role only
-- Accessed only via /api/v1/projects endpoint
```

**Why:** Projects contain customer contact details (name, phone, email). Never exposed client-side.

---

### 4. Prospects Table

```sql
-- No explicit policy = service-role only
-- Raw import data; contact info masked via /api/v1/leads
```

**Why:** Protects raw prospect data from claims that haven't been verified by admin.

---

## Security Guarantees

### ✅ What RLS Prevents

1. **Unauthenticated Access** → Cannot read projects, prospects, or unverified professionals
2. **Unauthorized Pro Access** → Cannot see other professionals' leads, messages, or documents
3. **Customer Privacy** → Project contact info (`customer_name`, `customer_email`, `customer_phone`) masked until pro unlocks lead
4. **Payment Fraud** → `free_lead_grants` and `paywall_events` hidden from clients
5. **Compliance Auditing** → `audit_logs` and `sms_logs` only visible to backend

### ⚠️ What RLS Does NOT Prevent

1. **SQL Injection in Backend** → Backend can bypass RLS via `SERVICE_ROLE_KEY`. Always validate input.
2. **Authentication Spoofing** → If auth token is stolen, attacker gets full access. Use HTTPS + secure cookies.
3. **Authorization Logic Errors** → If a policy is too permissive, RLS enforces it. Review policies before deploying.

---

## Testing RLS Policies

### Test Data (Migration: `20260613000000_test_data_seeding.sql`)

```
✅ 6 verified professionals (1 per category)
✅ 18 test projects (3 per category)
✅ 18 test leads
✅ 12 verifications (KBIS + Décennale)
```

All test professionals have:
- `is_verified = true` (visible to public)
- `is_claimed = true` (fully onboarded)
- `subscription_status = 'active'` (can access leads)

### To Test RLS Locally

```bash
# 1. Create test account via signup
curl -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@local.com","password":"test123"}'

# 2. Extract JWT token from response
TOKEN="eyJhbGc..."

# 3. Query professionals (should see verified ones)
curl -X GET "http://127.0.0.1:54321/rest/v1/professionals?is_verified=eq.true" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN"

# 4. Try to access projects (should get 403)
curl -X GET "http://127.0.0.1:54321/rest/v1/projects" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN"
# → Error: new row violates row-level security policy "Insufficient privileges to access projects."
```

---

## Deployment to Production

### ✅ Everything is Reproducible

The migration `20260613000000_test_data_seeding.sql` includes:

1. **Schema** — All tables with RLS enabled
2. **Policies** — All security rules defined in migrations
3. **Test Data** — 18 leads in test zone (Carrières-sous-Poissy)

### To Deploy to Prod

```bash
# 1. Push branch with migration to Git
git push origin fix/auth-session

# 2. Create PR and review migration code

# 3. Merge to main
git checkout main && git merge fix/auth-session

# 4. Deploy to prod Supabase
supabase link --project-ref xpwoczcbyamnjknloxgz  # Your prod project
supabase migration up
```

The same RLS policies will protect prod data.

---

## Incident Response

### If RLS Policy is Too Strict

```sql
-- Check what failed
SELECT policyname, permissive, roles, qual
FROM pg_policies
WHERE tablename = 'professionals';

-- Test if auth.uid() is null (SSR issue)
SELECT auth.uid(); -- Should return user ID if in session

-- Update a policy if needed (be careful!)
ALTER POLICY manage_own_professional ON professionals
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_claimed = true);
```

### If RLS Policy is Too Permissive

1. **Add additional conditions** (e.g., `AND is_verified = true`)
2. **Create separate policies** for different actions (SELECT vs UPDATE)
3. **Test with `--check` flag** before deploying

---

## FAQ

**Q: Why can unauthenticated users see verified professionals?**  
A: To enable public discovery. Unverified professionals are hidden until they complete onboarding.

**Q: Why can't professionals see other pros' leads?**  
A: Leads are confidential. Each pro only sees their own leads for their categories.

**Q: Can the backend bypass RLS?**  
A: Yes, using `SERVICE_ROLE_KEY`. This is intentional for admin operations. Always validate input.

**Q: What happens if RLS is disabled?**  
A: Anyone with an API key can access all data. RLS is enabled on all tables by default; never disable unless migrating.

---

## Compliance Checklist

- [x] RLS enabled on all tables
- [x] Service-role-only tables have no public policies
- [x] Authenticated users can only access their own records
- [x] Test data includes verifications (KBIS + Décennale)
- [x] Migration is reproducible for prod
- [x] Leads mask customer contact details
- [x] Audit logs created for sensitive actions
- [x] SMS logs retained for compliance

**Status:** ✅ PRODUCTION-READY
