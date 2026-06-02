const { query } = require('../db');
const bcrypt = require('bcryptjs');

const listUsers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, is_active, created_at,
        (SELECT lead_count FROM agent_assignment_tracker WHERE user_id = users.id) AS lead_count
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, is_active, password } = req.body;
    const fields = [];
    const params = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); params.push(name); }
    if (email) { fields.push(`email = $${idx++}`); params.push(email); }
    if (role) { fields.push(`role = $${idx++}`); params.push(role); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(is_active); }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      fields.push(`password_hash = $${idx++}`);
      params.push(hash);
    }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, is_active`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });

    // Ensure tracker exists if role changed to agent
    if (role === 'agent') {
      await query(
        'INSERT INTO agent_assignment_tracker (user_id, lead_count) VALUES ($1, 0) ON CONFLICT DO NOTHING',
        [req.params.id]
      );
    }

    res.json({ message: 'User updated', user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUser, updateUser };
