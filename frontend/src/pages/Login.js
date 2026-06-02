import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner } from '../components/shared';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('All fields are required'); return; }
    setLoading(true);
    setError('');
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-4">
          <h2 className="card-title text-center mb-1 fw-bold">📊 LeadMS</h2>
          <p className="text-center text-muted mb-4">Lead Management System</p>
          <Alert message={error} onClose={() => setError('')} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email" name="email" className="form-control"
                value={form.email} onChange={handleChange}
                placeholder="you@example.com" required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password" name="password" className="form-control"
                value={form.password} onChange={handleChange}
                placeholder="••••••••" required
              />
            </div>
            <button type="submit" className="btn btn-dark w-100" disabled={loading}>
              {loading ? <><Spinner /> Logging in...</> : 'Login'}
            </button>
          </form>
          <hr />
          <p className="text-center mb-0 small">
            No account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
