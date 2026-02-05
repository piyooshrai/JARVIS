import { useState } from 'react';
import { UserList } from './components/UserList';
import { ServerList } from './components/ServerList';
import { AskJarvis } from './components/AskJarvis';

type Tab = 'users' | 'servers' | 'ask';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="min-h-screen bg-white pb-safe">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">JARVIS</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">
                Infrastructure Management System
              </p>
            </div>
            <div className="text-xs sm:text-sm font-medium text-gray-700 ml-4">PR</div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-200 sticky top-[57px] sm:top-[65px] bg-white z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-4 sm:gap-8 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-1 border-b-2 transition-colors duration-150 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'users'
                  ? 'border-black text-black font-medium'
                  : 'border-transparent text-gray-500 active:text-gray-700'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('servers')}
              className={`py-3 px-1 border-b-2 transition-colors duration-150 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'servers'
                  ? 'border-black text-black font-medium'
                  : 'border-transparent text-gray-500 active:text-gray-700'
              }`}
            >
              Infrastructure
            </button>
            <button
              onClick={() => setActiveTab('ask')}
              className={`py-3 px-1 border-b-2 transition-colors duration-150 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'ask'
                  ? 'border-black text-black font-medium'
                  : 'border-transparent text-gray-500 active:text-gray-700'
              }`}
            >
              Ask JARVIS
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {activeTab === 'users' && <UserList />}
        {activeTab === 'servers' && <ServerList />}
        {activeTab === 'ask' && <AskJarvis />}
      </main>
    </div>
  );
}

export default App;
