import React from 'react';
import {
  ClipboardList, RefreshCw, Plus, X, Send,
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
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-gold" />
          <h1 className="text-lg font-bold text-white">Orders</h1>
        </div>
        <div className="flex items-center gap-2">
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
                  {[
                    'Symbol',
                    'Side',
                    'Type',
                    'Class',
                    'Qty',
                    'Filled',
                    'Fill Price',
                    'Notional',
                    'Limit/Stop',
                    'Status',
                    'Submitted',
                    'Filled At',
                    'Duration',
                    'Order ID',
                    'Action',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border">
                {orders.map((order) => {
                  const notional =
                    order.notional ||
                    (order.filled_avg_price && order.filled_qty
                      ? parseFloat(order.filled_avg_price) * parseFloat(order.filled_qty)
                      : null);
                  const durationMs =
                    order.filled_at && order.submitted_at
                      ? new Date(order.filled_at) - new Date(order.submitted_at)
                      : null;
                  const durationStr = durationMs
                    ? durationMs < 1000
                      ? `${durationMs}ms`
                      : durationMs < 60000
                        ? `${(durationMs / 1000).toFixed(1)}s`
                        : `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs / 1000) % 60)}s`
                    : '--';
                  return (
                    <tr key={order.id} className="hover:bg-terminal-hover/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">{order.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            order.side === 'buy' ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
                          }`}
                        >
                          {order.side?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 capitalize whitespace-nowrap">{order.type}</td>
                      <td className="py-2.5 px-3 text-gray-400 capitalize whitespace-nowrap">{order.order_class || 'simple'}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-300 whitespace-nowrap">{order.qty}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-300 whitespace-nowrap">{order.filled_qty || '0'}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-200 whitespace-nowrap">
                        {order.filled_avg_price ? `$${parseFloat(order.filled_avg_price).toFixed(2)}` : <span className="text-gray-600">--</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-300 whitespace-nowrap">
                        {notional ? `$${parseFloat(notional).toFixed(2)}` : <span className="text-gray-600">--</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">
                        {order.limit_price
                          ? `L: $${order.limit_price}`
                          : order.stop_price
                            ? `S: $${order.stop_price}`
                            : 'Market'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_COLORS[order.status] || 'bg-gray-800 text-gray-500'}`}
                        >
                          {order.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">
                        {order.submitted_at ? new Date(order.submitted_at).toLocaleString() : '--'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">
                        {order.filled_at ? new Date(order.filled_at).toLocaleString() : '--'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">{durationStr}</td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-gray-500 bg-terminal-bg/50 whitespace-nowrap" title={order.id}>
                        {order.id ? order.id.substring(0, 8) : '--'}
                      </td>
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
                  );
                })}
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
