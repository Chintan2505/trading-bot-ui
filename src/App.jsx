import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { SocketProvider } from '@/context/SocketContext'
import { AccountProvider } from '@/context/AccountContext'
import AppLayout from '@/layouts/AppLayout'
import DashboardPage from '@/pages/dashboard/container/dashboard.container'
import RealTimeDashboard from '@/pages/trading/container/trading.container'
import PortfolioPage from '@/pages/portfolio/container/portfolio.container'
import OrdersPage from '@/pages/orders/container/orders.container'
import TradeHistoryPage from '@/pages/trade-history/container/trade-history.container'
import AccountPage from '@/pages/account/container/account.container'

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
