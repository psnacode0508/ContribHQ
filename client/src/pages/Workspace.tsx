import { useState, useEffect } from 'react';
import { GitFork, Trash2, ArrowRight, ArrowLeft, Loader2, AlertCircle, RefreshCw, X, Terminal, Settings } from 'lucide-react';

type CardStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'MERGED';

interface WorkspaceCard {
  id: string;
  githubIssueId: number;
  title: string;
  url: string;
  repository: string;
  labels: string[];
  category?: string;
  language?: string;
  status: CardStatus;
  prNumber?: number;
  prUrl?: string;
  prState?: string;
  createdAt: string;
}

const COLUMNS: { id: CardStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'border-gray-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-500' },
  { id: 'REVIEW', title: 'Review', color: 'border-yellow-500' },
  { id: 'MERGED', title: 'Merged', color: 'border-purple-500' },
];

export default function Workspace() {
  const [cards, setCards] = useState<WorkspaceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Setup Modal State
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupRepo, setSetupRepo] = useState('');
  const [setupData, setSetupData] = useState<any>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  const openSetupModal = async (repository: string) => {
    setSetupRepo(repository);
    setSetupModalOpen(true);
    setSetupLoading(true);
    setSetupError('');
    setSetupData(null);
    
    try {
      const res = await fetch(`http://localhost:5000/api/workspace/env-setup?repository=${repository}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch setup instructions');
      const data = await res.json();
      setSetupData(data);
    } catch (err: any) {
      setSetupError(err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('http://localhost:5000/api/workspace/sync', {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to sync PR status');
      await fetchWorkspace();
    } catch (err) {
      alert('Failed to sync PR status');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const fetchWorkspace = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/workspace', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch workspace');
      const data = await res.json();
      setCards(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: CardStatus) => {
    // Optimistic update
    const previousCards = [...cards];
    setCards(cards.map(c => c.id === id ? { ...c, status: newStatus } : c));
    
    try {
      const res = await fetch(`http://localhost:5000/api/workspace/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
    } catch (err) {
      // Revert on error
      setCards(previousCards);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this issue from your workspace?')) return;
    
    const previousCards = [...cards];
    setCards(cards.filter(c => c.id !== id));
    
    try {
      const res = await fetch(`http://localhost:5000/api/workspace/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete issue');
    } catch (err) {
      setCards(previousCards);
      alert('Failed to delete issue');
    }
  };

  const getLabelColor = (labelName: string) => {
    const text = labelName.toLowerCase();
    if (text.includes('good first issue')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (text.includes('help wanted')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (text.includes('bug')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-700 text-gray-300 border-gray-600';
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <h3 className="text-sm font-medium text-red-400">Error loading workspace</h3>
        </div>
        <p className="mt-1 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="pb-12 h-full flex flex-col">
      <div className="mb-8 shrink-0 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
            My Workspace
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Track issues you are working on. Move them across the board as you progress.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center px-4 py-2 bg-gray-800 text-sm font-medium text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors border border-gray-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing PRs...' : 'Sync PR Status'}
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 min-w-max h-full pb-4">
          {COLUMNS.map(col => {
            const columnCards = cards.filter(c => c.status === col.id);
            const colIndex = COLUMNS.findIndex(c => c.id === col.id);
            const prevCol = colIndex > 0 ? COLUMNS[colIndex - 1] : null;
            const nextCol = colIndex < COLUMNS.length - 1 ? COLUMNS[colIndex + 1] : null;

            return (
              <div key={col.id} className="w-80 flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${col.color}`}>
                  <h3 className="font-semibold text-white">{col.title}</h3>
                  <span className="text-xs font-medium bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                    {columnCards.length}
                  </span>
                </div>
                
                <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                  {columnCards.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500 border border-dashed border-gray-800 rounded-lg">
                      No issues here
                    </div>
                  ) : (
                    columnCards.map(card => (
                      <div key={card.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:border-gray-600 transition-colors group relative flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <a 
                            href={card.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="font-medium text-sm text-white hover:text-blue-400 transition-colors line-clamp-2"
                          >
                            {card.title}
                          </a>
                          <button 
                            onClick={() => handleDelete(card.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors ml-2 opacity-0 group-hover:opacity-100 shrink-0"
                            title="Remove from Workspace"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center text-xs text-gray-400 truncate">
                            <GitFork className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">{card.repository}</span>
                          </div>
                          <button 
                            onClick={() => openSetupModal(card.repository)} 
                            className="text-[10px] font-medium bg-gray-700/50 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded flex items-center transition-colors shrink-0 ml-2 border border-gray-600/50 hover:border-gray-500"
                            title="Environment Setup"
                          >
                            <Terminal className="h-3 w-3 mr-1" />
                            Setup
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {card.category && card.category !== 'Other' && (
                            <span className="inline-flex items-center rounded-sm bg-purple-400/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400 ring-1 ring-inset ring-purple-400/30">
                              {card.category}
                            </span>
                          )}
                          {card.labels.slice(0, 2).map(label => (
                            <span 
                              key={label}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border ${getLabelColor(label)} truncate max-w-[120px]`}
                            >
                              {label}
                            </span>
                          ))}
                        </div>

                        <div className="mt-auto flex items-center justify-between border-t border-gray-700 pt-3">
                          <div className="flex gap-2">
                            {prevCol && (
                              <button 
                                onClick={() => handleStatusChange(card.id, prevCol.id)}
                                className="p-1 rounded hover:bg-gray-700 text-gray-400 transition-colors"
                                title={`Move to ${prevCol.title}`}
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </button>
                            )}
                            {nextCol && (
                              <button 
                                onClick={() => handleStatusChange(card.id, nextCol.id)}
                                className="p-1 rounded hover:bg-gray-700 text-gray-400 transition-colors"
                                title={`Move to ${nextCol.title}`}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {card.prUrl && (
                              <a 
                                href={card.prUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center text-xs font-medium ${card.prState === 'merged' ? 'text-purple-400 hover:text-purple-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                                title={`View Pull Request (${card.prState})`}
                              >
                                <GitFork className="h-3 w-3 mr-1" />
                                PR #{card.prNumber}
                              </a>
                            )}
                            <a 
                              href={card.url} 
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                            >
                              View on GitHub
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Environment Setup Modal */}
      {setupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Environment Setup</h3>
              </div>
              <button 
                onClick={() => setSetupModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Repository</h4>
                <a href={`https://github.com/${setupRepo}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-medium text-lg">
                  {setupRepo}
                </a>
              </div>

              {setupLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                  <p className="text-sm text-gray-400">Inspecting repository files...</p>
                </div>
              ) : setupError ? (
                <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <h3 className="text-sm font-medium text-red-400">Failed to inspect repository</h3>
                  </div>
                  <p className="mt-1 text-sm text-red-300">{setupError}</p>
                </div>
              ) : setupData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Detected Language</div>
                      <div className="font-semibold text-white">{setupData.language}</div>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Package Manager</div>
                      <div className="font-semibold text-white">{setupData.packageManager || 'None detected'}</div>
                    </div>
                  </div>

                  {setupData.setupFiles && setupData.setupFiles.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-300 mb-2">Detected Configuration Files</div>
                      <div className="flex flex-wrap gap-2">
                        {setupData.setupFiles.map((file: string) => (
                          <span key={file} className="px-2 py-1 text-xs font-medium bg-gray-800 border border-gray-700 text-gray-300 rounded">
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-300">Local Setup Instructions</div>
                    <div className="bg-black/50 p-4 rounded-lg border border-gray-800 font-mono text-sm text-green-400 overflow-x-auto">
                      <div className="mb-2"># 1. Clone the repository</div>
                      <div className="text-white mb-4">git clone https://github.com/{setupRepo}.git</div>
                      
                      <div className="mb-2"># 2. Enter the directory</div>
                      <div className="text-white mb-4">cd {setupRepo.split('/')[1]}</div>
                      
                      {setupData.installCommand && (
                        <>
                          <div className="mb-2"># 3. Install dependencies</div>
                          <div className="text-white mb-4">{setupData.installCommand}</div>
                        </>
                      )}
                      
                      {setupData.runCommand && (
                        <>
                          <div className="mb-2"># 4. Run the project</div>
                          <div className="text-white">{setupData.runCommand}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-800">
                    {setupData.hasDevContainer ? (
                      <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-1">Codespaces Supported</h4>
                          <p className="text-xs text-blue-300/80">This repository contains a dev container configuration.</p>
                        </div>
                        <a 
                          href={`https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=${setupRepo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
                        >
                          Open in Codespaces
                        </a>
                      </div>
                    ) : (
                      <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg flex items-start">
                        <AlertCircle className="h-5 w-5 text-gray-500 mr-3 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-1">Codespaces Not Detected</h4>
                          <p className="text-xs text-gray-400">
                            This repository does not have a <code className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700">.devcontainer</code> configuration. 
                            Please use the local setup instructions above.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
