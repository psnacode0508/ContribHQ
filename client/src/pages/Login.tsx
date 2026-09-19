import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, login } = useAuth();
  const [health, setHealth] = useState<string>('Loading...');

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHealth(data.message)
        } else {
          setHealth('Error: Backend not running correctly')
        }
      })
      .catch(() => setHealth('Error: Could not connect to backend'))
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        ContribHQ
      </h1>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-md w-full mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-300">Backend Status</h2>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${health.includes('Error') ? 'bg-red-500' : health.includes('Loading') ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <p className="text-lg font-medium">{health}</p>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4 text-gray-300">Authentication</h2>
        <div className="flex justify-center">
          <button 
            onClick={login}
            className="flex items-center space-x-2 px-6 py-3 bg-white text-gray-900 hover:bg-gray-200 font-bold rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span>Login with GitHub</span>
          </button>
        </div>
      </div>
    </div>
  );
}
