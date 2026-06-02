import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLeadApi, deleteLeadApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, Spinner, Alert } from '../components/shared';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLeadApi(id)
      .then((res) => { setLead(res.data.lead); setLogs(res.data.activityLogs || []); })
      .catch(() => setError('Failed to load lead'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await deleteLeadApi(id);
      navigate('/leads');
    } catch {
      setError('Failed to delete lead');
    }
  };

  if (loading) return <div className="container mt-4 text-center"><Spinner /></div>;
  if (error) return <div className="container mt-4"><Alert message={error} /></div>;
  if (!lead) return null;

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="container mt-4" style={{ maxWidth: 760 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">{lead.name}</h4>
        <div className="d-flex gap-2">
          <Link to={`/leads/${id}/edit`} className="btn btn-sm btn-outline-dark">Edit</Link>
          {canManage && <button className="btn btn-sm btn-outline-danger" onClick={handleDelete}>Delete</button>}
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      <div className="row g-3">
        {/* Lead Info */}
        <div className="col-md-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Lead Information</div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><th className="text-muted fw-normal w-35">Status</th><td><StatusBadge status={lead.status} /></td></tr>
                  <tr><th className="text-muted fw-normal">Email</th><td>{lead.email || '—'}</td></tr>
                  <tr><th className="text-muted fw-normal">Phone</th><td>{lead.phone || '—'}</td></tr>
                  <tr><th className="text-muted fw-normal">Source</th><td className="text-capitalize">{lead.source?.replace('_', ' ') || '—'}</td></tr>
                  <tr><th className="text-muted fw-normal">Assigned To</th><td>{lead.assigned_to_name || '—'}</td></tr>
                  <tr><th className="text-muted fw-normal">Created By</th><td>{lead.created_by_name || '—'}</td></tr>
                  <tr><th className="text-muted fw-normal">Created</th><td>{new Date(lead.created_at).toLocaleString()}</td></tr>
                  <tr><th className="text-muted fw-normal">Updated</th><td>{new Date(lead.updated_at).toLocaleString()}</td></tr>
                  {lead.notes && <tr><th className="text-muted fw-normal">Notes</th><td style={{ whiteSpace: 'pre-wrap' }}>{lead.notes}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Activity Log</div>
            <div className="card-body p-0" style={{ maxHeight: 340, overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div className="text-center text-muted p-3 small">No activity yet</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {logs.map((log) => (
                    <li key={log.id} className="list-group-item px-3 py-2">
                      <div className="d-flex justify-content-between">
                        <span className="badge bg-light text-dark border small">{log.action.replace(/_/g, ' ')}</span>
                        <small className="text-muted">{new Date(log.created_at).toLocaleDateString()}</small>
                      </div>
                      {log.description && <div className="small text-muted mt-1">{log.description}</div>}
                      {log.user_name && <div className="small text-muted">by {log.user_name}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
