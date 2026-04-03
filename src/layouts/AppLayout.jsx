import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = useCallback((val) => {
    if (typeof val === 'boolean') {
      setCollapsed(val);
    } else {
      setCollapsed(prev => !prev);
    }
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-terminal-bg">
      <Sidebar
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        collapsed={collapsed}
        onToggle={handleToggle}
      />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
