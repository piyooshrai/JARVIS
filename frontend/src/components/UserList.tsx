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
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

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

  const handleDisableUser = async (user: User) => {
    if (!user.account_enabled) return; // Already disabled

    if (!confirm(`Disable ${user.display_name}? This will release their license.`)) {
      return;
    }

    setActionLoading(user.id);
    try {
      await apiClient.disableUser(user.id);
      await loadUsers(); // Refresh the list
    } catch (err) {
      alert('Failed to disable user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setActionLoading(userToDelete.id);
    try {
      await apiClient.deleteUser(userToDelete.id);
      setUserToDelete(null);
      await loadUsers(); // Refresh the list
    } catch (err) {
      alert('Failed to delete user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkDisable = async () => {
    const usersToDisable = users.filter(u => selectedUserIds.has(u.id) && u.account_enabled);

    if (usersToDisable.length === 0) {
      alert('No active users selected to disable.');
      return;
    }

    if (!confirm(`Disable ${usersToDisable.length} user(s)? This will release their licenses.`)) {
      return;
    }

    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const user of usersToDisable) {
      try {
        await apiClient.disableUser(user.id);
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Failed to disable ${user.email}:`, err);
      }
    }

    setBulkActionLoading(false);
    setSelectedUserIds(new Set());
    await loadUsers();

    alert(`Disabled ${successCount} user(s). ${failCount > 0 ? `Failed: ${failCount}` : ''}`);
  };

  const handleBulkDelete = async () => {
    const usersToDelete = users.filter(u => selectedUserIds.has(u.id));

    if (usersToDelete.length === 0) {
      alert('No users selected to delete.');
      return;
    }

    if (!confirm(`PERMANENTLY DELETE ${usersToDelete.length} user(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const user of usersToDelete) {
      try {
        await apiClient.deleteUser(user.id);
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Failed to delete ${user.email}:`, err);
      }
    }

    setBulkActionLoading(false);
    setSelectedUserIds(new Set());
    await loadUsers();

    alert(`Deleted ${successCount} user(s). ${failCount > 0 ? `Failed: ${failCount}` : ''}`);
  };

  const handleAnalyzeUsers = async () => {
    setAiLoading(true);
    setAiAnalysisOpen(true);
    setAiAnalysis('');

    try {
      const result = await apiClient.analyzeUsers();
      setAiAnalysis(result.response);
    } catch (err) {
      setAiAnalysis('Failed to analyze users: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setAiLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Domain', 'Last Sign-in', 'Status', 'License Type', 'Department'];
    const csvData = users.map(user => [
      user.display_name,
      user.email,
      user.domain,
      formatDate(user.last_sign_in),
      user.account_enabled ? 'Active' : 'Disabled',
      user.license_type || 'None',
      user.department || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `jarvis-users-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.display_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query)
    );
  });

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
          onChange={toggleSelectAll}
          className="rounded border-gray-300"
        />
      ),
      accessor: (user: User) => (
        <input
          type="checkbox"
          checked={selectedUserIds.has(user.id)}
          onChange={() => toggleUserSelection(user.id)}
          className="rounded border-gray-300"
        />
      ),
    },
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
    {
      header: 'Actions',
      accessor: (user: User) => (
        <div className="flex gap-2">
          {user.account_enabled && (
            <button
              onClick={() => handleDisableUser(user)}
              disabled={actionLoading === user.id}
              className="text-xs px-2 py-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              {actionLoading === user.id ? '...' : 'Disable'}
            </button>
          )}
          <button
            onClick={() => setUserToDelete(user)}
            disabled={actionLoading === user.id}
            className="text-xs px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black w-64"
            />
          </div>
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

          {selectedUserIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedUserIds.size} selected
              </span>
              <Button
                variant="secondary"
                onClick={handleBulkDisable}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? 'Processing...' : 'Bulk Disable'}
              </Button>
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? 'Processing...' : 'Bulk Delete'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={exportToCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={handleAnalyzeUsers}>
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
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? 'No users match your search.' : 'No users found.'}
        </div>
      ) : (
        <Table columns={columns} data={filteredUsers} />
      )}

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={loadUsers}
      />

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setUserToDelete(null)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold mb-4">Delete User</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to permanently delete{' '}
                <strong>{userToDelete.display_name}</strong> ({userToDelete.email})?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setUserToDelete(null)}
                  disabled={actionLoading === userToDelete.id}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteUser}
                  disabled={actionLoading === userToDelete.id}
                >
                  {actionLoading === userToDelete.id ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {aiAnalysisOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => !aiLoading && setAiAnalysisOpen(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded shadow-xl max-w-2xl w-full p-6">
              <h2 className="text-lg font-semibold mb-4">AI User Analysis</h2>

              {aiLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Analyzing users with Claude AI...</div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {aiAnalysis}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setAiAnalysisOpen(false)}
                  disabled={aiLoading}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
