import React from 'react';
import { User, Shield, DollarSign, RefreshCw } from 'lucide-react';

export default function AccountView({ account, isLoading, refresh, config }) {
  const fmt = (val) => val != null ? parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-gold" />
          <h1 className="text-lg font-bold text-white">Account</h1>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-terminal-border hover:text-white hover:bg-terminal-hover transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="p-6 space-y-6">
        {isLoading && !account ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-terminal-card animate-shimmer" />
            ))}
          </div>
        ) : !account ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <User className="w-12 h-12 mb-3 text-gray-700" />
            <p className="text-sm font-medium">Unable to load account info</p>
          </div>
        ) : (
          <>
            {/* Account Info */}
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-terminal-border flex items-center gap-2">
                <Shield className="w-4 h-4 text-gold" />
                <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Account Info</h3>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Account ID" value={account.id} mono />
                <InfoItem label="Status" value={account.status?.toUpperCase()} badge badgeColor={account.status === 'ACTIVE' ? 'bull' : 'bear'} />
                <InfoItem label="Created" value={account.created_at ? new Date(account.created_at).toLocaleDateString() : '--'} />
                <InfoItem label="Pattern Day Trader" value={account.pattern_day_trader ? 'Yes' : 'No'} badge badgeColor={account.pattern_day_trader ? 'bear' : 'bull'} />
                <InfoItem label="Trading Blocked" value={account.trading_blocked ? 'Yes' : 'No'} badge badgeColor={account.trading_blocked ? 'bear' : 'bull'} />
                <InfoItem label="Account Blocked" value={account.account_blocked ? 'Yes' : 'No'} badge badgeColor={account.account_blocked ? 'bear' : 'bull'} />
              </div>
            </div>

            {/* Financial Summary */}
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-terminal-border flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gold" />
                <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Financial Summary</h3>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Equity" value={`$${fmt(account.equity)}`} highlight />
                <InfoItem label="Last Equity" value={`$${fmt(account.last_equity)}`} />
                <InfoItem label="Buying Power" value={`$${fmt(account.buying_power)}`} highlight />
                <InfoItem label="Cash" value={`$${fmt(account.cash)}`} />
                <InfoItem label="Portfolio Value" value={`$${fmt(account.portfolio_value)}`} />
                <InfoItem label="Long Market Value" value={`$${fmt(account.long_market_value)}`} />
                <InfoItem label="Short Market Value" value={`$${fmt(account.short_market_value)}`} />
                <InfoItem label="Initial Margin" value={`$${fmt(account.initial_margin)}`} />
                <InfoItem label="Maintenance Margin" value={`$${fmt(account.maintenance_margin)}`} />
              </div>
            </div>

            {/* Account Config */}
            {config && (
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-terminal-border">
                  <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Account Configuration</h3>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(config).map(([key, val]) => (
                    <InfoItem key={key} label={key.replace(/_/g, ' ')} value={String(val)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono, badge, badgeColor, highlight }) {
  return (
    <div>
      <span className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">{label}</span>
      {badge ? (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
          badgeColor === 'bull' ? 'bg-bull/10 text-bull' : badgeColor === 'bear' ? 'bg-bear/10 text-bear' : 'bg-gray-800 text-gray-400'
        }`}>
          {value}
        </span>
      ) : (
        <span className={`text-sm ${mono ? 'font-mono text-[11px]' : ''} ${highlight ? 'font-bold text-white' : 'text-gray-300'}`}>
          {value || '--'}
        </span>
      )}
    </div>
  );
}
