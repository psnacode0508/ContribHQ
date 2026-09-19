import { Briefcase } from 'lucide-react';

export default function Workspace() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          My Workspace
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Manage your contributions, track PRs, and organize tasks.
        </p>
      </div>

      <div className="rounded-xl bg-gray-800 border border-gray-700 p-12 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-purple-400/10 p-4 mb-4">
          <Briefcase className="h-10 w-10 text-purple-400" />
        </div>
        <h3 className="mt-2 text-lg font-semibold text-white">Workspace Coming Soon</h3>
        <p className="mt-1 text-sm text-gray-400 max-w-md">
          Your personal contribution kanban board is under construction. Soon you will be able to track all your open source work here.
        </p>
      </div>
    </div>
  );
}
