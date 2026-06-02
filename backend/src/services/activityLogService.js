const { query } = require('../db');

const log = async ({ leadId, userId, action, description, metadata }) => {
  try {
    await query(
      `INSERT INTO activity_logs (lead_id, user_id, action, description, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [leadId || null, userId || null, action, description || null, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    // Non-fatal: log to console but don't crash the request
    console.error('Activity log error:', err.message);
  }
};

const getLogsForLead = async (leadId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT al.*, u.name AS user_name, u.role AS user_role
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.lead_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2 OFFSET $3`,
    [leadId, limit, offset]
  );
  return result.rows;
};

module.exports = { log, getLogsForLead };
