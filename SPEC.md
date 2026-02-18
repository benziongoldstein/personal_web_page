# Personal Focus Dashboard - Product & Technical Specification

## 1. Purpose

Build a personal-use web dashboard that centralizes the user's daily information needs in one place and reduces compulsive browsing behavior.

Core intent:
- One destination for relevant information.
- Fixed update windows (not continuous refresh).
- Fast, clean reading experience in Hebrew-first RTL.
- Easy long-term maintenance.

## 2. Product Goals

- **Primary goal:** prevent over-consumption by limiting information intake to scheduled batches.
- **Secondary goal:** maintain coverage across news, markets, sports, and RTL engineering growth.
- **Tertiary goal:** keep the product ready for future mobile app expansion.

Success criteria (v1):
- User can get a complete daily briefing in under 10 minutes.
- Content refreshes only 3 times daily.
- No notification channels.
- Strong visual polish and accessibility.

## 3. Target User

- Single user only (the owner).
- No multi-user feature scope in v1.
- No social or sharing features.

## 4. Update Policy (Anti-Addiction Core)

- Timezone: `Asia/Jerusalem`
- Scheduled updates:
  - `07:00`
  - `13:00`
  - `18:00`
- Timing tolerance: not second-precise; near-window is acceptable.
- Manual refresh behavior:
  - Refresh is locked between windows.
  - UI clearly indicates next allowed update time.

This is a hard product rule and must not be bypassed in standard UI.

## 5. Information Domains

### 5.1 News
- Priority domain.
- Preferred sources:
  - Ynet
  - Channel 14
  - Fox News
- Language mix target:
  - Hebrew 80%
  - English 20%
- Per update batch target:
  - 20 total items across all sections.

Content rendering policy:
- If full article reuse is legally and technically allowed, show full text.
- Else show:
  - title
  - short explanation/summary
  - source link

Duplicate story handling:
- Same story from multiple sources is allowed.
- Preferred UI: grouped/clustered presentation when feasible.

### 5.2 Markets
- Keep this compact ("do not overdo").
- Show main indices and a small set of relevant items.
- Interests include:
  - S&P 500 context
  - Tel Aviv market context
  - NVIDIA (`NVDA`)
  - Marvell (`MRVL`)
  - AI bubble and market-moving events

### 5.3 Sports
- Primary sports focus:
  - Basketball
  - Football (soccer)
- Default teams:
  - New York Knicks
  - Real Madrid
- Also include cross-sport "hot now" events.

### 5.4 RTL Design + AI for Engineers Corner

A dedicated recurring block must include:
- Practical RTL problem statement
- 2-4 solution approaches
- Ranking/comparison
- Final recommendation
- Common mistakes
- Verification/testing hints
- Optional short SystemVerilog snippet when useful

Also include AI-for-engineers practical ideas to improve RTL/electrical engineering productivity.

## 6. Content Composition Per Update

Total: 20 items/update

Proposed split:
- 10 News
- 4 Markets
- 4 Sports
- 1 RTL Design
- 1 AI for Engineers

Notes:
- News remains dominant by design.
- Sports defaults to Knicks/Real Madrid + hot events.
- Markets remains concise.

## 7. UX & Design Requirements

- RTL-first design system.
- Hebrew-first typography and spacing.
- Strong visual quality ("clean and cool").
- Accessible color contrast and keyboard-friendly controls.
- Responsive for desktop and mobile browser from day one.
- No infinite scroll.
- No addictive engagement mechanics.
- Show:
  - last update time
  - next update countdown
  - refresh lock status

## 8. Functional Requirements

- Fetch and normalize content from configured sources.
- Score/rank items by relevance and freshness.
- Enforce language ratio target (80/20, Hebrew/English).
- Produce a single active snapshot per update window.
- Serve snapshot via API to frontend.
- Expose service health and source status.

## 9. Non-Functional Requirements

- Maintainability over complexity.
- Graceful degradation when a source fails.
- Lightweight operation and good performance on mobile.
- Minimal operational burden.
- Logs for troubleshooting, without heavy data retention.

## 10. Legal/Source Policy

- Free-only approach for now (no paid APIs).
- Full article display only when source terms permit.
- Fallback to title + summary + link when full reuse is not allowed.
- Always display source attribution.

## 11. Architecture Direction (v1)

Recommended stack:
- Next.js (App Router)
- TypeScript
- API routes for snapshot delivery and health
- Scheduled jobs (cron-based) for 3 daily updates
- Simple persistence strategy for active snapshot

Architecture principles:
- Modular domains (`news`, `markets`, `sports`, `rtl`)
- API-first design to support future mobile clients
- Small, testable content pipeline stages

## 12. Initial API Surface (Draft)

- `GET /api/snapshot`
  - Returns current active snapshot.
- `GET /api/health`
  - Returns app and source health summary.
- `POST /api/admin/run-now` (optional/internal)
  - Trigger run for development only.
  - In production UI, regular users should still be refresh-locked.

## 13. Data Model (Draft)

`ContentItem`:
- `id`
- `type` (`news` | `market` | `sports` | `rtl` | `ai_engineering`)
- `title`
- `summary`
- `fullContent` (optional)
- `sourceName`
- `sourceUrl`
- `language`
- `publishedAt`
- `score`
- `tags`
- `clusterId` (optional)

`Snapshot`:
- `id`
- `createdAt`
- `timezone`
- `nextUpdateAt`
- `items`
- `meta` (counts, source health)

`SystemState`:
- `lastRunAt`
- `lastRunStatus`
- `refreshLocked`
- `nextAllowedRefreshAt`

## 14. Phase Plan

### Phase 1 - Project Skeleton (now)
- Bootstrap Next.js + TypeScript app.
- Build RTL-first shell.
- Add dashboard sections with placeholders.
- Add static lock and countdown placeholders.

### Phase 2 - Content Pipeline
- Add source clients and normalization.
- Implement scoring and 20-item composition.
- Add mock scheduler and snapshot store.

### Phase 3 - Scheduled Updates
- Cron integration at 07:00 / 13:00 / 18:00.
- Real lock behavior based on last snapshot.
- Source error handling and fallback paths.

### Phase 4 - Quality & Polish
- UI polish and accessibility improvements.
- Mobile optimization.
- Stability testing and edge-case handling.

## 15. Out of Scope (v1)

- Push/email/chat notifications
- Multi-user accounts and permissions
- Advanced portfolio tracking with holdings
- Full historical archive browsing
- Native mobile app (future via API-first backend)

## 16. Risks & Mitigations

- **Risk:** Source access restrictions or changing terms.
  - **Mitigation:** strict fallback to links + summaries.
- **Risk:** Inconsistent feed quality.
  - **Mitigation:** source scoring + graceful degradation.
- **Risk:** UX drift into high-engagement patterns.
  - **Mitigation:** enforce anti-addiction rules as hard constraints.
