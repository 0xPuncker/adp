# Project State

> Append-mostly log of things ADP needs to remember between sessions and across
> features. Human-readable. Dated entries. Prepend new entries within each section.

---

## Decisions

Architectural or product choices made and the reason behind them.
Future-you will thank present-you for writing the *why*.

| Date | Decision | Why | Consequences |
|------|----------|-----|--------------|
| 2026-04-20 | Chose Prisma over TypeORM | Simpler migrations, better TS inference | All persistence goes through Prisma client; schema.prisma is source of truth |
| 2026-04-18 | JWT in HttpOnly cookie (not localStorage) | XSS protection | Need CSRF token on state-changing routes |

---

## Blockers

Things that stop progress right now. Each entry should name the task/feature it
blocks and who/what can unblock it.

| Opened | Blocks | Waiting on | Notes |
|--------|--------|------------|-------|
| 2026-04-21 | TASK-07 (easytask) | user — NIF.pt sandbox credentials | Asked via Slack |
| 2026-04-20 | REQ-05 (easytask) | design — rate-limit strategy for matching | Drafted 2 options |

Close a blocker by moving it to *Learnings* with the resolution.

---

## Learnings

Non-obvious things discovered during execution. Each learning should save a
future sprint from repeating the same mistake.

- **2026-04-19** — NIF.pt rate limiter undercounts retries (retry-on-429 loops
  re-enter the bucket). Guard call sites with explicit backoff before REQ-05.
- **2026-04-17** — `vitest --reporter=verbose` in CI drops stack traces on
  Windows runners; use `default` reporter there.

---

## Deferred Ideas

Out-of-scope findings captured during Execute to preserve scope lock.
Review every few sprints — promote to a feature or drop.

- **2026-04-22** — Extract `validateNIF` to shared util (currently duplicated in
  `src/routes/customers.ts:88` and `src/routes/providers.ts:102`). Seen during
  TASK-12.
- **2026-04-21** — Rating histogram visualisation on provider dashboard. Idea
  raised mid-execution of TASK-10.
- **2026-04-19** — Replace hand-rolled pagination with a shared helper.

---

## Todos

Small, agent-resumable chores that don't warrant a feature spec.

- [ ] Backfill tests for legacy auth middleware (`src/middleware/auth.ts`)
- [ ] Document env-var matrix in `README.md`
- [ ] Remove unused `lodash.throttle` dep after TASK-14 lands
- [x] ~~Rename `utils/helper.ts` → `utils/validation.ts`~~ — done 2026-04-18

---

## Open Questions

Questions awaiting user input. Resolve and move the answer into a Decision.

1. **2026-04-20** — Should providers be allowed to decline a matched job after
   accepting? Affects REQ-07 and REQ-08 state machine.
2. **2026-04-19** — Do we need i18n now or defer to post-MVP?

---

## Change Log

Prepend entries when you significantly restructure this file.

| Date | Change |
|------|--------|
| 2026-04-20 | Initial scaffold |
