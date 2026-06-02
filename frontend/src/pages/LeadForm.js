import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createLeadApi, updateLeadApi, getLeadApi } from '../services/api';
import { Alert, Spinner } from '../components/shared';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const SOURCES = ['website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'other'];

const empty = { name: '', email: '', phone: '', source: 'website', status: 'new', notes: '' };

const LeadForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      getLeadApi(id)
        .then((res) => {
          const l = res.data.lead;
          setForm({ name: l.name, email: l.email || '', phone: l.phone || '', source: l.source || 'website', status: l.status, notes: l.notes || '' });
        })
        .catch(() => setApiError('Failed to load lead'))
        .finally(() => setFetching(false));
    }
  }, [id, isEdit]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (form.phone && !/^[\d\s\+\-\(\)]{7,15}$/.test(form.phone)) errs.phone = 'Invalid phone';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      if (isEdit) {
        await updateLeadApi(id, form);
      } else {
        await createLeadApi(form);
      }
      navigate('/leads');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Operation failed';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="container mt-4 text-center"><Spinner /></div>;

  return (
    <div className="container mt-4" style={{ maxWidth: 640 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">{isEdit ? 'Edit Lead' : 'New Lead'}</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <Alert message={apiError} onClose={() => setApiError('')} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label">Name <span className="text-danger">*</span></label>
              <input type="text" name="name" className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={handleChange} />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input type="email" name="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={form.email} onChange={handleChange} />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input type="tel" name="phone" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} value={form.phone} onChange={handleChange} />
                {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Source</label>
                <select name="source" className="form-select" value={form.source} onChange={handleChange}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select name="status" className="form-select" value={form.status} onChange={handleChange}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Notes</label>
              <textarea name="notes" className="form-control" rows={3} value={form.notes} onChange={handleChange} />
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-dark" disabled={loading}>
                {loading ? <><Spinner /> Saving...</> : isEdit ? 'Update Lead' : 'Create Lead'}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LeadForm;
