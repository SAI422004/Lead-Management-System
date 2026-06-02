const db = require('../db');
const assignmentService = require('../services/assignmentService');

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'lost', 'converted'];

exports.getLeads = async (req, res) => {
  const { search = '', status = '', source = '', sortBy = 'created_at', order = 'desc', page = 1, limit = 10 } = req.query;
  const isAdmin = req.user.role === 'admin';
  const params = [];
  let where = isAdmin ? 'WHERE 1=1' : `WHERE assigned_to = $${params.push(req.user.id)}`;
  if (search) {
    where += ` AND (l.name ILIKE $${params.push('%' + search + '%')} OR l.email ILIKE $${params.push('%' + search + '%')})`;
  }
  if (status) where += ` AND l.status = $${params.push(status)}`;
  if (source) where += ` AND l.source = $${params.push(source)}`;
  try {
    const countResult = await db.query(`SELECT COUNT(*) FROM leads l ${where}`, params);
    const total = parseInt(countResult.rows[0].count);
    const offset = (page - 1) * limit;
    const dataParams = [...params, limit, offset];
    const result = await db.query(
      `SELECT l.* FROM leads l ${where} ORDER BY ${sortBy} ${order} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    return res.status(200).json({ leads: result.rows, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.createLead = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const { name, email, phone, source, notes, status } = req.body;
  if (!name) return res.status(400).json({ message: 'Lead name is required' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    const agentId = await assignmentService.assignLead(null);
    const result = await db.query(
      'INSERT INTO leads (name,email,phone,source,notes,assigned_to) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, email, phone, source, notes, agentId]
    );
    const lead = result.rows[0];
    await db.query(
      'INSERT INTO activity_logs (lead_id,performed_by,action,description) VALUES ($1,$2,$3,$4)',
      [lead.id, req.user.id, 'Lead Created', `Lead ${name} created and assigned`]
    );
    return res.status(201).json(lead);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getLeadById = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Lead not found' });
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLead = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  try {
    const existing = await db.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Lead not found' });
    const { name, email, phone, source, notes, status } = req.body;
    const result = await db.query(
      'UPDATE leads SET name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone), source=COALESCE($4,source), notes=COALESCE($5,notes), status=COALESCE($6,status) WHERE id=$7 RETURNING *',
      [name, email, phone, source, notes, status, req.params.id]
    );
    const updated = result.rows[0];
    await db.query(
      'INSERT INTO activity_logs (lead_id,performed_by,action,description) VALUES ($1,$2,$3,$4)',
      [updated.id, req.user.id, 'Lead Updated', 'Lead updated']
    );
    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteLead = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  try {
    const existing = await db.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Lead not found' });
    await db.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    return res.status(200).json({ message: 'Lead deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Aliases used by route files
exports.list = exports.getLeads;
exports.getOne = exports.getLeadById;
exports.create = exports.createLead;
exports.update = exports.updateLead;
exports.remove = exports.deleteLead;
