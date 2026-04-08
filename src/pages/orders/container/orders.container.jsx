import React, { useState, useEffect, useCallback } from 'react';
import { getOrders, placeOrder, cancelOrder } from '@/services/api';
import { toast } from 'sonner';
import OrdersView from '../view/orders.view';

const STATUS_TABS = ['all', 'open', 'filled', 'canceled'];

export default function OrdersContainer() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [form, setForm] = useState({
    symbol: '', qty: '', side: 'buy', type: 'market',
    time_in_force: 'day', limit_price: '', stop_price: '',
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeTab === 'open' ? 'open' : activeTab === 'filled' ? 'closed' : activeTab === 'canceled' ? 'closed' : 'all';
      const data = await getOrders(status, 100);
      if (data.success) {
        let filtered = data.orders || [];
        if (activeTab === 'filled') filtered = filtered.filter(o => o.status === 'filled');
        if (activeTab === 'canceled') filtered = filtered.filter(o => o.status === 'canceled');
        setOrders(filtered);
      }
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handlePlace = async (e) => {
    e.preventDefault();
    if (!form.symbol || !form.qty) {
      toast.error('Symbol and quantity are required');
      return;
    }
    setSubmitting(true);
    try {
      const orderData = {
        symbol: form.symbol.toUpperCase(),
        qty: parseFloat(form.qty),
        side: form.side,
        type: form.type,
        time_in_force: form.time_in_force,
      };
      if (form.type === 'limit' || form.type === 'stop_limit') {
        orderData.limit_price = parseFloat(form.limit_price);
      }
      if (form.type === 'stop' || form.type === 'stop_limit') {
        orderData.stop_price = parseFloat(form.stop_price);
      }
      const data = await placeOrder(orderData);
      if (data.success) {
        toast.success(`Order placed: ${form.side.toUpperCase()} ${form.qty} ${form.symbol.toUpperCase()}`);
        setShowForm(false);
        setForm({ symbol: '', qty: '', side: 'buy', type: 'market', time_in_force: 'day', limit_price: '', stop_price: '' });
        fetchOrders();
      }
    } catch (err) {
      toast.error('Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      const data = await cancelOrder(id);
      if (data.success) {
        toast.success('Order cancelled');
        fetchOrders();
      }
    } catch (err) {
      toast.error('Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  const handleFormChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  return (
    <OrdersView
      orders={orders}
      loading={loading}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      showForm={showForm}
      setShowForm={setShowForm}
      submitting={submitting}
      cancellingId={cancellingId}
      form={form}
      handleFormChange={handleFormChange}
      fetchOrders={fetchOrders}
      handlePlace={handlePlace}
      handleCancel={handleCancel}
      statusTabs={STATUS_TABS}
    />
  );
}
