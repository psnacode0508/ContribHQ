import { Compass } from 'lucide-react';

export default function Discover() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Discover Issues
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Find beginner-friendly open-source issues to contribute to.
        </p>
      </div>

      <div className="rounded-xl bg-gray-800 border border-gray-700 p-12 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-blue-400/10 p-4 mb-4">
          <Compass className="h-10 w-10 text-blue-400" />
        </div>
        <h3 className="mt-2 text-lg font-semibold text-white">Issue Discovery Coming Soon</h3>
        <p className="mt-1 text-sm text-gray-400 max-w-md">
          We are currently building the issue matching engine. Check back later to find the perfect issue for your skills.
        </p>
      </div>
    </div>
  );
}
