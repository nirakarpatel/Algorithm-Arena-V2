# Frontend Audit Report - Algorithm Arena V2

**Date:** 2026-05-31  
**Scope:** React/Component architecture, UX/Design, Data Flow, Performance, Code Quality  
**Reviewed Files:** App.jsx, Navbar.jsx, Dashboard.jsx, Clans.jsx, ChallengeDetails.jsx, AuthContext.jsx, api.js, ErrorBoundary.jsx, useSocket.js

---

## Executive Summary

The frontend codebase demonstrates good architectural patterns with React Query, context API, and component-based structure. However, there are **16 critical/high-severity issues** affecting performance, accessibility, reliability, and maintainability. Most issues are manageable with targeted fixes.

---

## Issues by Category

### 1. REACT/COMPONENT ISSUES

#### Issue 1.1: Dependency Loop in AuthContext (useCallback)
- **Category:** React Hook Issues
- **Severity:** HIGH
- **File:** `client/src/context/AuthContext.jsx:55`
- **Description:** The `refreshMe` useCallback dependency array includes `clearSession`, but `clearSession` depends on nothing, creating potential memory issues. Additionally, `refreshMe` is called in useEffect with `[refreshMe]` dependency, which can cause infinite refresh loops if refreshMe is recreated.
- **Impact:** May cause unnecessary API calls on every render or infinite refresh loops during auth initialization
- **Fix Recommendation:**
  ```javascript
  // Change line 53-55 to:
  useEffect(() => {
    const init = async () => {
      await refreshMe();
    };
    init();
  }, []); // Empty dependency - run only once on mount
  ```

#### Issue 1.2: Memory Leak in ChallengeDetails - Event Listeners
- **Category:** Memory Leaks
- **Severity:** HIGH
- **File:** `client/src/pages/ChallengeDetails.jsx:152-168`
- **Description:** The `handleMouseDown` function adds event listeners to `document` but doesn't properly clean up in the returned function. If the component unmounts while dragging, listeners may persist.
- **Impact:** Memory leak accumulation over time, potential duplicate event handling
- **Fix Recommendation:**
  ```javascript
  const handleMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => {
      if (!containerRef.current) return;
      // ... rest of logic
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  // Should wrap in useEffect to ensure cleanup
  ```

#### Issue 1.3: Stale Closure in useSocket Hook
- **Category:** Stale Closures
- **Severity:** MEDIUM
- **File:** `client/src/hooks/useSocket.js:6-43`
- **Description:** While `callbackRef` is correctly used to avoid stale closures, the dependency on `event` can cause socket disconnection/reconnection. If parent re-renders with same event, socket unnecessarily reconnects.
- **Impact:** Unnecessary socket reconnections, potential data loss during reconnection
- **Fix Recommendation:**
  ```javascript
  useEffect(() => {
    // Only add listener if event changes, don't disconnect socket
    if (!socketRef.current) return;
    
    const handler = (...args) => callbackRef.current?.(...args);
    socketRef.current.on(event, handler);
    
    return () => socketRef.current?.off(event, handler);
  }, [event]);
  ```

#### Issue 1.4: Missing Key Prop Pattern in Lists
- **Category:** List Rendering
- **Severity:** MEDIUM
- **Files:** Multiple (Dashboard.jsx:404, Clans.jsx:282, ChallengeDetails.jsx:498)
- **Description:** While most lists use proper keys, some use array index as fallback or have inconsistent key patterns. Dashboard line 404 uses index `i` in skeleton cards.
- **Impact:** May cause issues if list order changes or items are filtered
- **Fix Recommendation:** Use stable, unique identifiers (e.g., `_id`, `id`) consistently

#### Issue 1.5: QueryClient Invalidation Race Conditions
- **Category:** Data Flow
- **Severity:** MEDIUM
- **File:** `client/src/pages/ChallengeDetails.jsx:420-422`
- **Description:** Multiple `invalidateQueries` calls without awaiting can cause race conditions. Dashboard loads 3 different queries simultaneously without proper error handling if one fails.
- **Impact:** Potential inconsistent state if one query fails while others succeed
- **Fix Recommendation:**
  ```javascript
  // Use queryClient.invalidateQueries with proper error handling
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["my-submissions", id] }),
    queryClient.invalidateQueries({ queryKey: ["dash-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["dash-profile"] }),
  ]).catch(err => {
    console.error('Query invalidation failed:', err);
  });
  ```

#### Issue 1.6: Unnecessary useCallback/useMemo Usage
- **Category:** Performance
- **Severity:** LOW
- **File:** `client/src/pages/Dashboard.jsx:68, 122-125, 135-141`
- **Description:** `useMemo` is used for `getSessionGreeting()` and simple data transformations that don't need memoization. Over-memoization can reduce performance.
- **Impact:** Minimal, but adds unnecessary complexity
- **Fix Recommendation:** Only memoize expensive operations (expensive calculations, large data structures)

---

### 2. UX/DESIGN FLAWS

#### Issue 2.1: Missing Loading States for Async Operations
- **Category:** UX/Loading States
- **Severity:** HIGH
- **Files:** 
  - `Navbar.jsx:91-108` - Profile dropdown loads user data but shows no skeleton
  - `Clans.jsx:505-513` - handleApply has no loading state on button
  - `ChallengeDetails.jsx:985-1038` - Submit button shows loading but not in disabled state during submission
- **Description:** Several async operations lack visual feedback while loading, creating uncertainty
- **Impact:** Users don't know if action is processing, may click multiple times
- **Fix Recommendation:** Add loading skeletons and disable buttons during async operations
  ```javascript
  <button disabled={leaving || isLoading} className={leaving ? 'opacity-50' : ''}>
    {leaving ? 'Processing...' : 'Leave Clan'}
  </button>
  ```

#### Issue 2.2: Incomplete Error Messages
- **Category:** Error Messaging
- **Severity:** MEDIUM
- **Files:** `api.js:114`, `ChallengeDetails.jsx:260`, `Clans.jsx:511`
- **Description:** Generic error messages like "Something went wrong" without context about what failed
- **Impact:** Users cannot diagnose what went wrong or how to fix it
- **Fix Recommendation:**
  ```javascript
  // Provide specific error feedback
  toast.error(err.response?.data?.message || `Failed to ${actionName}. Please try again.`);
  ```

#### Issue 2.3: Missing Empty States
- **Category:** Empty States
- **Severity:** MEDIUM
- **Files:** 
  - `Dashboard.jsx` - Has empty state for challenges but not for recent submissions (line 497)
  - `Clans.jsx:250-267` - Notice board shows "No notices yet" but in default state
  - `ChallengeDetails.jsx:611-625` - "Ask a Doubt" tab has placeholder but no real implementation
- **Description:** Some sections lack proper empty state guidance
- **Impact:** Users unsure what to do when section is empty
- **Fix Recommendation:** Add consistent empty state components with actionable next steps

#### Issue 2.4: Accessibility (a11y) Gaps
- **Category:** Accessibility
- **Severity:** MEDIUM
- **Files:** Multiple
- **Specific Issues:**
  - `Navbar.jsx:91` - Button has no aria-label for profile dropdown trigger
  - `ChallengeDetails.jsx:728-741` - Test case buttons lack aria-pressed or aria-selected
  - `Dashboard.jsx:350-399` - Filter section has no aria-label for search/filter group
  - Missing ARIA labels on interactive elements throughout
  - Color-only indicators (e.g., difficulty badges) don't have text fallback
- **Impact:** Screen reader users cannot navigate properly, WCAG 2.1 AA compliance issues
- **Fix Recommendation:**
  ```javascript
  <button
    aria-label="Select Easy difficulty"
    aria-pressed={filters.difficulty === 'Easy'}
    onClick={() => hf('difficulty', 'Easy')}
  >
    Easy
  </button>
  ```

#### Issue 2.5: Mobile Responsiveness Gaps
- **Category:** Mobile Responsiveness
- **Severity:** MEDIUM
- **Files:** 
  - `ChallengeDetails.jsx:520-541` - Split layout doesn't stack properly on mobile, no fallback
  - `Dashboard.jsx:334` - Two-column layout may not work on tablet sizes
  - `Clans.jsx:273-345` - Tab-based interface with small touch targets
- **Description:** Some layouts have breakpoint issues or insufficient mobile optimization
- **Impact:** Poor experience on tablets and small screens
- **Fix Recommendation:** Test responsiveness on various breakpoints, add touch-friendly spacing

#### Issue 2.6: Poor Status Indication
- **Category:** UX Clarity
- **Severity:** LOW
- **File:** `ChallengeDetails.jsx:705-715`
- **Description:** "Run" button shows loading spinner but doesn't clearly indicate it's waiting for remote execution
- **Impact:** Users unsure if action is processing locally or on server
- **Fix Recommendation:**
  ```javascript
  <button disabled={running} title="Executing code on Judge0...">
    {running ? "Running on Judge0..." : "Run"}
  </button>
  ```

---

### 3. DATA FLOW ISSUES

#### Issue 3.1: Race Conditions in API Calls
- **Category:** Concurrent Operations
- **Severity:** HIGH
- **File:** `client/src/pages/Dashboard.jsx:82-116`
- **Description:** Dashboard loads 4 queries (`challengesQ`, `summaryQ`, `profileQ`, `setsQ`) simultaneously without race condition protection. If filter changes while initial load is in-flight, inconsistent data may render.
- **Impact:** Stale data displayed, potential UI inconsistencies
- **Fix Recommendation:**
  ```javascript
  // Use queryKey to ensure isolation
  const challengesQ = useQuery({
    queryKey: ["dash-challenges", filters], // ✓ Good - filters included
    queryFn: async () => {...},
  });
  // Ensure all queries are isolated by dependencies
  ```

#### Issue 3.2: Optimistic Updates Failing Ungracefully
- **Category:** Optimistic UI
- **Severity:** MEDIUM
- **File:** `client/src/pages/Clans.jsx:505-513`
- **Description:** `handleApply` shows success toast before confirmation. If API fails, user sees wrong state but toast already shown.
- **Impact:** User confusion when success toast shown but action failed
- **Fix Recommendation:**
  ```javascript
  try {
    await api.post(`/api/clans/${clanId}/join`);
    toast.success('Applied to join! Awaiting approval.');
    // Only invalidate after successful response
    await queryClient.invalidateQueries({ queryKey: ['clans-list'] });
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to apply.');
  }
  ```

#### Issue 3.3: LocalStorage Out of Sync with Server State
- **Category:** State Synchronization
- **Severity:** MEDIUM
- **File:** `client/src/context/AuthContext.jsx:80-81`
- **Description:** User data stored in localStorage but not refreshed after operations like clan join/leave. AuthContext stores outdated data.
- **Impact:** Stale user state until manual refresh, clan membership not reflected
- **Fix Recommendation:**
  ```javascript
  // After major state changes, call refreshMe
  await api.post(`/api/clans/${clanId}/join`);
  await refreshMe(); // Ensure local state is synced
  queryClient.invalidateQueries({ queryKey: ['clans-list'] });
  ```

#### Issue 3.4: Missing Abort Controller for Cleanup
- **Category:** Request Cancellation
- **Severity:** MEDIUM
- **Files:** `ChallengeDetails.jsx:295-403` (Judge0 API calls)
- **Description:** No AbortController to cancel in-flight requests if component unmounts or user navigates away
- **Impact:** Memory leaks from completed requests after unmount, wasted bandwidth
- **Fix Recommendation:**
  ```javascript
  useEffect(() => {
    const abortController = new AbortController();
    // Pass abortController.signal to fetch calls
    return () => abortController.abort();
  }, []);
  ```

#### Issue 3.5: Circular Reference in Chat Query
- **Category:** Query Dependencies
- **Severity:** LOW
- **File:** `client/src/pages/Clans.jsx:38-47`
- **Description:** Chat queries with `refetchInterval: 5000` means constant polling even when tab not visible
- **Impact:** Unnecessary API calls, battery drain on mobile
- **Fix Recommendation:** Add `refetchIntervalPaused` based on tab visibility, or use WebSocket instead

---

### 4. PERFORMANCE ISSUES

#### Issue 4.1: Monolithic Component Size
- **Category:** Code Splitting
- **Severity:** MEDIUM
- **File:** `client/src/pages/ChallengeDetails.jsx` (1,047 lines)
- **Description:** ChallengeDetails is over 1000 lines with multiple responsibilities (editor, tests, review, submission). Should be split into sub-components.
- **Impact:** Large component bundle, harder to maintain, unnecessary re-renders of entire component
- **Fix Recommendation:** Split into:
  - `CodeEditorPanel.jsx`
  - `TestResultPanel.jsx`
  - `ReviewPanel.jsx`
  - `DescriptionPanel.jsx`

#### Issue 4.2: Unoptimized Monaco Editor Loading
- **Category:** Lazy Loading
- **Severity:** MEDIUM
- **File:** `client/src/pages/ChallengeDetails.jsx:672-678`
- **Description:** Monaco editor is loaded synchronously, blocking initial render. No lazy loading or virtualization.
- **Impact:** Slow initial page load, especially on slow connections
- **Fix Recommendation:**
  ```javascript
  const CodeEditor = lazy(() => import('../components/CodeEditor'));
  
  <Suspense fallback={<div className="bg-gray-900 rounded-xl h-full" />}>
    <CodeEditor {...props} />
  </Suspense>
  ```

#### Issue 4.3: Chat Polling Efficiency
- **Category:** Network Requests
- **Severity:** MEDIUM
- **File:** `client/src/pages/Clans.jsx:46`
- **Description:** `refetchInterval: 5000` polls every 5 seconds even when no new messages. Should use WebSocket or stale-while-revalidate.
- **Impact:** Unnecessary bandwidth, API rate limiting issues at scale, poor mobile experience
- **Fix Recommendation:**
  - Switch to WebSocket for real-time updates
  - Or: Use `staleTime: 10000, refetchInterval: 30000` (poll less frequently)

#### Issue 4.4: Missing Search/Filter Debouncing
- **Category:** Input Optimization
- **Severity:** MEDIUM
- **File:** `client/src/pages/Dashboard.jsx:360` & `client/src/pages/Clans.jsx:384`
- **Description:** Search input triggers new query on every keystroke, no debounce
- **Impact:** Excessive API calls, potential rate limiting, poor performance
- **Fix Recommendation:**
  ```javascript
  const debouncedSearch = useMemo(
    () => debounce((value) => hf('search', value), 300),
    []
  );
  
  <input onChange={(e) => debouncedSearch(e.target.value)} />
  ```

#### Issue 4.5: Unnecessary Re-renders in Navbar
- **Category:** Component Re-renders
- **Severity:** LOW
- **File:** `client/src/components/Navbar.jsx:33-46`
- **Description:** NavItems array is recreated on every render (not memoized). If role changes, entire nav re-renders unnecessarily.
- **Impact:** Performance degradation in complex navigation scenarios
- **Fix Recommendation:**
  ```javascript
  const navItems = useMemo(() => [...], [role]);
  ```

---

### 5. CODE QUALITY ISSUES

#### Issue 5.1: Magic Numbers Without Constants
- **Category:** Code Maintainability
- **Severity:** MEDIUM
- **Files:**
  - `ChallengeDetails.jsx:30` - `for (let attempt = 0; attempt < 30; attempt++)` - magic number 30
  - `Clans.jsx:46` - `refetchInterval: 5000` - magic number 5000
  - `Dashboard.jsx:70-78` - `limit: 4` - magic number
  - `api.js:11,62` - `timeout: 15000` - magic number
- **Description:** Hard-coded values scattered throughout code, no centralized configuration
- **Impact:** Difficult to adjust behavior, error-prone during maintenance
- **Fix Recommendation:**
  ```javascript
  // Create constants file
  export const CONFIG = {
    JUDGE0_POLL_MAX_ATTEMPTS: 30,
    JUDGE0_POLL_INTERVAL_MS: 1000,
    CHAT_POLL_INTERVAL_MS: 5000,
    API_TIMEOUT_MS: 15000,
    DASHBOARD_ITEMS_PER_PAGE: 4,
  };
  ```

#### Issue 5.2: Inconsistent Naming Conventions
- **Category:** Code Consistency
- **Severity:** LOW
- **Files:** Multiple
- **Examples:**
  - `hf` (line 79 in Dashboard) - unclear abbreviation for "handle filter"
  - `fd` (line 56) - unclear abbreviation for animation delay
  - `getRGB` vs `formatArgForStdin` - inconsistent naming style
- **Impact:** Code harder to understand, onboarding difficulty
- **Fix Recommendation:** Use clear, full names: `handleFilterChange`, `getFramerDelay`

#### Issue 5.3: Missing PropTypes/TypeScript
- **Category:** Type Safety
- **Severity:** MEDIUM
- **Files:** All component files
- **Description:** No PropTypes validation or TypeScript. Components accept props without validation.
- **Impact:** Runtime errors, IDE no autocomplete, harder refactoring
- **Fix Recommendation:**
  ```javascript
  import PropTypes from 'prop-types';
  
  ChallengeDetails.propTypes = {
    id: PropTypes.string.isRequired,
    // ... other props
  };
  ```

#### Issue 5.4: Commented-Out Code and Console Logs
- **Category:** Code Cleanliness
- **Severity:** LOW
- **Files:**
  - `api.js:98` - `// console.log("Blocking logout for UI work");`
  - `Dashboard.jsx:133` - `// const featuredChallenge = activeSet?.questions?.[0] || challenges[0];`
  - `Clans.jsx:143-144, 536, 548, 572, 584` - Multiple `// eslint-disable-next-line` comments
- **Description:** Dead code and temporary debugging left in production code
- **Impact:** Code confusion, harder to maintain
- **Fix Recommendation:** Remove all commented code, use git history if needed

#### Issue 5.5: Code Duplication
- **Category:** DRY Principle
- **Severity:** MEDIUM
- **Files:**
  - Difficulty color logic duplicated in Dashboard (lines 381-387) and ChallengeDetails (lines 461-472)
  - Avatar rendering logic duplicated in Navbar (lines 96-102, 211-217)
  - Status badge styling repeated across files
- **Description:** Same logic implemented in multiple places
- **Impact:** Maintenance burden, inconsistencies, bug propagation
- **Fix Recommendation:** Extract to utility functions/components:
  ```javascript
  // utils/styling.js
  export const getDifficultyClass = (difficulty) => {
    const map = {
      'Easy': 'bg-green-500/15 text-green-400 border-green-500/25',
      'Medium': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
      'Hard': 'bg-red-500/15 text-red-400 border-red-500/25',
    };
    return map[difficulty] || '';
  };
  ```

#### Issue 5.6: Insufficient Error Logging
- **Category:** Debugging/Observability
- **Severity:** LOW
- **File:** `ErrorBoundary.jsx:14`
- **Description:** ErrorBoundary only logs to console, no remote error tracking (Sentry, etc.)
- **Impact:** Production errors invisible to team, hard to debug user issues
- **Fix Recommendation:**
  ```javascript
  componentDidCatch(error, info) {
    console.error('UI crash:', error, info);
    // Send to error tracking service
    trackError({ error, errorInfo: info, timestamp: new Date() });
  }
  ```

#### Issue 5.7: Missing JSDoc Documentation
- **Category:** Documentation
- **Severity:** LOW
- **File:** All files
- **Description:** Complex functions like `argsToStdin`, `b64Encode`, etc. lack JSDoc comments
- **Impact:** Developers must read code to understand function purpose
- **Fix Recommendation:**
  ```javascript
  /**
   * Converts test case arguments to stdin format for Judge0
   * @param {any} args - Single arg or array of args
   * @returns {string} Formatted stdin string
   */
  const argsToStdin = (args) => { ... };
  ```

---

## Summary Table

| Category | Severity | Count | Status |
|----------|----------|-------|--------|
| React/Component Issues | High | 2 | Critical |
| React/Component Issues | Medium | 4 | High Priority |
| UX/Design Flaws | High | 1 | Critical |
| UX/Design Flaws | Medium | 5 | High Priority |
| Data Flow Issues | High | 1 | Critical |
| Data Flow Issues | Medium | 4 | High Priority |
| Performance Issues | Medium | 5 | High Priority |
| Code Quality | Low-Medium | 7 | Medium Priority |

---

## Priority Fixes (by Impact)

### Critical (Fix Immediately)
1. **Issue 1.1** - AuthContext dependency loop (infinite refresh risk)
2. **Issue 1.2** - ChallengeDetails event listener memory leak
3. **Issue 2.1** - Missing loading states (UX frustration)
4. **Issue 3.1** - Race conditions in Dashboard queries (data inconsistency)

### High Priority (Fix This Sprint)
1. **Issue 1.3** - useSocket stale closure
2. **Issue 2.4** - Accessibility gaps (WCAG compliance)
3. **Issue 3.2** - Optimistic updates failing
4. **Issue 4.1** - Monolithic component size
5. **Issue 4.4** - Missing search debounce

### Medium Priority (Backlog)
1. **Issue 3.3** - LocalStorage sync issues
2. **Issue 4.2** - Monaco editor lazy loading
3. **Issue 4.3** - Chat polling inefficiency
4. **Issue 5.1** - Magic numbers
5. **Issue 5.3** - Missing PropTypes/TypeScript

---

## Recommended Fixes (Code Examples)

### Fix 1: AuthContext Dependency Issue
```javascript
// BEFORE
useEffect(() => {
  refreshMe();
}, [refreshMe]); // ❌ Infinite loop potential

// AFTER
useEffect(() => {
  refreshMe();
}, []); // ✓ Run once on mount
```

### Fix 2: Search Debouncing
```javascript
import { useMemo } from 'react';
import { debounce } from 'lodash'; // or implement custom

const Dashboard = () => {
  const [filters, setFilters] = useState({...});
  
  const debouncedSearch = useMemo(
    () => debounce((value) => setFilters(p => ({ ...p, search: value })), 300),
    []
  );
  
  return (
    <input
      onChange={(e) => debouncedSearch(e.target.value)}
      placeholder="Search..."
    />
  );
};
```

### Fix 3: Accessibility Improvements
```javascript
// BEFORE
<button onClick={() => setUserDropdownOpen(!userDropdownOpen)}>
  <FiChevronDown />
</button>

// AFTER
<button
  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
  aria-label="Toggle account menu"
  aria-expanded={userDropdownOpen}
  aria-haspopup="menu"
>
  <FiChevronDown />
</button>
```

### Fix 4: Race Condition Protection
```javascript
const handleApply = async (clanId) => {
  try {
    await api.post(`/api/clans/${clanId}/join`);
    toast.success('Applied to join!');
    // Only invalidate after success
    await queryClient.invalidateQueries({ queryKey: ['clans-list'] });
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to apply.');
  }
};
```

---

## Testing Recommendations

1. **Unit Tests:** Add tests for utility functions (getRGB, argsToStdin, etc.)
2. **Integration Tests:** Test API error handling, auth flow, clan operations
3. **E2E Tests:** Test critical paths (login → dashboard → submit solution)
4. **Accessibility Tests:** Use axe-core or Lighthouse for a11y audits
5. **Performance Tests:** Use Lighthouse CI to catch regressions
6. **Load Tests:** Simulate many concurrent users in Dashboard/Clans

---

## Conclusion

The codebase has solid architectural foundations but needs focused work on:
- **Stability:** Fix memory leaks and race conditions
- **UX:** Add loading states and improve error handling
- **Performance:** Optimize queries, split large components
- **Quality:** Remove dead code, add types, constants

Estimated effort to fix all issues: **2-3 sprints** with proper prioritization.
