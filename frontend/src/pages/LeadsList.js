import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLeadsApi, deleteLeadApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, Pagination, Spinner, Alert } from '../components/shared';

const STATUSES = ['', 'new', 'contacted', 'qualified', 'converted', 'lost'];
const SOURCES = ['', 'website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'other'];

const LeadsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState({
    search: '', status: '', source: '', sortBy: 'created_at', sortDir: 'desc', page: 1,
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await getLeadsApi(params);
      setLeads(res.data.leads);
      setPagination(res.data.pagination);
    } catch {
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  const handleSort = (field) => setFilters((f) => ({
    ...f, sortBy: field, sortDir: f.sortBy === field && f.sortDir === 'asc' ? 'desc' : 'asc', page: 1,
  }));

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete lead "${name}"?`)) return;
    try {
      await deleteLeadApi(id);
      setSuccess('Lead deleted');
      fetchLeads();
    } catch {
      setError('Failed to delete lead');
    }
  };

  const sortIcon = (field) => {
    if (filters.sortBy !== field) return ' ⇅';
    return filters.sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="container-fluid mt-4 px-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Leads</h4>
        {canManage && <Link to="/leads/new" className="btn btn-dark btn-sm">+ New Lead</Link>}
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-4">
              <input
                type="text" className="form-control form-control-sm"
                placeholder="Search name, email, phone..."
                value={filters.search}
                onChange={(e) => handleFilter('search', e.target.value)}
              />
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select form-select-sm" value={filters.status} onChange={(e) => handleFilter('status', e.target.value)}>
                <option value="">All Statuses</option>
                {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select form-select-sm" value={filters.source} onChange={(e) => handleFilter('source', e.target.value)}>
                <option value="">All Sources</option>
                {SOURCES.filter(Boolean).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="col-auto">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilters({ search: '', status: '', source: '', sortBy: 'created_at', sortDir: 'desc', page: 1 })}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-4"><Spinner /></div>
          ) : leads.length === 0 ? (
            <div className="text-center text-muted p-4">No leads found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>Name{sortIcon('name')}</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('source')}>Source{sortIcon('source')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>Status{sortIcon('status')}</th>
                    <th>Assigned To</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>Created{sortIcon('created_at')}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <Link to={`/leads/${lead.id}`} className="text-decoration-none fw-semibold">{lead.name}</Link>
                      </td>
                      <td className="text-muted small">{lead.email || '—'}</td>
                      <td className="small">{lead.phone || '—'}</td>
                      <td className="small text-capitalize">{lead.source?.replace('_', ' ') || '—'}</td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td className="small">{lead.assigned_to_name || '—'}</td>
                      <td className="small text-muted">{new Date(lead.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-xs btn-outline-secondary btn-sm me-1 py-0 px-1" onClick={() => navigate(`/leads/${lead.id}/edit`)}>Edit</button>
                        {canManage && (
                          <button className="btn btn-xs btn-outline-danger btn-sm py-0 px-1" onClick={() => handleDelete(lead.id, lead.name)}>Del</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loading && <div className="card-footer bg-white">
          <Pagination pagination={pagination} onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </div>}
      </div>
    </div>
  );
};

export default LeadsList;
