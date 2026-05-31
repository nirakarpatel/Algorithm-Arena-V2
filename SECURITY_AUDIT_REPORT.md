# Backend Security & API Design Audit Report

**Date**: May 31, 2026  
**Target**: Algorithm Arena Backend v2  
**Scope**: Authentication, Authorization, Input Validation, API Design, Data Handling, Concurrency

---

## Executive Summary

The backend demonstrates **solid foundational security practices** with several well-implemented security features (bcryptjs password hashing, JWT implementation, Zod validation, CORS, Helmet). However, **5 MEDIUM/HIGH severity issues** were identified that require attention, primarily around missing pagination, race conditions, and information disclosure.

---

## FINDINGS

### 1. Missing Default Pagination Limit on `getMySubmissions`

**Category**: API Design / Denial of Service  
**Severity**: MEDIUM  
**Location**: `/server/src/features/submissions/submission.controller.js:147-172`  
**Files Affected**: `submission.routes.js:29`

**Description**:
The `getMySubmissions` endpoint allows clients to fetch all submissions without a default limit:

```javascript
if (req.query.limit) {
  query = query.limit(Number(req.query.limit));
}
// No default limit if not provided
```

**Impact**:
- A user could fetch all their submissions (potentially thousands) in a single request
- Results in large memory consumption, slow database queries, and potential DoS
- Validator only enforces max of 100 when limit IS provided, but doesn't set a default

**Fix Recommendation**:
```javascript
// Add default limit of 50 if not provided
const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50;
query = query.limit(limit);
```

Or apply validator with default:
```javascript
const mySubmissionQuerySchema = {
  query: z.object({
    challengeId: z.string().length(24).optional(),
    status: z.enum(['Pending', 'Accepted', 'Rejected']).optional(),
    limit: z.coerce.number().int().positive().max(100).default(50), // Add default
  }),
};
```

---

### 2. Missing Pagination on `getClans` Endpoint

**Category**: API Design / Denial of Service  
**Severity**: MEDIUM  
**Location**: `/server/src/features/clans/clan.controller.js:129-144`  
**Files Affected**: `clan.routes.js:39`

**Description**:
The `getClans` endpoint retrieves all clans with no pagination or limits:

```javascript
const clans = await Clan.find(getClanStatusFilter(req.query.status))
  .populate('chief', 'username email')
  .populate('members', 'username email status codingLevel points')
  .populate('requests', 'username email')
  .populate('createdBy', 'username email')
  .populate('archivedBy', 'username email')
  .populate('restoredBy', 'username email')
  .sort({ createdAt: -1 });
  // NO LIMIT APPLIED
```

**Impact**:
- Could return millions of clan documents with fully populated member arrays
- No route validation for query parameters
- Massive memory spike and slow response times
- Potential DoS vector

**Fix Recommendation**:
```javascript
const page = Math.max(1, parseInt(req.query.page, 10) || 1);
const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
const skip = (page - 1) * limit;

const [clans, total] = await Promise.all([
  Clan.find(getClanStatusFilter(req.query.status))
    .populate(...)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit),
  Clan.countDocuments(getClanStatusFilter(req.query.status))
]);

return sendSuccess(res, {
  data: clans,
  meta: { page, limit, total, pages: Math.ceil(total / limit) }
});
```

---

### 3. Information Disclosure in Error Messages (Duplicate Key Errors)

**Category**: Information Disclosure  
**Severity**: MEDIUM  
**Location**: `/server/src/features/clans/clan.controller.js:317-327`, `369-376`

**Description**:
Error responses leak the exact duplicate value when creating/updating clans:

```javascript
if (err.code === 11000) {
  return res.status(400).json({
    success: false,
    message: `Clan with this ${field} already exists`,
    field: field,
    duplicateValue: err.keyValue?.[field],  // ← LEAKS EXISTING CLAN NAME/TAG
    debug: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}
```

**Impact**:
- Attackers can enumerate existing clan names and tags
- Enables targeted information gathering about the system
- Violates principle of least information disclosure

**Fix Recommendation**:
Remove the `duplicateValue` field from error responses:
```javascript
return res.status(400).json({
  success: false,
  message: `Clan with this ${field} already exists`,
  field: field,
  // Remove: duplicateValue: err.keyValue?.[field],
});
```

---

### 4. Race Condition in Concurrent Clan Mutations

**Category**: Concurrency / Race Condition  
**Severity**: MEDIUM  
**Location**: `/server/src/features/clans/clan.controller.js:288-315`, `341-380`, `505-544`

**Description**:
The archive/restore and join/leave operations have TOCTOU (time-of-check-time-of-use) vulnerabilities:

**Example - Archive Check**:
```javascript
const clan = await Clan.findById(req.params.id); // T1: Read clan
if (isClanArchived(clan)) {  // T2: Check status
  return res.status(400)...;
}
// T3: Between check and update, another request could modify
clan.status = 'archived';    // T4: Update
await clan.save({ session }); // T5: Save
```

If two concurrent requests occur:
- Request A checks `isClanArchived()` → false
- Request B checks `isClanArchived()` → false
- Both proceed to modify the clan
- Inconsistent state results

**Impact**:
- Clan can be mutated while being archived/restored
- Chief assignment can race with role reconciliation
- Members added/removed inconsistently in concurrent requests
- Possible data corruption in clan state

**Fix Recommendation**:
Use MongoDB `findByIdAndUpdate` with atomic operations:
```javascript
const updatedClan = await Clan.findByIdAndUpdate(
  req.params.id,
  {
    $set: { 
      status: 'archived',
      archivedAt: new Date(),
      archivedBy: req.user._id
    }
  },
  { 
    new: true,
    runValidators: true,
    // Add condition to only update if not already archived
  }
);

if (!updatedClan) {
  return res.status(400).json({ 
    success: false, 
    message: 'Clan is already archived' 
  });
}
```

Or enforce stricter transaction isolation:
```javascript
await session.withTransaction(async () => {
  const clan = await Clan.findById(req.params.id).session(session);
  if (isClanArchived(clan)) {
    throw new Error('Clan already archived');
  }
  // ... modifications ...
});
```

---

### 5. Race Condition in Chief Role Reconciliation

**Category**: Concurrency / Authorization Bypass  
**Severity**: MEDIUM  
**Location**: `/server/src/features/clans/clan.controller.js:592-667`

**Description**:
The `assignChief` and `removeMember` operations reconcile the chief role asynchronously:

```javascript
await assignChief(req, res, user, {
  $set: {
    role: 'clan-chief',
    clan: clan._id,
  }
});

// Async reconciliation called AFTER save
if (previousChiefId) {
  await reconcileChiefRoleForUser(previousChiefId, { session }); // NOT awaited in all paths
}
```

**Impact**:
- Old chief's role might not be downgraded if request fails after role is set
- New chief might lose role if concurrent remove happens
- User could be marked as chief of multiple clans temporarily
- Authorization checks might pass for invalid states

**Fix Recommendation**:
Ensure role reconciliation is atomic:
```javascript
const previousChief = clan.chief ? await User.findById(clan.chief) : null;
clan.chief = userId;
await clan.save({ session });

const newChief = await User.findById(userId).session(session);
newChief.role = 'clan-chief';
newChief.clan = clan._id;
await newChief.save({ session });

if (previousChief) {
  // Check if they're chief of any other clans
  const otherClanCount = await Clan.countDocuments({
    chief: previousChief._id,
    _id: { $ne: clan._id }
  }).session(session);
  
  if (otherClanCount === 0) {
    previousChief.role = 'user';
    await previousChief.save({ session });
  }
}
```

---

### 6. Unauthenticated Logout Endpoint

**Category**: API Design / Authorization  
**Severity**: LOW  
**Location**: `/server/src/features/auth/auth.routes.js:13`

**Description**:
The `/api/auth/logout` endpoint does NOT require authentication:

```javascript
router.post('/logout', logout);  // Missing 'protect' middleware
router.post('/logout-all', protect, logoutAll);  // This one requires auth
```

**Impact**:
- Inconsistent API design (logout requires auth, but logout doesn't)
- While the endpoint is safe (just clears a cookie), it's confusing
- Potential for user confusion about session state

**Fix Recommendation**:
Add authentication requirement for consistency:
```javascript
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);
```

Or document the intentional design decision if it's by design.

---

### 7. Missing Request Validation on `getClans` Query Parameters

**Category**: Input Validation / API Design  
**Severity**: LOW  
**Location**: `/server/src/features/clans/clan.routes.js:39`

**Description**:
The `getClans` endpoint has no route-level validation:

```javascript
router.get('/', protect, getClans);  // No validate middleware
```

The handler accepts `req.query.status` but doesn't validate it:
```javascript
const clans = await Clan.find(getClanStatusFilter(req.query.status))
```

**Impact**:
- Invalid status values are silently ignored (handled in `getClanStatusFilter`)
- No feedback to client about invalid parameters
- Could accept typos without warning

**Fix Recommendation**:
Add Zod schema validation:
```javascript
const clanListQuerySchema = {
  query: z.object({
    status: z.enum(['active', 'archived', 'all']).default('active'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
};

router.get('/', protect, validate(clanListQuerySchema), getClans);
```

---

## POSITIVE FINDINGS (Well Implemented)

### ✅ Strong Password Hashing
- **Location**: `/server/src/features/users/User.model.js:94-95`
- Uses `bcryptjs` with 10 salt rounds (industry standard)
- Password never returned by default (`select: false`)

### ✅ JWT Implementation
- **Location**: `/server/utils/tokens.js`
- Access tokens have 15-minute TTL
- Refresh tokens stored hashed in database
- Refresh tokens have 14-day TTL (configurable)
- Session ID included in token (preventing session fixation)

### ✅ CORS Protection
- **Location**: `/server/app.js:69-78`
- Strict origin whitelist enforced
- Credentials properly configured
- CSP headers via Helmet

### ✅ Input Validation
- **Location**: `/server/validators/`
- Comprehensive Zod schemas for all inputs
- ObjectId validation on resource IDs
- Enum validation on status/role fields
- URL validation on external links
- Max length enforcement

### ✅ Authorization Checks
- **Location**: `/server/src/features/clans/clanScope.service.js`
- Role-based access control implemented correctly
- Clan-scoped authorization for chiefs
- Global override for admins/moderators
- Submission access checks per-user and per-clan

### ✅ Request ID Validation
- **Location**: `/server/middleware/requestContext.js`
- Validates UUID format with regex
- Prevents log injection attacks
- Replaces invalid UUIDs with server-generated ones

### ✅ HTTP Security Headers
- **Location**: `/server/app.js:52-68`
- Helmet.js configured with:
  - CSP headers with safe directives
  - Frame ancestors blocked
  - Object sources disabled
  - Upgrade insecure requests

### ✅ Rate Limiting
- **Location**: `/server/app.js:85-103`
- Global API limiter: 200 req/15min (production)
- Auth endpoint limiter: 10 req/15min (production)
- Stricter limits for authentication endpoints

---

## SUMMARY TABLE

| # | Issue | Category | Severity | Location | Status |
|---|-------|----------|----------|----------|--------|
| 1 | Missing default pagination on `getMySubmissions` | DoS/API Design | MEDIUM | submission.controller.js:147 | ⚠️ OPEN |
| 2 | Missing pagination on `getClans` | DoS/API Design | MEDIUM | clan.controller.js:129 | ⚠️ OPEN |
| 3 | Duplicate value disclosure in errors | Information Disclosure | MEDIUM | clan.controller.js:317,369 | ⚠️ OPEN |
| 4 | Race condition in clan mutations | Concurrency | MEDIUM | clan.controller.js:288+ | ⚠️ OPEN |
| 5 | Race condition in chief reconciliation | Concurrency | MEDIUM | clan.controller.js:592+ | ⚠️ OPEN |
| 6 | Unauthenticated logout endpoint | API Design | LOW | auth.routes.js:13 | ⚠️ OPEN |
| 7 | Missing validation on getClans query | Input Validation | LOW | clan.routes.js:39 | ⚠️ OPEN |

---

## REMEDIATION PRIORITY

1. **Critical** (Address immediately):
   - Issue #4: Race conditions could corrupt data
   - Issue #2: Missing pagination enables DoS attacks

2. **High** (Address within 1 sprint):
   - Issue #1: Missing default limit
   - Issue #5: Role reconciliation race conditions
   - Issue #3: Information disclosure

3. **Medium** (Address within 2 sprints):
   - Issue #6: Logout endpoint consistency
   - Issue #7: Query parameter validation

---

## RECOMMENDATIONS

### Immediate Actions
1. Add default pagination limits to all query endpoints
2. Use atomic database operations for critical mutations
3. Remove `duplicateValue` from error responses
4. Implement request-level validation for all query parameters

### Near-term Improvements
1. Implement pessimistic locking for concurrent clan operations
2. Add comprehensive integration tests for race conditions
3. Document authorization patterns and enforced scopes
4. Add audit logging for sensitive operations

### Long-term Improvements
1. Consider implementing Event Sourcing for clan state changes
2. Add performance monitoring and alerting for slow queries
3. Implement request signing for sensitive operations
4. Regular security audit schedule (quarterly)

---

## Testing Recommendations

```bash
# Test DoS vulnerabilities
curl -X GET "http://localhost:5000/api/submissions/my-submissions" \
  -H "Authorization: Bearer <token>"
# Should return max 100 (or default 50) submissions

# Test race conditions (concurrent requests)
for i in {1..10}; do
  curl -X POST "http://localhost:5000/api/clans/:id/join" \
    -H "Authorization: Bearer <token>" &
done

# Test information disclosure
curl -X POST "http://localhost:5000/api/clans" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"ExistingClan","tag":"EC"}'
# Should NOT include duplicateValue field
```

---

**Report Generated**: May 31, 2026  
**Auditor**: Security Audit System
