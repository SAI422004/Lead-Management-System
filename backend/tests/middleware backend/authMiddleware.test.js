// tests/middleware/authMiddleware.test.js

const jwt = require('jsonwebtoken');

// Mock the db module before requiring middleware
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

const db = require('../../db');
const authMiddleware = require('../../middleware/authMiddleware');

// Helper to build mock Express req/res/next
const mockReq = (overrides = {}) => ({
  headers: {},
  user: null,
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Token absent ──────────────────────────────────────────────
  test('returns 401 when Authorization header is missing', async () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/token/i) })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header has no Bearer prefix', async () => {
    const req = mockReq({ headers: { authorization: 'InvalidToken abc123' } });
    const res = mockRes();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  // ── Token invalid ─────────────────────────────────────────────
  test('returns 401 for an expired token', async () => {
    const expiredToken = jwt.sign(
      { id: 'user-uuid', role: 'agent' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }   // already expired
    );

    const req = mockReq({ headers: { authorization: `Bearer ${expiredToken}` } });
    const res = mockRes();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('returns 401 for a token signed with wrong secret', async () => {
    const badToken = jwt.sign({ id: 'user-uuid', role: 'agent' }, 'wrong_secret');

    const req = mockReq({ headers: { authorization: `Bearer ${badToken}` } });
    const res = mockRes();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  // ── Token valid, user not found in DB ─────────────────────────
  test('returns 401 when user no longer exists in DB', async () => {
    const token = jwt.sign({ id: 'ghost-uuid', role: 'agent' }, process.env.JWT_SECRET);
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  // ── Happy path ────────────────────────────────────────────────
  test('calls next() and sets req.user for a valid token', async () => {
    const userId = 'valid-user-uuid';
    const token = jwt.sign({ id: userId, role: 'admin' }, process.env.JWT_SECRET);

    db.query.mockResolvedValueOnce({
      rows: [{ id: userId, name: 'Admin User', email: 'admin@test.com', role: 'admin', is_active: true }],
    });

    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();

    await authMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: userId, role: 'admin' });
  });

  // ── Inactive user ─────────────────────────────────────────────
  test('returns 403 when user account is inactive', async () => {
    const userId = 'inactive-uuid';
    const token = jwt.sign({ id: userId, role: 'agent' }, process.env.JWT_SECRET);

    db.query.mockResolvedValueOnce({
      rows: [{ id: userId, name: 'Inactive', email: 'i@test.com', role: 'agent', is_active: false }],
    });

    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
