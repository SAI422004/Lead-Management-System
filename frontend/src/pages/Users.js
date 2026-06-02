import React, { useEffect, useState } from 'react';
import { getUsersApi, updateUserApi } from '../services/api';
import { Alert, Spinner } from '../components/shared';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    getUsersApi()
      .then((res) => setUsers(res.data.users))
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleActive = async (user) => {
    try {
      await updateUserApi(user.id, { is_active: !user.is_active });
      setSuccess(`User ${user.name} ${!user.is_active ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch {
      setError('Failed to update user');
    }
  };

  const roleBadge = { admin: 'danger', manager: 'warning', agent: 'info' };

  return (
    <div className="container-fluid mt-4 px-4">
      <h4 className="mb-3">User Management</h4>
      <Alert message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-4"><Spinner /></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Leads Assigned</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-semibold">{u.name}</td>
                      <td className="text-muted small">{u.email}</td>
                      <td><span className={`badge bg-${roleBadge[u.role] || 'secondary'}`}>{u.role}</span></td>
                      <td>{u.lead_count ?? '—'}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="small text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className={`btn btn-sm py-0 px-2 ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => toggleActive(u)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
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

export default Users;
