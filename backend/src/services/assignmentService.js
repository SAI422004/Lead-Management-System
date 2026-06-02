const db = require('../db');

exports.assignLead = async (leadId) => {
  await db.query(`
    INSERT INTO agent_assignment_tracker (user_id, lead_count)
    SELECT id, 0 FROM users WHERE role = 'agent' AND is_active = TRUE
    ON CONFLICT (user_id) DO NOTHING
  `);
  const result = await db.query(`
    SELECT user_id, lead_count FROM agent_assignment_tracker
    WHERE user_id IN (SELECT id FROM users WHERE role = 'agent' AND is_active = TRUE)
    ORDER BY lead_count ASC, updated_at ASC LIMIT 1
  `);
  if (result.rows.length === 0) throw new Error('No active agents available');
  const agentId = result.rows[0].user_id;
  if (leadId) {
    await db.query('UPDATE leads SET assigned_to = $1 WHERE id = $2', [agentId, leadId]);
  }
  await db.query(
    'UPDATE agent_assignment_tracker SET lead_count = lead_count + 1, updated_at = NOW() WHERE user_id = $1',
    [agentId]
  );
  return agentId;
};
