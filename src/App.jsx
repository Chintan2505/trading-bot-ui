import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { SocketProvider } from '@/context/SocketContext'
import { AccountProvider } from '@/context/AccountContext'
import AppLayout from '@/layouts/AppLayout'
import RealTimeDashboard from '@/pages/RealTimeDashboard'
import DashboardPage from '@/pages/DashboardPage'
import PortfolioPage from '@/pages/PortfolioPage'
import OrdersPage from '@/pages/OrdersPage'
import TradeHistoryPage from '@/pages/TradeHistoryPage'
import WatchlistPage from '@/pages/WatchlistPage'
import AccountPage from '@/pages/AccountPage'

function App() {
  return (
    <SocketProvider>
    <AccountProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/trade" element={<RealTimeDashboard />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/history" element={<TradeHistoryPage />} />
          <Route path="/watchlists" element={<WatchlistPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Routes>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            background: '#141821',
            border: '1px solid #1e2433',
            color: '#e5e7eb',
          },
        }}
      />
    </AccountProvider>
    </SocketProvider>
  )
}

export default App
