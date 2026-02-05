import { useState, useEffect, type FC } from 'react';
import { Table } from './Table';
import { Button } from './Button';

interface Server {
  id: string;
  name: string;
  provider: string;
  size: string;
  cost_monthly: number;
  status: string;
  region?: string;
}

interface ServerListResponse {
  servers: Server[];
  total: number;
  monthly_cost: number;
}

export const ServerList: FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [totalServers, setTotalServers] = useState(0);
  const [monthlyCost, setMonthlyCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/servers`);
      if (!response.ok) throw new Error('Failed to fetch servers');
      const data: ServerListResponse = await response.json();
      setServers(data.servers);
      setTotalServers(data.total);
      setMonthlyCost(data.monthly_cost);
    } catch (err) {
      setError('Server management integrations coming soon...');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name' as keyof Server,
      className: 'font-medium',
    },
    {
      header: 'Provider',
      accessor: 'provider' as keyof Server,
    },
    {
      header: 'Size',
      accessor: 'size' as keyof Server,
    },
    {
      header: 'Region',
      accessor: 'region' as keyof Server,
    },
    {
      header: 'Cost/Month',
      accessor: (server: Server) => `$${server.cost_monthly.toFixed(2)}`,
    },
    {
      header: 'Status',
      accessor: (server: Server) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
            server.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Infrastructure</h2>
        <div className="flex items-center gap-3">
          <Button variant="secondary" disabled>
            Sync All
          </Button>
          <Button variant="primary" disabled>
            + New Server
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-500">Total Servers:</span>{' '}
          <span className="font-semibold">{totalServers}</span>
        </div>
        <div>
          <span className="text-gray-500">Monthly Cost:</span>{' '}
          <span className="font-semibold">${monthlyCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Info message */}
      {error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
          {error}
          <div className="mt-2 text-sm">
            <strong>Coming next:</strong> DigitalOcean, AWS EC2, and GoDaddy integrations will allow you to:
            <ul className="list-disc list-inside mt-1">
              <li>View all servers across providers in one place</li>
              <li>Provision new servers</li>
              <li>Monitor costs and usage</li>
              <li>Manage server lifecycle</li>
            </ul>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading servers...</div>
      ) : servers.length === 0 && !error ? (
        <div className="border border-gray-200 rounded p-12 text-center text-gray-500">
          No servers found. Add cloud provider credentials to get started.
        </div>
      ) : (
        servers.length > 0 && <Table columns={columns} data={servers} />
      )}
    </div>
  );
};
