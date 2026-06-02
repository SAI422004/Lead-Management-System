# AI Usage Disclosure

## Tools Used
- **Claude (Anthropic)** — Used for code scaffolding, architecture planning, and boilerplate generation

## What Was Used For
- Generating the initial Express.js route/controller/service structure
- Writing PostgreSQL schema SQL
- Scaffolding React component structure and Bootstrap-based UI
- Drafting the README documentation

## Manual Modifications & Engineering Decisions Made
The following were designed and reasoned through independently:

1. **Assignment strategy selection** — Chose Least-Loaded over Round-Robin specifically for better load distribution when agents have varying throughput. Analyzed the concurrency risk and designed the `SELECT FOR UPDATE SKIP LOCKED` pattern to prevent double-assignment under concurrent requests.

2. **Concurrency safety in assignment** — Identified that naive round-robin without DB locking leads to race conditions. Implemented transactional locking at the DB level.

3. **Non-blocking email** — Deliberately made email sending fire-and-forget (`.catch(console.error)` pattern) so that SMTP failures do not fail the primary business operation.

4. **Role-based data scoping** — Agents receiving only their own leads (both in `listLeads` and `getLeadById`) was a security decision made at the service layer, not just the route layer.

5. **Graceful SMTP degradation** — Added environment variable check so the app works fully even without email configured.

6. **Activity log error isolation** — Wrapped in try-catch so logging failures never crash the request.

7. **Tracker decrement on delete** — Identified and implemented the edge case where deleting a lead should reduce the assigned agent's count.

## What Wasn't AI-Generated
- Architecture decisions (which patterns to use and why)
- Security model (role scoping logic)
- Concurrency design (the locking approach)
- Business rule interpretation (who can do what)
