// tests/services/assignmentService.test.js
// Tests the Least-Loaded Agent assignment strategy

jest.mock('../../db', () => ({ query: jest.fn() }));

const db = require('../../db');
const assignmentService = require('../../services/assignmentService');

// Helper: the service makes exactly 3 db.query calls in the happy path:
//   call 0 → self-heal INSERT ... ON CONFLICT
//   call 1 → SELECT least-loaded agent
//   call 2 → UPDATE tracker (lead_count + 1)
// For leadId !== null there is also an UPDATE leads call between 1 and 2,
// but our service passes leadId=null from createLead so only 3 calls total.

describe('assignmentService.assignLead', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Happy path ────────────────────────────────────────────────
  test('assigns lead to the agent with lowest lead_count', async () => {
    const agents = [
      { user_id: 'agent-A', lead_count: 2 },
      { user_id: 'agent-B', lead_count: 5 },
      { user_id: 'agent-C', lead_count: 8 },
    ];

    db.query
      .mockResolvedValueOnce({ rows: [] })          // call 0: self-heal INSERT
      .mockResolvedValueOnce({ rows: agents })       // call 1: SELECT agents
      .mockResolvedValueOnce({ rows: [] });          // call 2: UPDATE tracker

    const assignedId = await assignmentService.assignLead(null);

    expect(assignedId).toBe('agent-A');
  });

  test('self-heals tracker rows before assigning', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })                                    // self-heal
      .mockResolvedValueOnce({ rows: [{ user_id: 'agent-new', lead_count: 0 }] })  // SELECT
      .mockResolvedValueOnce({ rows: [] });                                   // UPDATE tracker

    await assignmentService.assignLead(null);

    // call 0 is the self-heal INSERT — confirm it contains ON CONFLICT
    const selfHealQuery = db.query.mock.calls[0][0];
    expect(selfHealQuery.toLowerCase()).toMatch(/on conflict/);
  });

  // ── No available agents ───────────────────────────────────────
  test('throws when there are no active agents', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })   // self-heal
      .mockResolvedValueOnce({ rows: [] });  // SELECT returns empty → no agents

    await expect(assignmentService.assignLead(null)).rejects.toThrow(/no active agents/i);
  });

  // ── Tie-breaking ─────────────────────────────────────────────
  test('picks the first agent when multiple agents are tied', async () => {
    const tiedAgents = [
      { user_id: 'agent-X', lead_count: 3 },
      { user_id: 'agent-Y', lead_count: 3 },
    ];

    db.query
      .mockResolvedValueOnce({ rows: [] })           // self-heal
      .mockResolvedValueOnce({ rows: tiedAgents })   // SELECT → DB returns ordered list
      .mockResolvedValueOnce({ rows: [] });           // UPDATE tracker

    const assignedId = await assignmentService.assignLead(null);
    expect(assignedId).toBe('agent-X');
  });

  // ── Tracker increment ─────────────────────────────────────────
  test('increments lead_count in tracker after assignment', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })                                     // self-heal
      .mockResolvedValueOnce({ rows: [{ user_id: 'agent-A', lead_count: 4 }] }) // SELECT
      .mockResolvedValueOnce({ rows: [] });                                    // UPDATE tracker

    await assignmentService.assignLead(null);

    // call 2 is the tracker UPDATE — confirm it references lead_count
    const trackerQuery = db.query.mock.calls[2][0];
    expect(trackerQuery.toLowerCase()).toMatch(/lead_count/);
  });

  // ── DB failure ───────────────────────────────────────────────
  test('propagates DB error to caller', async () => {
    db.query.mockRejectedValueOnce(new Error('DB timeout'));

    await expect(assignmentService.assignLead(null)).rejects.toThrow('DB timeout');
  });
});
