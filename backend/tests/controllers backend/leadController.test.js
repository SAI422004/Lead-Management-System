// tests/controllers/leadController.test.js

jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../services/assignmentService', () => ({
  assignLead: jest.fn(),
}));
jest.mock('../../services/emailService', () => ({
  sendAssignmentEmail: jest.fn(),
}));

const db = require('../../db');
const assignmentService = require('../../services/assignmentService');
const leadController = require('../../controllers/leadController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const adminUser  = { id: 'admin-uuid', role: 'admin' };
const agentUser  = { id: 'agent-uuid', role: 'agent' };

const sampleLead = {
  id: 'lead-uuid-1',
  name: 'Rahul Sharma',
  email: 'rahul@example.com',
  phone: '9876543210',
  status: 'new',
  source: 'website',
  assigned_to: 'agent-uuid',
  notes: '',
  created_at: new Date().toISOString(),
};

// ── GET ALL LEADS ─────────────────────────────────────────────────
describe('leadController.getLeads', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns paginated leads for admin', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })   // COUNT query
      .mockResolvedValueOnce({ rows: [sampleLead] });       // SELECT query

    const req = {
      user: adminUser,
      query: { page: '1', limit: '10', search: '', status: '', source: '', sortBy: 'created_at', order: 'desc' },
    };
    const res = mockRes();

    await leadController.getLeads(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('leads');
    expect(payload).toHaveProperty('total', 5);
    expect(payload.leads).toHaveLength(1);
  });

  test('agent only sees their own leads', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [sampleLead] });

    const req = {
      user: agentUser,
      query: { page: '1', limit: '10', search: '', status: '', source: '', sortBy: 'created_at', order: 'desc' },
    };
    const res = mockRes();

    await leadController.getLeads(req, res);

    // Verify the query was called with agent's user id as a filter
    const selectCall = db.query.mock.calls[1];
    expect(selectCall[1]).toContain('agent-uuid');
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValueOnce(new Error('connection error'));

    const req = {
      user: adminUser,
      query: { page: '1', limit: '10', search: '', status: '', source: '', sortBy: 'created_at', order: 'desc' },
    };
    const res = mockRes();

    await leadController.getLeads(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── CREATE LEAD ───────────────────────────────────────────────────
describe('leadController.createLead', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a lead, assigns agent, logs activity, returns 201', async () => {
    assignmentService.assignLead.mockResolvedValueOnce('agent-uuid');
    db.query
      .mockResolvedValueOnce({ rows: [sampleLead] })  // INSERT lead
      .mockResolvedValueOnce({ rows: [] });            // INSERT activity log

    const req = {
      user: adminUser,
      body: { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '9876543210', source: 'website', notes: '' },
    };
    const res = mockRes();

    await leadController.createLead(req, res);

    expect(assignmentService.assignLead).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0]).toHaveProperty('id');
  });

  test('returns 400 when lead name is missing', async () => {
    const req = {
      user: adminUser,
      body: { email: 'rahul@example.com', source: 'website' },   // no name
    };
    const res = mockRes();

    await leadController.createLead(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(assignmentService.assignLead).not.toHaveBeenCalled();
  });

  test('returns 400 for invalid status value', async () => {
    const req = {
      user: adminUser,
      body: { name: 'Test', email: 'test@test.com', source: 'website', status: 'invalid_status' },
    };
    const res = mockRes();

    await leadController.createLead(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 403 when agent tries to create a lead', async () => {
    const req = {
      user: agentUser,
      body: { name: 'Lead', email: 'l@l.com', source: 'website' },
    };
    const res = mockRes();

    await leadController.createLead(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ── GET SINGLE LEAD ───────────────────────────────────────────────
describe('leadController.getLeadById', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns the lead when found', async () => {
    db.query.mockResolvedValueOnce({ rows: [sampleLead] });

    const req = { user: adminUser, params: { id: 'lead-uuid-1' } };
    const res = mockRes();

    await leadController.getLeadById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({ id: 'lead-uuid-1' });
  });

  test('returns 404 when lead does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { user: adminUser, params: { id: 'nonexistent-uuid' } };
    const res = mockRes();

    await leadController.getLeadById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── UPDATE LEAD ───────────────────────────────────────────────────
describe('leadController.updateLead', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updates a lead and returns 200 for admin', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleLead] })                              // find original
      .mockResolvedValueOnce({ rows: [{ ...sampleLead, status: 'contacted' }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] });                                        // activity log

    const req = {
      user: adminUser,
      params: { id: 'lead-uuid-1' },
      body: { status: 'contacted' },
    };
    const res = mockRes();

    await leadController.updateLead(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({ status: 'contacted' });
  });

  test('returns 403 when agent tries to update', async () => {
    const req = {
      user: agentUser,
      params: { id: 'lead-uuid-1' },
      body: { status: 'contacted' },
    };
    const res = mockRes();

    await leadController.updateLead(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 404 when lead to update does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = {
      user: adminUser,
      params: { id: 'ghost-lead' },
      body: { status: 'qualified' },
    };
    const res = mockRes();

    await leadController.updateLead(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── DELETE LEAD ───────────────────────────────────────────────────
describe('leadController.deleteLead', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deletes a lead and returns 200', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleLead] })  // find
      .mockResolvedValueOnce({ rows: [] });            // DELETE

    const req = { user: adminUser, params: { id: 'lead-uuid-1' } };
    const res = mockRes();

    await leadController.deleteLead(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 404 when lead not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { user: adminUser, params: { id: 'nonexistent' } };
    const res = mockRes();

    await leadController.deleteLead(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 403 when agent tries to delete', async () => {
    const req = { user: agentUser, params: { id: 'lead-uuid-1' } };
    const res = mockRes();

    await leadController.deleteLead(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
