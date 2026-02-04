import React, { useState } from 'react';
import { UserList } from './components/UserList';
import { ServerList } from './components/ServerList';
import { AskJarvis } from './components/AskJarvis';

type Tab = 'users' | 'servers' | 'ask';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">JARVIS</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Just-in-time Autonomic Response & Virtualization Infrastructure System
              </p>
            </div>
            <div className="text-sm font-medium">Piyoosh Rai</div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 border-b-2 transition-colors duration-150 ${
                activeTab === 'users'
                  ? 'border-black text-black font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('servers')}
              className={`py-3 border-b-2 transition-colors duration-150 ${
                activeTab === 'servers'
                  ? 'border-black text-black font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Servers
            </button>
            <button
              onClick={() => setActiveTab('ask')}
              className={`py-3 border-b-2 transition-colors duration-150 ${
                activeTab === 'ask'
                  ? 'border-black text-black font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ask JARVIS
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'users' && <UserList />}
        {activeTab === 'servers' && <ServerList />}
        {activeTab === 'ask' && <AskJarvis />}
      </main>
    </div>
  );
}

export default App;
