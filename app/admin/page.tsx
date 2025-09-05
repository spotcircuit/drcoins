'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Load saved password on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('adminPassword');
    if (savedPassword) {
      setPassword(savedPassword);
      // Auto-login with saved password
      fetchOrdersWithPassword(savedPassword);
    }
  }, []);

  const fetchOrdersWithPassword = async (pwd: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${pwd}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setIsAuthenticated(true);
        setError('');
        // Save password for next time
        localStorage.setItem('adminPassword', pwd);
      } else {
        setError('Invalid password');
        setIsAuthenticated(false);
        localStorage.removeItem('adminPassword');
      }
    } catch (err) {
      setError('Failed to fetch orders');
    }
    setLoading(false);
  };
  
  const fetchOrders = async () => {
    fetchOrdersWithPassword(password);
  };

  const markAsFulfilled = async (sessionId: string, sendEmail: boolean = true) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          status: 'fulfilled',
          sendEmail
        })
      });

      if (res.ok) {
        alert('Order marked as fulfilled!');
        fetchOrders(); // Refresh
      } else {
        alert('Failed to update order');
      }
    } catch (err) {
      alert('Error updating order');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-4">Admin Login</h1>
          <div className="relative mb-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 pr-10 rounded bg-gray-700 text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="showPasswordCheckbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showPasswordCheckbox" className="text-gray-300 text-sm">
              Show password
            </label>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Order Management</h1>
          <div className="flex gap-2">
            <button
              onClick={fetchOrders}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('adminPassword');
                setIsAuthenticated(false);
                setPassword('');
                setOrders([]);
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">LiveMe ID</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-700">
                    <td className="px-4 py-3">
                      {new Date(order.created).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div>{order.customerEmail}</div>
                        <div className="text-sm text-gray-400">
                          {order.firstName} {order.lastName}
                        </div>
                        {order.phone && (
                          <div className="text-sm text-gray-400">{order.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {order.liveMeId || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="text-sm">
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      ${order.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 ${
                        order.paymentMethod === 'Cash App' ? 'bg-green-500' : 
                        order.paymentMethod === 'Card' ? 'bg-blue-500' : 
                        order.paymentMethod === 'Link' ? 'bg-indigo-500' :
                        'bg-gray-500'
                      }`}>
                        {order.paymentMethod === 'Cash App' && '💵'}
                        {order.paymentMethod === 'Card' && '💳'}
                        {order.paymentMethod === 'Link' && '🔗'}
                        {order.paymentMethod === 'Google Pay' && '🇬'}
                        {order.paymentMethod === 'Apple Pay' && '🍎'}
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'
                      }`}>
                        {order.status}
                      </span>
                      {order.fulfillmentStatus === 'fulfilled' && (
                        <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-600">
                          Fulfilled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {order.status === 'paid' && order.fulfillmentStatus !== 'fulfilled' && (
                        <button
                          onClick={() => markAsFulfilled(order.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Mark Fulfilled
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}