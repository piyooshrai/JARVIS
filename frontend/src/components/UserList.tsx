import { useState, useEffect, type FC } from 'react';
import { Table } from './Table';
import { Button } from './Button';
import { CreateUserModal } from './CreateUserModal';
import { apiClient, User, UserListResponse, Domain } from '../api/client';

export const UserList: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [monthlyCost, setMonthlyCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadDomains();
    loadUsers();
  }, [selectedDomain]);

  const loadDomains = async () => {
    try {
      const fetchedDomains = await apiClient.getDomains();
      setDomains(fetchedDomains);
    } catch (err) {
      console.error('Failed to load domains', err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response: UserListResponse = await apiClient.getUsers(
        selectedDomain || undefined
      );
      setUsers(response.users);
      setTotalUsers(response.total);
      setMonthlyCost(response.monthly_cost);
    } catch (err) {
      setError('Failed to load users. Please check your API connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'display_name' as keyof User,
      className: 'font-medium',
    },
    {
      header: 'Email',
      accessor: 'email' as keyof User,
    },
    {
      header: 'Domain',
      accessor: 'domain' as keyof User,
    },
    {
      header: 'Last Sign-in',
      accessor: (user: User) => formatDate(user.last_sign_in),
    },
    {
      header: 'Status',
      accessor: (user: User) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
            user.account_enabled
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {user.account_enabled ? 'Active' : 'Disabled'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Filter by domain:
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            >
              <option value="">All Domains</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.name}>
                  {domain.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => {}}>
            Cleanup Inactive Users
          </Button>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            + New User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-500">Total Users:</span>{' '}
          <span className="font-semibold">{totalUsers}</span>
        </div>
        <div>
          <span className="text-gray-500">Monthly Cost:</span>{' '}
          <span className="font-semibold">${monthlyCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading users...</div>
      ) : (
        <Table columns={columns} data={users} />
      )}

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={loadUsers}
      />
    </div>
  );
};
