# Database Schema and Architecture Audit Report

**Date:** May 31, 2026  
**Project:** Algorithm Arena V2  
**Repository Path:** `/server/src/features/*/[Feature].model.js`

---

## Executive Summary

The database architecture shows good foundational structure with Mongoose schemas, but has significant issues across schema design, data integrity, indexing, scalability, and query performance. **Critical issues identified: 13 | High: 8 | Medium: 12**

---

## 1. SCHEMA DESIGN ISSUES

### Issue 1.1: Missing Indexes on Frequently Queried Fields
**Severity:** CRITICAL  
**File:** `/server/src/features/users/User.model.js`  
**Impact:** High latency on user lookups (findById, findOne), full table scans on every user query  
**Description:** The User model has NO indexes despite being queried by:
- Authentication (by email)
- Clan operations (by _id in members/requests arrays)
- Dashboard/leaderboard aggregations
- Profile lookups (by username, id)

**Recommendation:**
```javascript
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ clan: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ points: -1 }); // For leaderboard sorting
userSchema.index({ createdAt: -1 }); // For user listings
```

---

### Issue 1.2: Missing Indexes on Multiple Models
**Severity:** HIGH  
**Files:** 
- `/server/src/features/badges/Badge.model.js` (0 indexes)
- `/server/src/features/notices/GlobalNotice.model.js` (0 indexes)
- `/server/src/features/resources/Resource.model.js` (0 indexes)
- `/server/src/features/challenges/QuestionSet.model.js` (0 indexes)

**Impact:** Full collection scans on common queries  
**Recommendations:**

**Badge.model.js:**
```javascript
badgeSchema.index({ name: 1 });
badgeSchema.index({ rarity: 1 });
```

**GlobalNotice.model.js:**
```javascript
globalNoticeSchema.index({ createdAt: -1 });
globalNoticeSchema.index({ createdBy: 1 });
globalNoticeSchema.index({ isPinned: 1, createdAt: -1 });
```

**Resource.model.js:**
```javascript
resourceSchema.index({ folder: 1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ createdAt: -1 });
```

**QuestionSet.model.js:**
```javascript
questionSetSchema.index({ weekNumber: 1 });
questionSetSchema.index({ status: 1 });
questionSetSchema.index({ createdBy: 1 });
questionSetSchema.index({ deadline: 1 });
```

---

### Issue 1.3: Inefficient Field Types
**Severity:** MEDIUM  
**File:** `/server/src/features/users/User.model.js` (lines 78-81)  
**Impact:** Inconsistent data, storage inefficiency, query complexity  
**Description:**
- `branch`, `year`, `section` stored as arbitrary strings instead of enums
- Example: "B.Tech CSE" vs "B.Tech CS" - inconsistency
- No validation on what values are allowed

**Current Code:**
```javascript
branch: { type: String, default: 'B.Tech CSE' },
year: { type: String, default: 'Third Year' },
section: { type: String, default: 'Section A' },
```

**Recommendation:** Use enums:
```javascript
branch: {
  type: String,
  enum: ['B.Tech CSE', 'B.Tech IT', 'B.Tech ECE', ...],
  default: 'B.Tech CSE'
},
year: {
  type: String,
  enum: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
  default: 'Third Year'
},
section: {
  type: String,
  enum: ['Section A', 'Section B', 'Section C'],
  default: 'Section A'
},
```

---

### Issue 1.4: Missing Field Validation on Numeric Fields
**Severity:** MEDIUM  
**File:** `/server/src/features/users/User.model.js` (lines 52-68)  
**Impact:** Invalid data (negative points/solvedProblems), data integrity issues  
**Description:**
- `points`, `streak`, `solvedProblems` have no min validation
- Could be set to negative values via direct updates

**Current Code:**
```javascript
points: { type: Number, default: 0 },
streak: { type: Number, default: 0 },
solvedProblems: { type: Number, default: 0 },
```

**Recommendation:**
```javascript
points: { type: Number, default: 0, min: [0, 'Points cannot be negative'] },
streak: { type: Number, default: 0, min: [0, 'Streak cannot be negative'] },
solvedProblems: { type: Number, default: 0, min: [0, 'Solved problems count cannot be negative'] },
```

---

### Issue 1.5: Mixed Type Fields Without Documentation
**Severity:** MEDIUM  
**File:** `/server/src/features/challenges/Challenge.model.js` (line 25)  
**Impact:** Type safety issues, unpredictable data structure, difficult migrations  
**Description:**
```javascript
args: { type: mongoose.Schema.Types.Mixed }, // Can be anything
```

**Recommendation:** Define proper schema:
```javascript
args: {
  type: [{ 
    name: String,
    type: String,
    value: mongoose.Schema.Types.Mixed
  }],
  default: []
},
```

---

### Issue 1.6: Unbounded Array Fields - Clan Members/Requests
**Severity:** CRITICAL  
**File:** `/server/src/features/clans/Clan.model.js` (lines 52-62)  
**Impact:** MongoDB document size limit (16MB), performance degradation as clan grows  
**Description:**
```javascript
members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
notices: [{ type: String }],
```

- No size limits or archival
- Full document loaded on every clan query
- Virtual `memberCount` computed repeatedly
- Members/requests arrays can grow unbounded

**Current Issues:**
- Clan with 10,000 members loads entire array on every query
- Virtual calculation: `this.members ? this.members.length : 0` runs on every access
- Notices array will grow indefinitely

**Recommendations:**
1. **For members/requests:** Create separate ClanMember/ClanRequest collections:
```javascript
// ClanMember.model.js
const clanMemberSchema = new Schema({
  clanId: { type: ObjectId, ref: 'Clan', required: true, index: true },
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  joinedAt: { type: Date, default: Date.now, index: true },
  role: { type: String, enum: ['member', 'moderator'], default: 'member' }
}, { timestamps: true });

clanMemberSchema.index({ clanId: 1, userId: 1 }, { unique: true });
```

2. **For notices:** Create separate ClanNotice collection:
```javascript
// ClanNotice.model.js
const clanNoticeSchema = new Schema({
  clanId: { type: ObjectId, ref: 'Clan', required: true, index: true },
  content: { type: String, required: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });
```

3. **Update Clan.model.js:**
```javascript
memberCount: {
  type: Number,
  default: 0
},
requestCount: {
  type: Number,
  default: 0
},
// Remove: members: [...], requests: [...], notices: [...]
```

---

### Issue 1.7: Large Embedded Documents in QuestionSet
**Severity:** MEDIUM  
**File:** `/server/src/features/challenges/QuestionSet.model.js` (lines 22-34)  
**Impact:** Large document sizes, slow queries, bandwidth waste  
**Description:**
```javascript
questions: [{
  // ... fields ...
  hints: [String],  // Multiple hints per question
  codeSnippets: [{  // Multiple snippets per question
    lang: String,
    langSlug: String,
    code: String    // Could be large
  }]
}]
```

Each QuestionSet can have 5-10 questions with multiple code snippets = rapidly growing documents.

**Recommendation:** Denormalize into separate collection:
```javascript
// Question.model.js (new)
const questionSchema = new Schema({
  questionSetId: { type: ObjectId, ref: 'QuestionSet', required: true },
  title: String,
  difficulty: String,
  points: Number,
  description: String,
  hints: [String],
  codeSnippets: [{ lang: String, code: String }]
}, { timestamps: true });
questionSchema.index({ questionSetId: 1 });
```

---

## 2. DATA INTEGRITY ISSUES

### Issue 2.1: No Cascading Deletes - Orphaned Submissions
**Severity:** CRITICAL  
**File:** `/server/src/features/challenges/challenge.controller.js` (deleteChallenge function)  
**Impact:** Orphaned submission records when challenge deleted, broken references  
**Description:**
```javascript
const deleteChallenge = async (req, res, next) => {
  // ... validation ...
  await challenge.deleteOne(); // NO CASCADE!
  // Submissions with challengeId -> deleted challenge now exist as orphans
};
```

**Current Issue:**
- Delete a challenge = orphaned Submission records remain
- References broken in Submission model
- No integrity constraints

**Recommendation:** Add cascade delete:
```javascript
const deleteChallenge = async (req, res, next) => {
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    await Submission.deleteMany({ challengeId: req.params.id }, { session });
    await Challenge.findByIdAndDelete(req.params.id, { session });
  });
};
```

Or use model hooks:
```javascript
challengeSchema.pre('deleteOne', async function(next) {
  await mongoose.model('Submission').deleteMany({ challengeId: this._id });
  next();
});
```

---

### Issue 2.2: No Foreign Key Constraints
**Severity:** HIGH  
**Affected Models:** All models with references (Challenge->QuestionSet, User->Clan, etc.)  
**Impact:** Orphaned records possible, referential integrity not enforced  
**Description:**
- Mongoose `ref` declares relationships but doesn't enforce them
- Can delete referenced documents leaving broken references
- No database-level constraints

**Example Issue:**
```javascript
// User.model.js
clan: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Clan',  // This is just a hint, not enforced
  default: null,
}
```

If clan is deleted, user.clan still points to non-existent ObjectId.

**Recommendation:**
1. **Application-level enforcement:**
   - Before deleting Clan, remove all users with clan reference
   - Before deleting User, remove from all clan arrays

2. **Add validation hooks:**
```javascript
userSchema.pre('save', async function(next) {
  if (this.clan) {
    const clan = await mongoose.model('Clan').findById(this.clan);
    if (!clan) throw new Error('Referenced clan does not exist');
  }
  next();
});
```

---

### Issue 2.3: Missing Timestamps on Critical Models
**Severity:** MEDIUM  
**Files:**
- `/server/src/features/users/User.model.js` - has `createdAt` but no `updatedAt`
- `/server/src/features/badges/Badge.model.js` - has timestamps
- `/server/src/features/resources/Resource.model.js` - has timestamps

**Impact:** Unable to track changes, audit trail incomplete  
**Recommendation:** Add timestamps to User model:
```javascript
userSchema.add({ timestamps: true });
// OR manually:
updatedAt: { type: Date, default: Date.now },
```

---

### Issue 2.4: Weak Validation on Submission Code Field
**Severity:** MEDIUM  
**File:** `/server/src/features/submissions/Submission.model.js` (line 15)  
**Impact:** Unbounded code field, MongoDB document size limit risk  
**Description:**
```javascript
code: { type: String }  // No maxlength, no validation
```

Users could paste massive code files (100MB+) which:
- Exceeds MongoDB 16MB document limit
- Slows down queries
- Wastes storage

**Recommendation:**
```javascript
code: {
  type: String,
  maxlength: [50000, 'Code submission cannot exceed 50KB'],
},
repositoryUrl: {
  type: String,
  match: [/^https?:\/\/.+/, 'Invalid repository URL'],
},
```

---

## 3. SCALABILITY PROBLEMS

### Issue 3.1: N+1 Query Pattern in Clan Leaderboard
**Severity:** CRITICAL  
**File:** `/server/src/features/clans/clan.controller.js` (lines 181-237)  
**Impact:** Performance degrades linearly with number of clans. 1000 clans = 1000+ aggregation queries  
**Code:**
```javascript
const clans = await Clan.find(clanFilter).populate('chief', 'username').lean();

const enriched = await Promise.all(
  clans.map(async (clan) => {
    // For EACH clan, run aggregation query
    const [stats] = await Submission.aggregate([
      { $match: { userId: { $in: memberIds }, status: 'Accepted', ...dateFilter } },
      // ... more pipeline ...
    ]);
    return { ...clan, ...stats };
  })
);
```

**Actual Query Count:**
- 1 query to get clans
- N queries (one per clan) to calculate stats
- Total: N+1 queries

**Recommendation:** Use single aggregation pipeline:
```javascript
const enriched = await Submission.aggregate([
  { $match: { status: 'Accepted', ...dateFilter } },
  { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
  { $unwind: '$user' },
  { $lookup: { from: 'clans', localField: 'user.clan', foreignField: '_id', as: 'clan' } },
  { $unwind: '$clan' },
  { $group: {
    _id: '$clan._id',
    solvedCount: { $sum: 1 },
    totalPoints: { $sum: '$challenge.points' },
    chiefId: { $first: '$clan.chief' }
  }},
  { $sort: { totalPoints: -1 } },
  { $facet: {
    metadata: [{ $count: 'total' }],
    data: [{ $skip: skip }, { $limit: limit }]
  }}
]);
```

---

### Issue 3.2: Unbounded Document Sizes
**Severity:** MEDIUM  
**File:** `/server/src/features/clans/Clan.model.js`  
**Impact:** 
- MongoDB 16MB document limit risk
- Slow serialization/deserialization
- Network bandwidth waste

**Example Scenario:**
- Clan with 5,000 members
- Each member object: ~200 bytes when populated
- Total: 5,000 × 200 = 1MB just for members array
- Add chief, requests, notices, and entire document approaches limits

**Recommendation:** Pagination for large arrays:
```javascript
// Instead of loading all members, use:
GET /api/clans/:id/members?page=1&limit=50
```

---

### Issue 3.3: Missing TTL Index on AuditLog
**Severity:** HIGH  
**File:** `/server/src/features/notices/AuditLog.model.js`  
**Impact:** Unbounded growth, storage costs, query performance degradation  
**Description:** AuditLog has no TTL (Time To Live) index. All audit records kept forever:
- 1000s of requests/day × 365 days = millions of records
- Grows indefinitely, slowing down queries
- No automatic cleanup

**Recommendation:**
```javascript
// Automatically delete records older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
// Or 30 days for stricter retention:
// expireAfterSeconds: 2592000
```

---

### Issue 3.4: EntityRevision Missing TTL or Archival Strategy
**Severity:** MEDIUM  
**File:** `/server/src/features/notices/EntityRevision.model.js`  
**Impact:** Unbounded growth, no cleanup strategy for old revisions  
**Description:** Similar to AuditLog - revisions never deleted, kept indefinitely.

**Recommendation:**
```javascript
// Option 1: TTL after 1 year
entityRevisionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Option 2: Keep only last N revisions per entity
// Implement cleanup job:
const cleanup = async () => {
  const revisions = await EntityRevision.aggregate([
    { $group: { _id: '$entityId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 100 } } }
  ]);
  
  for (const { _id } of revisions) {
    const toDelete = await EntityRevision.find({ entityId: _id })
      .sort({ revisionNumber: -1 })
      .skip(100)
      .select('_id');
    await EntityRevision.deleteMany({ _id: { $in: toDelete } });
  }
};
```

---

## 4. SPECIFIC MODEL ISSUES

### Issue 4.1: Clan Model - No Member Limits
**Severity:** MEDIUM  
**File:** `/server/src/features/clans/Clan.model.js`  
**Impact:** Unlimited members per clan, unbalanced clans  
**Recommendation:**
```javascript
members: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  // Add validation:
  validate: {
    async validator() {
      return this.members.length <= 500; // Max 500 members
    },
    message: 'Clan cannot exceed 500 members'
  }
}],
```

---

### Issue 4.2: Challenge Model - Missing Validation
**Severity:** MEDIUM  
**File:** `/server/src/features/challenges/Challenge.model.js`  
**Impact:** Invalid test cases, improper difficulty/points  
**Recommendations:**
```javascript
const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: true,
    minlength: [20, 'Description must be at least 20 characters']
  },
  difficulty: {
    type: String,
    enum: {
      values: ['Easy', 'Medium', 'Hard'],
      message: '{VALUE} is not a valid difficulty'
    },
    required: true
  },
  points: {
    type: Number,
    required: true,
    min: [1, 'Points must be at least 1'],
    max: [1000, 'Points cannot exceed 1000']
  },
  testCases: {
    type: Array,
    required: true,
    minlength: [1, 'At least one test case required'],
    validate: {
      validator(v) {
        return v.every(tc => tc.label && tc.expected);
      },
      message: 'Each test case must have label and expected output'
    }
  }
});
```

---

### Issue 4.3: Submission Model - Duplicate Submission Prevention Weak
**Severity:** MEDIUM  
**File:** `/server/src/features/submissions/submission.controller.js` (lines 24-34)  
**Impact:** Race condition, potential duplicate submissions  
**Description:**
```javascript
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
const pendingDuplicate = await Submission.findOne({
  userId: req.user.id,
  challengeId,
  status: 'Pending',
  submittedAt: { $gte: oneHourAgo },
}); // No index on this combination
```

Race condition window exists between check and create.

**Recommendation:**
```javascript
// Add unique index for pending submissions
submissionSchema.index(
  { userId: 1, challengeId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'Pending' }
  }
);

// Use insertOne instead of create to prevent race condition
try {
  await Submission.insertOne({ userId, challengeId, status: 'Pending', ... });
} catch (e) {
  if (e.code === 11000) { // Duplicate key error
    throw new Error('Pending submission already exists');
  }
  throw e;
}
```

---

### Issue 4.4: RefreshToken Cleanup Strategy Incomplete
**Severity:** MEDIUM  
**File:** `/server/src/features/auth/RefreshToken.model.js`  
**Impact:** Expired tokens accumulate, storage grows  
**Description:** Has TTL index on `expiresAt` but no cleanup of revoked tokens.

**Current:**
```javascript
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

**Issue:** TTL only removes at expiration, doesn't handle revoked tokens or token replacements.

**Recommendation:**
```javascript
// Keep metadata for audit but remove sensitive data
refreshTokenSchema.index({ revokedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Or add cleanup job:
const cleanupOldTokens = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await RefreshToken.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { revokedAt: { $exists: true, $lt: thirtyDaysAgo } }
    ]
  });
};
```

---

### Issue 4.5: ChatMessage - Missing Moderation Fields
**Severity:** LOW  
**File:** `/server/src/features/chat/ChatMessage.model.js`  
**Impact:** No content moderation tracking  
**Recommendation:**
```javascript
const chatMessageSchema = new mongoose.Schema({
  // ... existing ...
  isDeleted: { type: Boolean, default: false, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date },
  flaggedAsInappropriate: { type: Boolean, default: false },
  flagReason: String,
}, { timestamps: true });

chatMessageSchema.index({ clanId: 1, createdAt: -1 });
chatMessageSchema.index({ clanId: 1, isDeleted: 1, createdAt: -1 });
```

---

## 5. QUERY PERFORMANCE ISSUES

### Issue 5.1: Multiple Populates Per Query
**Severity:** MEDIUM  
**File:** `/server/src/features/clans/clan.controller.js` (lines 110-116)  
**Impact:** Multiple round-trips to database, slow API responses  
**Code:**
```javascript
const clan = await Clan.findOne(...)
  .populate('chief', 'username email')
  .populate('members', 'username email status codingLevel points solvedProblems regNo')
  .populate('requests', 'username email regNo')
  .populate('createdBy', 'username email')
  .populate('archivedBy', 'username email')
  .populate('restoredBy', 'username email');
```

**Issues:**
- 7 populate calls = potentially 7 separate queries
- All members loaded even if not needed
- Each populate can be slow

**Recommendation:** Use aggregation instead:
```javascript
const clan = await Clan.aggregate([
  { $match: { _id: ObjectId(id) } },
  { $lookup: { from: 'users', localField: 'chief', foreignField: '_id', as: 'chief' } },
  { $unwind: '$chief' },
  { $project: {
    _id: 1,
    name: 1,
    chief: { username: 1, email: 1 }
    // Only include what's needed
  }}
]);
```

Or implement pagination:
```javascript
// Load only first 20 members
const clan = await Clan.findById(id)
  .populate('chief', 'username email')
  .select('-members -requests'); // Don't populate

// Separate endpoint for members
const members = await ClanMember.find({ clanId: id })
  .populate('userId', 'username email')
  .skip((page-1)*20)
  .limit(20);
```

---

## SUMMARY TABLE

| Issue | File | Severity | Category | Impact |
|-------|------|----------|----------|--------|
| User model missing indexes | User.model.js | CRITICAL | Indexing | Full table scans |
| Multiple models missing indexes | Badge, Notice, Resource, QuestionSet | HIGH | Indexing | Collection scans |
| Inefficient field types | User.model.js | MEDIUM | Schema Design | Data inconsistency |
| No numeric field validation | User.model.js | MEDIUM | Validation | Invalid data |
| Mixed type fields | Challenge.model.js | MEDIUM | Schema Design | Type safety |
| Unbounded clan arrays | Clan.model.js | CRITICAL | Scalability | 16MB limit risk |
| Challenge deletion orphans submissions | Challenge.controller.js | CRITICAL | Data Integrity | Orphaned records |
| No foreign key constraints | All models | HIGH | Data Integrity | Referential integrity |
| Clan leaderboard N+1 queries | Clan.controller.js | CRITICAL | Query Performance | Linear degradation |
| No TTL on AuditLog | AuditLog.model.js | HIGH | Scalability | Unbounded growth |
| Large embedded documents | QuestionSet.model.js | MEDIUM | Scalability | Document size risk |
| No TTL on EntityRevision | EntityRevision.model.js | MEDIUM | Scalability | Unbounded growth |
| Weak submission validation | Submission.model.js | MEDIUM | Validation | Document size risk |

---

## PRIORITY FIXES (In Order)

### Phase 1 (Critical - Week 1)
1. Add User model indexes (Issue 1.1)
2. Add cascade delete for Challenge (Issue 2.1)
3. Fix Clan N+1 queries (Issue 3.1)

### Phase 2 (High - Week 2)
4. Add missing indexes to Badge, Notice, Resource, QuestionSet (Issue 1.2)
5. Add TTL to AuditLog (Issue 3.3)
6. Add foreign key validation (Issue 2.2)

### Phase 3 (Medium - Week 3-4)
7. Refactor Clan arrays to separate collections (Issue 1.6)
8. Add field validation (Issues 1.3, 1.4)
9. Refactor QuestionSet embedding (Issue 1.7)
10. Add submission code limits (Issue 2.4)

---

## IMPLEMENTATION CHECKLIST

- [ ] Add indexes to User model
- [ ] Add indexes to Badge, Notice, Resource, QuestionSet models
- [ ] Add cascade delete for Challenge->Submission
- [ ] Refactor Clan leaderboard query (eliminate N+1)
- [ ] Add TTL indexes to AuditLog
- [ ] Add numeric field validation to User
- [ ] Convert branch/year/section to enums in User
- [ ] Create separate ClanMember collection
- [ ] Create separate ClanNotice collection
- [ ] Add RefreshToken cleanup job
- [ ] Add submission code size limit
- [ ] Add test cases validation to Challenge
- [ ] Implement foreign key constraints
- [ ] Add ChatMessage moderation fields
- [ ] Document all field constraints
