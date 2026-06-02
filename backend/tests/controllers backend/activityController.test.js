// tests/controllers/activityController.test.js

jest.mock('../../db', () => ({ query: jest.fn() }));

const db = require('../../db');
const activityController = require('../../controllers/activityController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sampleLogs = [
  {
    id: 'log-uuid-1',
    lead_id: 'lead-uuid-1',
    lead_name: 'Rahul Sharma',
    performed_by: 'admin-uuid',
    performer_name: 'Admin User',
    action: 'Lead Created',
    description: 'Lead created and assigned to Sai',
    created_at: new Date().toISOString(),
  },
  {
    id: 'log-uuid-2',
    lead_id: 'lead-uuid-1',
    lead_name: 'Rahul Sharma',
    performed_by: 'admin-uuid',
    performer_name: 'Admin User',
    action: 'Status Changed',
    description: 'Status changed from new to contacted',
    created_at: new Date().toISOString(),
  },
];

// ── GET ALL LOGS ──────────────────────────────────────────────────
describe('activityController.getActivityLogs', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns all activity logs sorted by created_at DESC', async () => {
    db.query.mockResolvedValueOnce({ rows: sampleLogs });

    const req = { user: { id: 'admin-uuid', role: 'admin' } };
    const res = mockRes();

    await activityController.getActivityLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const logs = res.json.mock.calls[0][0];
    expect(logs).toHaveLength(2);
    expect(logs[0].action).toBe('Lead Created');
  });

  test('returns empty array when no logs exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { user: { id: 'admin-uuid', role: 'admin' } };
    const res = mockRes();

    await activityController.getActivityLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toEqual([]);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValueOnce(new Error('connection refused'));

    const req = { user: { id: 'admin-uuid', role: 'admin' } };
    const res = mockRes();

    await activityController.getActivityLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── GET LOGS BY LEAD ──────────────────────────────────────────────
describe('activityController.getLogsByLead', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns logs filtered by lead_id', async () => {
    db.query.mockResolvedValueOnce({ rows: [sampleLogs[0]] });

    const req = {
      user: { id: 'admin-uuid', role: 'admin' },
      params: { leadId: 'lead-uuid-1' },
    };
    const res = mockRes();

    await activityController.getLogsByLead(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const logs = res.json.mock.calls[0][0];
    expect(logs).toHaveLength(1);
    expect(logs[0].lead_id).toBe('lead-uuid-1');

    // Verify the query used the correct leadId parameter
    expect(db.query.mock.calls[0][1]).toContain('lead-uuid-1');
  });

  test('returns 404 when lead has no logs', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = {
      user: { id: 'admin-uuid', role: 'admin' },
      params: { leadId: 'no-such-lead' },
    };
    const res = mockRes();

    await activityController.getLogsByLead(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
