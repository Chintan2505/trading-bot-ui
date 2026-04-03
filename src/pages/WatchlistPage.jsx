import React, { useState, useEffect, useCallback } from 'react';
import { getWatchlists, createWatchlist, deleteWatchlist, addSymbolToWatchlist, removeSymbolFromWatchlist } from '@/services/api';
import { toast } from 'sonner';
import { Star, Plus, Trash2, X, RefreshCw } from 'lucide-react';

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSymbols, setNewSymbols] = useState('');
  const [addSymbolInput, setAddSymbolInput] = useState({});

  const fetchWatchlists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWatchlists();
      if (data.success) setWatchlists(data.watchlists);
    } catch {
      toast.error('Failed to load watchlists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWatchlists(); }, [fetchWatchlists]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const symbols = newSymbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const data = await createWatchlist(newName.trim(), symbols);
      if (data.success) {
        toast.success(`Watchlist "${newName}" created`);
        setShowCreate(false);
        setNewName('');
        setNewSymbols('');
        fetchWatchlists();
      }
    } catch {
      toast.error('Failed to create watchlist');
    }
  };

  const handleDelete = async (id, name) => {
    try {
      const data = await deleteWatchlist(id);
      if (data.success) {
        toast.success(`Deleted "${name}"`);
        fetchWatchlists();
      }
    } catch {
      toast.error('Failed to delete watchlist');
    }
  };

  const handleAddSymbol = async (id) => {
    const symbol = addSymbolInput[id]?.trim().toUpperCase();
    if (!symbol) return;
    try {
      const data = await addSymbolToWatchlist(id, symbol);
      if (data.success) {
        toast.success(`Added ${symbol}`);
        setAddSymbolInput(prev => ({ ...prev, [id]: '' }));
        fetchWatchlists();
      }
    } catch {
      toast.error(`Failed to add ${symbol}`);
    }
  };

  const handleRemoveSymbol = async (id, symbol) => {
    try {
      const data = await removeSymbolFromWatchlist(id, symbol);
      if (data.success) {
        toast.success(`Removed ${symbol}`);
        fetchWatchlists();
      }
    } catch {
      toast.error(`Failed to remove ${symbol}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-gold" />
          <h1 className="text-lg font-bold text-white">Watchlists</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWatchlists}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-terminal-border hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Watchlist
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-gold/20 bg-terminal-card">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Watchlist"
                className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-[12px] text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Symbols (comma-separated)</label>
              <input
                value={newSymbols}
                onChange={(e) => setNewSymbols(e.target.value.toUpperCase())}
                placeholder="AAPL, TSLA, GOOGL"
                className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-[12px] text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-colors"
            >
              Create Watchlist
            </button>
          </form>
        </div>
      )}

      {/* Watchlist Cards */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-terminal-card animate-shimmer" />
            ))}
          </div>
        ) : watchlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <Star className="w-12 h-12 mb-3 text-gray-700" />
            <p className="text-sm font-medium">No watchlists yet</p>
            <p className="text-[12px] text-gray-700 mt-1">Create one to start tracking symbols</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {watchlists.map((wl) => (
              <div key={wl.id} className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-gold" />
                    <span className="text-sm font-semibold text-white">{wl.name}</span>
                    <span className="text-[10px] text-gray-500">{wl.assets?.length || 0} symbols</span>
                  </div>
                  <button
                    onClick={() => handleDelete(wl.id, wl.name)}
                    className="p-1 rounded text-gray-600 hover:text-bear hover:bg-bear/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(wl.assets || []).map((asset) => {
                      const sym = typeof asset === 'string' ? asset : asset.symbol;
                      return (
                        <div key={sym} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-terminal-bg border border-terminal-border text-[11px] text-gray-300 group">
                          {sym}
                          <button
                            onClick={() => handleRemoveSymbol(wl.id, sym)}
                            className="text-gray-600 hover:text-bear opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={addSymbolInput[wl.id] || ''}
                      onChange={(e) => setAddSymbolInput(prev => ({ ...prev, [wl.id]: e.target.value.toUpperCase() }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddSymbol(wl.id); }}
                      placeholder="Add symbol..."
                      className="flex-1 bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50"
                    />
                    <button
                      onClick={() => handleAddSymbol(wl.id)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
