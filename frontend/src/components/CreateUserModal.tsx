import { useState, useEffect, type FC, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { apiClient, Domain, CreateUserRequest } from '../api/client';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export const CreateUserModal: FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [department, setDepartment] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [licenseType, setLicenseType] = useState('Business Basic');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDomains();
    }
  }, [isOpen]);

  const loadDomains = async () => {
    try {
      const fetchedDomains = await apiClient.getDomains();
      setDomains(fetchedDomains);
      if (fetchedDomains.length > 0) {
        setSelectedDomain(fetchedDomains[0].name);
      }
    } catch (err) {
      setError('Failed to load domains');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData: CreateUserRequest = {
        full_name: fullName,
        username,
        domain: selectedDomain,
        department: department || undefined,
        manager_email: managerEmail || undefined,
        license_type: licenseType,
      };

      await apiClient.createUser(userData);
      onUserCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFullName('');
    setUsername('');
    setDepartment('');
    setManagerEmail('');
    setLicenseType('Business Basic');
    setError('');
    onClose();
  };

  const estimatedCost = licenseType === 'Business Standard' ? 12.50 : 6.00;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New User">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="username"
                required
              />
              <span className="flex items-center text-gray-500">@</span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              >
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.name}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department (Optional)
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager Email (Optional)
            </label>
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Type
            </label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            >
              <option value="Business Basic">Business Basic</option>
              <option value="Business Standard">Business Standard</option>
            </select>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded px-4 py-2 text-sm">
            <span className="font-medium">Estimated cost:</span> ${estimatedCost.toFixed(2)}/month
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
