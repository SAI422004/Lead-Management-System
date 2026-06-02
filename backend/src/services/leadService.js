const { query, getClient } = require('../db');
const { assignAgent, decrementAgentCount } = require('./assignmentService');
const activityLog = require('./activityLogService');
const { sendLeadAssignmentEmail, sendLeadStatusEmail } = require('../utils/emailUtil');

const VALID_SORT_FIELDS = ['name', 'status', 'source', 'created_at', 'updated_at'];
const VALID_SORT_DIRS = ['asc', 'desc'];

const listLeads = async ({ page = 1, limit = 10, search, status, source, sortBy = 'created_at', sortDir = 'desc', userId, userRole }) => {
  const offset = (page - 1) * limit;

  const safeSort = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
  const safeDir = VALID_SORT_DIRS.includes(sortDir.toLowerCase()) ? sortDir : 'desc';

  const conditions = [];
  const params = [];
  let idx = 1;

  // Agents can only see their own leads
  if (userRole === 'agent') {
    conditions.push(`l.assigned_to = $${idx++}`);
    params.push(userId);
  }

  if (search) {
    conditions.push(`(l.name ILIKE $${idx} OR l.email ILIKE $${idx} OR l.phone ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (status) {
    conditions.push(`l.status = $${idx++}`);
    params.push(status);
  }
  if (source) {
    conditions.push(`l.source = $${idx++}`);
    params.push(source);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      l.*,
      a.name AS assigned_to_name,
      a.email AS assigned_to_email,
      c.name AS created_by_name
    FROM leads l
    LEFT JOIN users a ON a.id = l.assigned_to
    LEFT JOIN users c ON c.id = l.created_by
    ${where}
    ORDER BY l.${safeSort} ${safeDir}
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  params.push(limit, offset);

  const countQuery = `SELECT COUNT(*) FROM leads l ${where}`;

  const [data, count] = await Promise.all([
    query(dataQuery, params),
    query(countQuery, params.slice(0, -2)),
  ]);

  return {
    leads: data.rows,
    pagination: {
      total: parseInt(count.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(count.rows[0].count / limit),
    },
  };
};

const getLeadById = async (id, { userId, userRole }) => {
  const result = await query(`
    SELECT
      l.*,
      a.name AS assigned_to_name,
      a.email AS assigned_to_email,
      c.name AS created_by_name
    FROM leads l
    LEFT JOIN users a ON a.id = l.assigned_to
    LEFT JOIN users c ON c.id = l.created_by
    WHERE l.id = $1
  `, [id]);

  const lead = result.rows[0];
  if (!lead) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }

  // Agents can only access their own leads
  if (userRole === 'agent' && lead.assigned_to !== userId) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }

  return lead;
};

const createLead = async (data, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Auto-assign agent
    const agentId = await assignAgent(client);

    const result = await client.query(`
      INSERT INTO leads (name, email, phone, source, status, assigned_to, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.name,
      data.email || null,
      data.phone || null,
      data.source || 'other',
      data.status || 'new',
      agentId,
      data.notes || null,
      createdBy,
    ]);

    const lead = result.rows[0];
    await client.query('COMMIT');

    // Activity log (async, non-blocking)
    activityLog.log({
      leadId: lead.id,
      userId: createdBy,
      action: 'LEAD_CREATED',
      description: `Lead "${lead.name}" created and assigned to agent`,
      metadata: { assignedTo: agentId },
    });

    // Email notification (fire-and-forget)
    if (agentId) {
      const agentResult = await query('SELECT name, email FROM users WHERE id = $1', [agentId]);
      const agent = agentResult.rows[0];
      if (agent) {
        sendLeadAssignmentEmail({
          agentEmail: agent.email,
          agentName: agent.name,
          leadName: lead.name,
          leadId: lead.id,
        }).catch(console.error);
      }
    }

    return lead;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateLead = async (id, data, updatedBy, userRole) => {
  const existing = await query('SELECT * FROM leads WHERE id = $1', [id]);
  if (!existing.rows.length) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }
  const old = existing.rows[0];

  // Agents can only update their own leads
  if (userRole === 'agent' && old.assigned_to !== updatedBy) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }

  const fields = [];
  const params = [];
  let idx = 1;

  const allowed = ['name', 'email', 'phone', 'source', 'status', 'notes'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx++}`);
      params.push(data[field]);
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  params.push(id);
  const result = await query(
    `UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  const updated = result.rows[0];

  // Log activity
  const changes = {};
  for (const field of allowed) {
    if (data[field] !== undefined && data[field] !== old[field]) {
      changes[field] = { from: old[field], to: data[field] };
    }
  }

  if (changes.status) {
    activityLog.log({
      leadId: id,
      userId: updatedBy,
      action: 'STATUS_CHANGED',
      description: `Status changed from "${changes.status.from}" to "${changes.status.to}"`,
      metadata: changes,
    });

    // Notify via email if lead has email
    if (updated.email) {
      sendLeadStatusEmail({
        email: updated.email,
        leadName: updated.name,
        oldStatus: changes.status.from,
        newStatus: changes.status.to,
      }).catch(console.error);
    }
  } else {
    activityLog.log({
      leadId: id,
      userId: updatedBy,
      action: 'LEAD_UPDATED',
      description: `Lead "${updated.name}" updated`,
      metadata: changes,
    });
  }

  return updated;
};

const deleteLead = async (id, deletedBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (!existing.rows.length) {
      const err = new Error('Lead not found');
      err.status = 404;
      throw err;
    }
    const lead = existing.rows[0];

    // Decrement agent tracker
    if (lead.assigned_to) {
      await decrementAgentCount(client, lead.assigned_to);
    }

    await client.query('DELETE FROM leads WHERE id = $1', [id]);
    await client.query('COMMIT');

    activityLog.log({
      leadId: null,
      userId: deletedBy,
      action: 'LEAD_DELETED',
      description: `Lead "${lead.name}" (ID: ${id}) deleted`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { listLeads, getLeadById, createLead, updateLead, deleteLead };
