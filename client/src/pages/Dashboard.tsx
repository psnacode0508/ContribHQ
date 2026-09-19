import { useAuth } from '../contexts/AuthContext';
import { Bookmark, Clock, GitMerge, GitPullRequest } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    { name: 'Saved Issues', value: '0', icon: Bookmark, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'In Progress', value: '0', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { name: 'Pull Requests', value: '0', icon: GitPullRequest, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { name: 'Merged', value: '0', icon: GitMerge, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Welcome back, {user?.displayName}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Here is an overview of your open source journey.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className={`absolute rounded-md p-3 ${item.bg}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-400">{item.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-white">{item.value}</p>
            </dd>
          </div>
        ))}
      </dl>
      
      <div className="mt-8 rounded-xl bg-gray-800 border border-gray-700 p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-gray-400">Your recent activity will appear here.</p>
      </div>
    </div>
  );
}
