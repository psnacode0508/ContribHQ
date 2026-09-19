import { useState, useEffect } from 'react';
import { Search, GitFork, Tag, AlertCircle, Loader2 } from 'lucide-react';

interface Issue {
  id: number;
  title: string;
  url: string;
  repository: string;
  repositoryUrl: string;
  labels: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

export default function Discover() {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [category, setCategory] = useState('');
  const [issueLabel, setIssueLabel] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchIssues = async (searchQuery: string, lang: string, cat: string, label: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('http://localhost:5000/api/issues');
      if (searchQuery) url.searchParams.append('q', searchQuery);
      if (lang) url.searchParams.append('language', lang);
      if (cat) url.searchParams.append('category', cat);
      if (label) url.searchParams.append('label', label);

      const res = await fetch(url.toString(), {
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch issues');
      }
      
      setIssues(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching issues.');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchIssues('', '', '', '');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIssues(query, language, category, issueLabel);
  };

  const getLabelColor = (labelName: string) => {
    const text = labelName.toLowerCase();
    if (text.includes('good first issue')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (text.includes('help wanted')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (text.includes('bug')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (text.includes('documentation') || text.includes('docs')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-gray-700 text-gray-300 border-gray-600';
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Discover Issues
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Find beginner-friendly open-source issues to contribute to. We've curated them just for you.
        </p>
      </div>

      <div className="mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-xl border-0 bg-gray-800/50 py-4 pl-12 pr-24 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 backdrop-blur-sm transition-all"
              placeholder="Search by keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute inset-y-2 right-2 flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={language}
              onChange={(e) => { setLanguage(e.target.value); fetchIssues(query, e.target.value, category, issueLabel); }}
              className="block w-full rounded-lg border-0 bg-gray-800 py-2.5 pl-3 pr-10 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Languages</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="c++">C++</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
            
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); fetchIssues(query, language, e.target.value, issueLabel); }}
              className="block w-full rounded-lg border-0 bg-gray-800 py-2.5 pl-3 pr-10 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Categories</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Database">Database</option>
              <option value="DevOps">DevOps</option>
              <option value="Testing">Testing</option>
              <option value="Documentation">Documentation</option>
              <option value="Bug Fix">Bug Fix</option>
            </select>

            <select
              value={issueLabel}
              onChange={(e) => { setIssueLabel(e.target.value); fetchIssues(query, language, category, e.target.value); }}
              className="block w-full rounded-lg border-0 bg-gray-800 py-2.5 pl-3 pr-10 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Good First Issue / Help Wanted</option>
              <option value="good first issue">Good First Issue Only</option>
              <option value="help wanted">Help Wanted Only</option>
            </select>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-4 mb-8 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-400">Error retrieving issues</h3>
            <div className="mt-1 text-sm text-red-300">
              {error}
            </div>
            {error.includes('token') && (
              <p className="mt-2 text-xs text-red-300 opacity-80">
                You might need to log out and log back in to refresh your GitHub session.
              </p>
            )}
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="mb-6 flex items-center justify-between text-sm text-gray-400">
          <p>Found <span className="font-semibold text-white">{totalCount.toLocaleString()}</span> issues matching your criteria</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-800 bg-gray-800/20 p-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-gray-700/50 flex-shrink-0"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
                  <div className="pt-4 flex gap-2">
                    <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
                    <div className="h-6 w-24 bg-gray-700/50 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {issues.map((issue) => (
            <div 
              key={issue.id} 
              className="group relative flex flex-col justify-between rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-sm hover:border-gray-500 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <a 
                      href={issue.repositoryUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center text-sm font-medium text-gray-400 hover:text-blue-400 transition-colors truncate max-w-[200px]"
                      title={issue.repository}
                    >
                      <GitFork className="mr-1.5 h-4 w-4 shrink-0" />
                      <span className="truncate">{issue.repository}</span>
                    </a>
                    
                    {issue.category !== 'Other' && (
                      <span className="inline-flex items-center rounded-md bg-purple-400/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-400/30">
                        {issue.category}
                      </span>
                    )}
                  </div>
                  
                  <span className="text-xs text-gray-500 whitespace-nowrap shrink-0 ml-2">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-4 line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
                  <a href={issue.url} target="_blank" rel="noreferrer" className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true"></span>
                    {issue.title}
                  </a>
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4 relative z-10">
                {issue.labels.slice(0, 5).map((label) => (
                  <span 
                    key={label} 
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getLabelColor(label)}`}
                  >
                    {label}
                  </span>
                ))}
                {issue.labels.length > 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
                    +{issue.labels.length - 5}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && issues.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-2 text-sm font-semibold text-white">No issues found</h3>
          <p className="mt-1 text-sm text-gray-400">
            We couldn't find any issues matching your search criteria. Try a different keyword.
          </p>
        </div>
      )}
    </div>
  );
}
