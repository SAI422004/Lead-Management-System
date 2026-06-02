import React from 'react';

export const Spinner = () => (
  <div className="spinner-border spinner-border-sm" role="status">
    <span className="visually-hidden">Loading...</span>
  </div>
);

export const Alert = ({ type = 'danger', message, onClose }) => {
  if (!message) return null;
  return (
    <div className={`alert alert-${type} alert-dismissible`} role="alert">
      {message}
      {onClose && <button type="button" className="btn-close" onClick={onClose} />}
    </div>
  );
};

export const StatusBadge = ({ status }) => {
  const map = {
    new: 'secondary',
    contacted: 'info',
    qualified: 'primary',
    converted: 'success',
    lost: 'danger',
  };
  return <span className={`badge bg-${map[status] || 'secondary'}`}>{status}</span>;
};

export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <small className="text-muted">Total: {total} records</small>
      <nav>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(page - 1)}>‹</button>
          </li>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
            </li>
          ))}
          <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(page + 1)}>›</button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) { window.location.href = '/login'; return null; }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="container mt-4"><Alert type="danger" message="Access denied." /></div>;
  }
  return children;
};
