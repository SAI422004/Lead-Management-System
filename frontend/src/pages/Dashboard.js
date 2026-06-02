import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeadsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, Spinner, Alert } from '../components/shared';

const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all leads for stats + recent 5
        const res = await getLeadsApi({ limit: 100, page: 1 });
        const leads = res.data.leads;
        const total = res.data.pagination.total;

        const statusCounts = {};
        statuses.forEach((s) => { statusCounts[s] = 0; });
        leads.forEach((l) => { if (statusCounts[l.status] !== undefined) statusCounts[l.status]++; });

        setStats({ total, statusCounts });
        setRecentLeads(leads.slice(0, 5));
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="container mt-4 text-center"><Spinner /></div>;

  const statColors = { new: 'secondary', contacted: 'info', qualified: 'primary', converted: 'success', lost: 'danger' };

  return (
    <div className="container-fluid mt-4 px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">Welcome, {user?.name} 👋</h4>
          <small className="text-muted text-capitalize">{user?.role} Dashboard</small>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Link to="/leads/new" className="btn btn-dark btn-sm">+ New Lead</Link>
        )}
      </div>

      <Alert message={error} />

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-2">
          <div className="card text-center border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="fs-2 fw-bold">{stats.total ?? 0}</div>
              <div className="text-muted small">Total Leads</div>
            </div>
          </div>
        </div>
        {statuses.map((s) => (
          <div className="col-6 col-md-2" key={s}>
            <div className={`card text-center border-0 shadow-sm h-100 border-top border-3 border-${statColors[s]}`}>
              <div className="card-body">
                <div className="fs-2 fw-bold">{stats.statusCounts?.[s] ?? 0}</div>
                <div className="text-muted small text-capitalize">{s}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Leads */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <span className="fw-semibold">Recent Leads</span>
          <Link to="/leads" className="btn btn-outline-dark btn-sm">View All</Link>
        </div>
        <div className="card-body p-0">
          {recentLeads.length === 0 ? (
            <div className="text-center text-muted p-4">No leads yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td><Link to={`/leads/${lead.id}`} className="text-decoration-none">{lead.name}</Link></td>
                      <td className="text-muted small">{lead.email || '—'}</td>
                      <td className="text-capitalize small">{lead.source?.replace('_', ' ') || '—'}</td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td className="small">{lead.assigned_to_name || '—'}</td>
                      <td className="small text-muted">{new Date(lead.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
