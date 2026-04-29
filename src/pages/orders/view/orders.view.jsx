import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList, RefreshCw, Plus, X, Send, Columns3, Check,
} from 'lucide-react';

const STATUS_COLORS = {
  new: 'bg-gold/10 text-gold',
  accepted: 'bg-gold/10 text-gold',
  filled: 'bg-bull/10 text-bull',
  partially_filled: 'bg-blue-500/10 text-blue-400',
  canceled: 'bg-bear/10 text-bear',
  expired: 'bg-gray-800 text-gray-500',
  rejected: 'bg-bear/10 text-bear',
  pending_new: 'bg-gold/10 text-gold',
};

// Column config — id, label, cell renderer. Used by both header + body + dropdown.
const COLUMNS = [
  { id: 'symbol', label: 'Symbol', render: (o) => (
    <span className="font-semibold text-white whitespace-nowrap">{o.symbol}</span>
  )},
  { id: 'side', label: 'Side', render: (o) => (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${o.side === 'buy' ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'}`}>
      {o.side?.toUpperCase()}
    </span>
  )},
  { id: 'type', label: 'Type', render: (o) => <span className="text-gray-400 capitalize whitespace-nowrap">{o.type}</span> },
  { id: 'class', label: 'Class', render: (o) => <span className="text-gray-400 capitalize whitespace-nowrap">{o.order_class || 'simple'}</span> },
  { id: 'qty', label: 'Qty', render: (o) => <span className="font-mono text-gray-300 whitespace-nowrap">{o.qty}</span> },
  { id: 'filled_qty', label: 'Filled', render: (o) => <span className="font-mono text-gray-300 whitespace-nowrap">{o.filled_qty || '0'}</span> },
  { id: 'fill_price', label: 'Fill Price', render: (o) => (
    <span className="font-mono text-gray-200 whitespace-nowrap">
      {o.filled_avg_price ? `$${parseFloat(o.filled_avg_price).toFixed(2)}` : <span className="text-gray-600">--</span>}
    </span>
  )},
  { id: 'notional', label: 'Notional', render: (o) => {
    const n = o.notional || (o.filled_avg_price && o.filled_qty
      ? parseFloat(o.filled_avg_price) * parseFloat(o.filled_qty) : null);
    return <span className="font-mono text-gray-300 whitespace-nowrap">{n ? `$${parseFloat(n).toFixed(2)}` : <span className="text-gray-600">--</span>}</span>;
  }},
  { id: 'limit_stop', label: 'Limit/Stop', render: (o) => (
    <span className="font-mono text-gray-400 whitespace-nowrap">
      {o.limit_price ? `L: $${o.limit_price}` : o.stop_price ? `S: $${o.stop_price}` : 'Market'}
    </span>
  )},
  { id: 'status', label: 'Status', render: (o) => (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_COLORS[o.status] || 'bg-gray-800 text-gray-500'}`}>
      {o.status?.toUpperCase()}
    </span>
  )},
  { id: 'submitted', label: 'Submitted', render: (o) => (
    <span className="font-mono text-gray-400 whitespace-nowrap">
      {o.submitted_at ? new Date(o.submitted_at).toLocaleString() : '--'}
    </span>
  )},
  { id: 'filled_at', label: 'Filled At', render: (o) => (
    <span className="font-mono text-gray-400 whitespace-nowrap">
      {o.filled_at ? new Date(o.filled_at).toLocaleString() : '--'}
    </span>
  )},
  { id: 'duration', label: 'Duration', render: (o) => {
    const ms = o.filled_at && o.submitted_at ? new Date(o.filled_at) - new Date(o.submitted_at) : null;
    const str = ms ? ms < 1000 ? `${ms}ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)}s`
      : `${Math.floor(ms / 60000)}m ${Math.floor((ms / 1000) % 60)}s` : '--';
    return <span className="font-mono text-gray-400 whitespace-nowrap">{str}</span>;
  }},
  { id: 'order_id', label: 'Order ID', render: (o) => (
    <span className="font-mono text-[10px] text-gray-500 bg-terminal-bg/50 whitespace-nowrap" title={o.id}>
      {o.id ? o.id.substring(0, 8) : '--'}
    </span>
  )},
];

const ACTION_COL_ID = 'action';
const STORAGE_KEY = 'tradex.orders.visibleCols';
const DEFAULT_VISIBLE = COLUMNS.map(c => c.id);

const loadVisible = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(DEFAULT_VISIBLE);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
  } catch { /* ignore */ }
  return new Set(DEFAULT_VISIBLE);
};

export default function OrdersView({
  orders,
  loading,
  activeTab,
  setActiveTab,
  showForm,
  setShowForm,
  submitting,
  cancellingId,
  form,
  handleFormChange,
  fetchOrders,
  handlePlace,
  handleCancel,
  statusTabs,
}) {
  const [visibleCols, setVisibleCols] = useState(loadVisible);
  const [colsOpen, setColsOpen] = useState(false);
  const colsBtnRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...visibleCols])); } catch { /* ignore */ }
  }, [visibleCols]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!colsOpen) return;
    const handler = (e) => {
      if (colsBtnRef.current && !colsBtnRef.current.contains(e.target)) setColsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colsOpen]);

  const toggleCol = (id) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const showAll = () => setVisibleCols(new Set(DEFAULT_VISIBLE));
  const hideAll = () => setVisibleCols(new Set());

  const visibleColumns = COLUMNS.filter(c => visibleCols.has(c.id));

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-gold" />
          <h1 className="text-lg font-bold text-white">Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Columns dropdown */}
          <div className="relative" ref={colsBtnRef}>
            <button
              onClick={() => setColsOpen(!colsOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-terminal-border hover:text-white hover:bg-terminal-hover transition-colors"
            >
              <Columns3 className="w-3.5 h-3.5" />
              Columns ({visibleCols.size}/{COLUMNS.length})
            </button>
            {colsOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 max-h-96 overflow-y-auto rounded-lg border border-terminal-border bg-terminal-card shadow-xl z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Toggle Columns</span>
                  <div className="flex gap-1">
                    <button onClick={showAll} className="text-[10px] text-gold hover:underline">All</button>
                    <span className="text-[10px] text-gray-700">|</span>
                    <button onClick={hideAll} className="text-[10px] text-gray-500 hover:underline">None</button>
                  </div>
                </div>
                {COLUMNS.map((c) => {
                  const checked = visibleCols.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCol(c.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-terminal-hover transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-gold/20 border-gold' : 'border-gray-600'}`}>
                        {checked && <Check className="w-3 h-3 text-gold" />}
                      </div>
                      <span className={checked ? 'text-white' : 'text-gray-500'}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-terminal-border hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Place Order
          </button>
        </div>
      </div>

      {/* Order Form */}
      {showForm && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-gold/20 bg-terminal-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Place New Order</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handlePlace} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FormField label="Symbol" value={form.symbol} onChange={v => handleFormChange('symbol', v.toUpperCase())} placeholder="AAPL" />
            <FormField label="Quantity" type="number" value={form.qty} onChange={v => handleFormChange('qty', v)} placeholder="1" />
            <FormSelect label="Side" value={form.side} onChange={v => handleFormChange('side', v)}
              options={[['buy', 'Buy'], ['sell', 'Sell']]} />
            <FormSelect label="Type" value={form.type} onChange={v => handleFormChange('type', v)}
              options={[['market', 'Market'], ['limit', 'Limit'], ['stop', 'Stop'], ['stop_limit', 'Stop Limit']]} />
            <FormSelect label="Time in Force" value={form.time_in_force} onChange={v => handleFormChange('time_in_force', v)}
              options={[['day', 'Day'], ['gtc', 'GTC'], ['ioc', 'IOC'], ['fok', 'FOK']]} />
            {(form.type === 'limit' || form.type === 'stop_limit') && (
              <FormField label="Limit Price" type="number" value={form.limit_price} onChange={v => handleFormChange('limit_price', v)} placeholder="0.00" />
            )}
            {(form.type === 'stop' || form.type === 'stop_limit') && (
              <FormField label="Stop Price" type="number" value={form.stop_price} onChange={v => handleFormChange('stop_price', v)} placeholder="0.00" />
            )}
            <div className="col-span-full flex gap-2 mt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Placing...' : 'Submit Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-terminal-border">
        {statusTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-terminal-accent text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-hover'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-terminal-card animate-shimmer" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <ClipboardList className="w-12 h-12 mb-3 text-gray-700" />
            <p className="text-sm font-medium">No {activeTab !== 'all' ? activeTab : ''} orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-terminal-border">
                  {visibleColumns.map((c) => (
                    <th
                      key={c.id}
                      className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-3 whitespace-nowrap"
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-3 whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-terminal-hover/50 transition-colors">
                    {visibleColumns.map((c) => (
                      <td key={c.id} className="py-2.5 px-3">{c.render(order)}</td>
                    ))}
                    <td className="py-2.5 px-3">
                      {(order.status === 'new' || order.status === 'accepted' || order.status === 'pending_new') && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancellingId === order.id}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-bear border border-bear/30 bg-bear/5 hover:bg-bear/15 transition-colors disabled:opacity-50"
                        >
                          {cancellingId === order.id ? '...' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={type === 'number' ? 'any' : undefined}
        className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-[12px] text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50 transition-colors"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer"
      >
        {options.map(([val, text]) => (
          <option key={val} value={val}>{text}</option>
        ))}
      </select>
    </div>
  );
}
