import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Briefcase, ClipboardList,
  History, Star, User, PanelLeftClose, PanelLeftOpen, GripVertical
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/trade', label: 'Trading', icon: BarChart3 },
  { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { path: '/orders', label: 'Orders', icon: ClipboardList },
  { path: '/history', label: 'History', icon: History },
  { path: '/watchlists', label: 'Watchlists', icon: Star },
  { path: '/account', label: 'Account', icon: User },
];

export default function Sidebar({ width, onWidthChange, collapsed, onToggle }) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(60, Math.min(320, startWidth.current + diff));

      if (newWidth < 100) {
        onToggle(true); // collapse
      } else {
        if (collapsed) onToggle(false); // expand
        onWidthChange(Math.max(180, newWidth));
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, collapsed, onWidthChange, onToggle]);

  return (
    <aside
      className="flex-shrink-0 flex flex-col border-r border-terminal-border bg-terminal-card relative select-none"
      style={{ width: collapsed ? 60 : width, transition: isDragging.current ? 'none' : 'width 0.2s ease' }}
    >
      {/* Top: Logo + Collapse Toggle */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-terminal-border flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center shadow-lg shadow-gold/20 flex-shrink-0">
            <BarChart3 className="w-3.5 h-3.5 text-black" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sm tracking-tight text-white whitespace-nowrap">TradeX</span>
          )}
        </div>
        <button
          onClick={() => onToggle(!collapsed)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-terminal-hover transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap overflow-hidden ${
                collapsed ? 'justify-center px-2' : 'px-3'
              } ${
                isActive
                  ? 'bg-gold/10 text-gold border-l-2 border-gold'
                  : 'text-gray-500 hover:text-white hover:bg-terminal-hover border-l-2 border-transparent'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Drag Handle */}
      <div
        className="absolute top-0 right-0 w-[5px] h-full cursor-col-resize group z-10 hover:bg-gold/20 transition-colors"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[5px] h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-gold/50" />
        </div>
      </div>
    </aside>
  );
}
