# Demo Restoration Guide

This guide details how to undo the temporary demo restrictions and restore the full CRM features, including deactivated sidebar links, meeting tracking controls (location and audio logging), completed meeting details, and order document upload/submission checks.

All changes are marked in the codebase with `DEMO` comments to make them easily searchable.

---

## 1. Restore Sidebar Navigation Links
To reactivate all sidebar sections (Orders, Team, Reports, etc.) and redirect them to their original pages rather than showing a deactivated popup.

* **File Path**: `src/app/(authenticated)/layout.tsx` (Desktop & Mobile sidebars)

### Desktop Sidebar (around Line 202)
Remove the `!isFunctional` check block:
```diff
-            // DEMO MODE CHECK: Only Dashboard and Leads functional
-            const isFunctional = item.path === '/dashboard' || item.path === '/leads';
-
-            if (!isFunctional) {
-              return (
-                <button
-                  key={item.path}
-                  type="button"
-                  onClick={() => alert('This section is deactivated for the demo presentation.')}
-                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-slate-500 hover:text-slate-400 hover:bg-slate-900/20 cursor-pointer text-left"
-                >
-                  <Icon className="w-5 h-5 text-slate-600" />
-                  <span>{item.name}</span>
-                </button>
-              );
-            }
```

### Mobile Sidebar (around Line 274)
Remove the `!isFunctional` check block:
```diff
-                // DEMO MODE CHECK: Only Dashboard and Leads functional
-                const isFunctional = item.path === '/dashboard' || item.path === '/leads';
-
-                if (!isFunctional) {
-                  return (
-                    <button
-                      key={item.path}
-                      type="button"
-                      onClick={() => {
-                        setSidebarOpen(false);
-                        alert('This section is deactivated for the demo presentation.');
-                      }}
-                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-slate-500 hover:text-slate-400 hover:bg-slate-900/20 cursor-pointer text-left"
-                    >
-                      <Icon className="w-5 h-5 text-slate-650" />
-                      <span>{item.name}</span>
-                    </button>
-                  );
-                }
```

---

## 2. Restore Live Meeting Tracker
To re-enable the **Start Meeting**, **Audio Recording**, and **Location Fetching** interface inside the "Meeting Booked" lead detail tab.

* **File Path**: `src/app/(authenticated)/leads/[id]/page.tsx`
* **Line Number**: `1302`

Change the logical condition from:
```typescript
{lead && lead.status === 8 && index === 0 && false && (
```
to:
```typescript
{lead.status === 8 && index === 0 && (
```

---

## 3. Restore Completed Meeting Review & Playback
To show duration details, meeting localities, Google maps link, and the audio recording playback player for logged meetings in the "Meeting Booked" tab.

* **File Path**: `src/app/(authenticated)/leads/[id]/page.tsx`
* **Line Number**: `1397`

Change the logical condition from:
```typescript
{lead && meet.meetingStartedAt && false && (
```
to:
```typescript
{meet.meetingStartedAt && (
```

---

## 4. Restore Order Document Checklist & Finance Submission
To re-enable the **Document Checklist**, **File Upload / Replacement** buttons, and the **Submit Order for Approval** button in the "Order" tab.

* **File Path**: `src/app/(authenticated)/leads/[id]/page.tsx`
* **Line Number**: `1669`

Change the logical condition from:
```typescript
{lead && lead.order && false && (
```
to:
```typescript
(
```
*(Make sure to also remove the closing parenthesis/curly brace `}` matching this block around line `1775` if you revert this block back to standard JSX container styling).*
