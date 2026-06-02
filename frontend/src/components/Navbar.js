import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
      <Link className="navbar-brand fw-bold" to="/dashboard">📊 LeadMS</Link>
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span className="navbar-toggler-icon" />
      </button>
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav me-auto">
          <li className="nav-item">
            <Link className={isActive('/dashboard')} to="/dashboard">Dashboard</Link>
          </li>
          <li className="nav-item">
            <Link className={isActive('/leads')} to="/leads">Leads</Link>
          </li>
          {user.role === 'admin' && (
            <li className="nav-item">
              <Link className={isActive('/users')} to="/users">Users</Link>
            </li>
          )}
        </ul>
        <div className="navbar-nav">
          <span className="nav-link text-light">
            <span className="badge bg-secondary me-1">{user.role}</span>
            {user.name}
          </span>
          <button className="btn btn-sm btn-outline-light ms-2" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
