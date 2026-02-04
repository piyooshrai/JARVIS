import React from 'react';
import { Button } from './Button';

export const ServerList: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Servers</h2>
        <Button variant="primary">+ New Server</Button>
      </div>

      <div className="border border-gray-200 rounded p-12 text-center text-gray-500">
        Server management coming soon...
      </div>
    </div>
  );
};
