'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { emailConfig } from '@/lib/email-config';
import { ThemeSelector } from '@/components/ThemeSelector';
import 'react-quill-new/dist/quill.snow.css';

// Dynamic import to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

type TabType = 'orders' | 'customers' | 'rates';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);

  // Customers state
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any | null>(null);

  // Bulk email state (for customers tab)
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [bulkEmailResult, setBulkEmailResult] = useState<{success: boolean, message: string} | null>(null);

  // Rates state
  const [globalRate, setGlobalRate] = useState(87);
  const [customerRates, setCustomerRates] = useState<any[]>([]);
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [editingGlobalRate, setEditingGlobalRate] = useState(false);
  const [newGlobalRate, setNewGlobalRate] = useState('');
  const [editingCustomerEmail, setEditingCustomerEmail] = useState<string | null>(null);
  const [editingCustomerRate, setEditingCustomerRate] = useState('');
  const [showBulkRateModal, setShowBulkRateModal] = useState(false);
  const [bulkRateEmails, setBulkRateEmails] = useState('');
  const [bulkRate, setBulkRate] = useState('');
  const [bulkRateType, setBulkRateType] = useState<'permanent' | 'temporary'>('permanent');
  const [bulkRateExpiry, setBulkRateExpiry] = useState('');
  const [bulkRateNote, setBulkRateNote] = useState('');
  const [showRateHistory, setShowRateHistory] = useState(false);

  const loginWithPassword = async (pwd: string) => {
    setLoading(true);
    try {
      // Fetch both orders and customers
      const [ordersRes, customersRes] = await Promise.all([
        fetch('/api/admin/orders', {
          headers: { 'Authorization': `Bearer ${pwd}` }
        }),
        fetch('/api/admin/customers', {
          headers: { 'Authorization': `Bearer ${pwd}` }
        })
      ]);

      if (ordersRes.ok && customersRes.ok) {
        const [ordersData, customersData] = await Promise.all([
          ordersRes.json(),
          customersRes.json()
        ]);

        setOrders(ordersData.orders);
        setCustomers(customersData.customers);
        setIsAuthenticated(true);
        setError('');
        localStorage.setItem('adminPassword', pwd);
      } else {
        setError('Invalid password');
        setIsAuthenticated(false);
        localStorage.removeItem('adminPassword');
      }
    } catch (err) {
      setError('Failed to fetch data');
    }
    setLoading(false);
  };

  // Load saved password on mount and auto-login
  useEffect(() => {
    const savedPassword = localStorage.getItem('adminPassword');
    if (savedPassword) {
      setPassword(savedPassword);
      loginWithPassword(savedPassword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = async () => {
    if (activeTab === 'orders') {
      await fetchOrders();
    } else if (activeTab === 'customers') {
      await fetchCustomers();
    } else if (activeTab === 'rates') {
      await fetchRates();
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
    setLoading(false);
  };

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rates', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalRate(data.globalRate);
        setCustomerRates(data.customerRates);
        setRateHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch rates:', err);
    }
    setLoading(false);
  };

  const updateGlobalRate = async () => {
    const rate = parseFloat(newGlobalRate);
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid rate');
      return;
    }

    try {
      const res = await fetch('/api/admin/rates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ globalRate: rate })
      });

      if (res.ok) {
        alert('Global rate updated successfully');
        setEditingGlobalRate(false);
        setNewGlobalRate('');
        fetchRates();
      } else {
        alert('Failed to update global rate');
      }
    } catch (err) {
      alert('Error updating global rate');
    }
  };

  const updateCustomerRate = async (email: string, rate: number, type: 'permanent' | 'temporary', expiresAt: string | null, note?: string) => {
    try {
      const res = await fetch('/api/admin/rates/customer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, rate, type, expiresAt, note })
      });

      if (res.ok) {
        fetchRates();
        return true;
      } else {
        const data = await res.json();
        alert(`Failed to update customer rate: ${data.error}`);
        return false;
      }
    } catch (err) {
      alert('Error updating customer rate');
      return false;
    }
  };

  const saveCustomerRateEdit = async (email: string) => {
    const rate = parseFloat(editingCustomerRate);
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid rate');
      return;
    }

    const success = await updateCustomerRate(email, rate, 'permanent', null);
    if (success) {
      setEditingCustomerEmail(null);
      setEditingCustomerRate('');
    }
  };

  const removeCustomerRate = async (email: string) => {
    if (!window.confirm(`Remove custom rate for ${email}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/rates/customer?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });

      if (res.ok) {
        alert('Customer rate removed');
        fetchRates();
      } else {
        alert('Failed to remove customer rate');
      }
    } catch (err) {
      alert('Error removing customer rate');
    }
  };

  const submitBulkRates = async () => {
    const rate = parseFloat(bulkRate);
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid rate');
      return;
    }

    const emails = bulkRateEmails.split('\n').map(e => e.trim()).filter(e => e.length > 0);
    if (emails.length === 0) {
      alert('Please enter at least one email address');
      return;
    }

    if (bulkRateType === 'temporary' && !bulkRateExpiry) {
      alert('Please select an expiration date for temporary rates');
      return;
    }

    if (!window.confirm(`Set rate of ${rate} for ${emails.length} customer(s)?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/rates/customer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emails,
          rate,
          type: bulkRateType,
          expiresAt: bulkRateExpiry || null,
          note: bulkRateNote || undefined
        })
      });

      if (res.ok) {
        alert(`Bulk rates set successfully for ${emails.length} customer(s)`);
        setShowBulkRateModal(false);
        setBulkRateEmails('');
        setBulkRate('');
        setBulkRateType('permanent');
        setBulkRateExpiry('');
        setBulkRateNote('');
        deselectAllCustomers(); // Clear customer selection after setting rates
        fetchRates();
      } else {
        const data = await res.json();
        alert(`Failed to set bulk rates: ${data.error}`);
      }
    } catch (err) {
      alert('Error setting bulk rates');
    }
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
        fetchOrders();
      } else {
        alert('Failed to update order');
      }
    } catch (err) {
      alert('Error updating order');
    }
  };

  // Customer selection handlers
  const toggleCustomerSelection = (email: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedCustomers(newSelected);
  };

  const selectAllCustomers = () => {
    const allEmails = new Set(customers.map(c => c.email));
    setSelectedCustomers(allEmails);
  };

  const deselectAllCustomers = () => {
    setSelectedCustomers(new Set());
  };

  const getSelectedCustomerEmails = () => {
    return Array.from(selectedCustomers);
  };

  // Handle template selection
  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    if (template !== 'custom') {
      const templateData = emailConfig.bulkTemplates[template as keyof typeof emailConfig.bulkTemplates];
      setEmailSubject(templateData.subject);
      setEmailBody(templateData.html);
    } else {
      setEmailSubject('');
      setEmailBody('');
    }
  };

  // Open bulk email modal
  const openBulkEmailModal = () => {
    if (selectedCustomers.size === 0) {
      alert('Please select at least one customer');
      return;
    }
    setBulkEmailResult(null);
    setShowBulkEmailModal(true);
  };

  // Open bulk rate modal from customer selection
  const openBulkRateModalFromCustomers = () => {
    if (selectedCustomers.size === 0) {
      alert('Please select at least one customer');
      return;
    }
    const emails = getSelectedCustomerEmails();
    setBulkRateEmails(emails.join('\n'));
    setShowBulkRateModal(true);
  };

  // Send bulk email
  const sendBulkEmail = async () => {
    const emails = getSelectedCustomerEmails();

    if (emails.length === 0) {
      alert('No valid email addresses found');
      return;
    }

    if (!emailSubject || !emailBody) {
      alert('Please provide both subject and email body');
      return;
    }

    if (!window.confirm(`Send email to ${emails.length} recipient(s)?`)) {
      return;
    }

    setSendingBulkEmail(true);
    setBulkEmailResult(null);

    try {
      const res = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emails,
          subject: emailSubject,
          htmlContent: emailBody
        })
      });

      const data = await res.json();

      if (res.ok) {
        setBulkEmailResult({
          success: true,
          message: data.message || `Email sent successfully to ${emails.length} recipient(s)`
        });
        setTimeout(() => {
          setSelectedCustomers(new Set());
          setShowBulkEmailModal(false);
          setEmailSubject('');
          setEmailBody('');
          setSelectedTemplate('custom');
        }, 2000);
      } else {
        setBulkEmailResult({
          success: false,
          message: data.error || 'Failed to send bulk email'
        });
      }
    } catch (err) {
      setBulkEmailResult({
        success: false,
        message: 'Error sending bulk email'
      });
    } finally {
      setSendingBulkEmail(false);
    }
  };

  // Open customer detail modal
  const openCustomerDetail = (customer: any) => {
    setSelectedCustomerDetail(customer);
  };

  // Get orders for selected customer
  const getCustomerOrders = () => {
    if (!selectedCustomerDetail) return [];
    return orders.filter(order => order.customerEmail === selectedCustomerDetail.email);
  };

  // Quill editor modules configuration
  const editorModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      [{ 'align': [] }],
      ['clean']
    ]
  };

  const editorFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list',
    'link', 'image',
    'align'
  ];

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
              onKeyDown={(e) => e.key === 'Enter' && loginWithPassword(password)}
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
            onClick={() => loginWithPassword(password)}
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
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <div className="flex gap-2 items-center">
            <ThemeSelector />
            <button
              onClick={async () => {
                const email = prompt('Enter email address for test:');
                if (email) {
                  try {
                    const res = await fetch('/api/test-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert(`Test email sent! Check ${email} and Resend logs. Email ID: ${data.emailId}`);
                    } else {
                      alert(`Failed to send test email: ${data.error}`);
                    }
                  } catch (err) {
                    alert('Error sending test email - check console');
                  }
                }
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
            >
              Test Email
            </button>
            <button
              onClick={refreshData}
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
                setCustomers([]);
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'orders'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'customers'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => {
                setActiveTab('rates');
                fetchRates();
              }}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'rates'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Rates
            </button>
          </div>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
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
                    <th className="px-4 py-3 text-left">Total Coins</th>
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
                        {(() => {
                          const totalCoins = order.items.reduce((sum: number, item: any) => {
                            if (item.amount) {
                              return sum + (item.quantity * item.amount);
                            }
                            return sum;
                          }, 0);
                          return totalCoins > 0 ? totalCoins.toLocaleString() : '-';
                        })()}
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
                          (order.status === 'paid' || order.status === 'completed') ? 'bg-green-600' : 'bg-yellow-600'
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
                        <div className="flex gap-2">
                          {(order.status === 'paid' || order.status === 'completed') && order.fulfillmentStatus !== 'fulfilled' && (
                            <button
                              onClick={() => markAsFulfilled(order.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Mark Fulfilled
                            </button>
                          )}
                          {order.fulfillmentStatus === 'fulfilled' && (
                            <button
                              onClick={() => markAsFulfilled(order.id, true)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                              title="Resend fulfillment email"
                            >
                              📧 Resend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <>
            {selectedCustomers.size > 0 && (
              <div className="mb-4 bg-blue-900 p-4 rounded-lg flex justify-between items-center">
                <div className="text-white">
                  <span className="font-bold">{selectedCustomers.size}</span> customer(s) selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={deselectAllCustomers}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={openBulkEmailModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Send Bulk Email
                  </button>
                  <button
                    onClick={openBulkRateModalFromCustomers}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    Set Bulk Rates
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
              <div className="p-4 bg-gray-750 border-b border-gray-700">
                <button
                  onClick={selectAllCustomers}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
                >
                  Select All Customers
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={customers.length > 0 && selectedCustomers.size === customers.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllCustomers();
                            } else {
                              deselectAllCustomers();
                            }
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">LiveMe ID</th>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-left">Total Orders</th>
                      <th className="px-4 py-3 text-left">Total Spent</th>
                      <th className="px-4 py-3 text-left">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {customers.map((customer) => (
                      <tr
                        key={customer.email}
                        className={`hover:bg-gray-700 cursor-pointer ${
                          selectedCustomers.has(customer.email) ? 'bg-blue-900 bg-opacity-30' : ''
                        }`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedCustomers.has(customer.email)}
                            onChange={() => toggleCustomerSelection(customer.email)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3" onClick={() => openCustomerDetail(customer)}>
                          {customer.name || '-'}
                        </td>
                        <td className="px-4 py-3" onClick={() => openCustomerDetail(customer)}>
                          {customer.email}
                        </td>
                        <td className="px-4 py-3" onClick={() => openCustomerDetail(customer)}>
                          {customer.liveMeId || '-'}
                        </td>
                        <td className="px-4 py-3" onClick={() => openCustomerDetail(customer)}>
                          {customer.phone || '-'}
                        </td>
                        <td className="px-4 py-3" onClick={() => openCustomerDetail(customer)}>
                          {customer.totalOrders}
                        </td>
                        <td className="px-4 py-3" onClick={() => openCustomerDetail(customer)}>
                          ${customer.totalSpent.toFixed(2)}
                        </td>
                        <td className="px-4 py-3" onClick={() => openCustomerDetail(customer)}>
                          {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Rates Tab */}
        {activeTab === 'rates' && (
          <div className="space-y-6">
            {/* Global Rate Section */}
            <div className="bg-gray-800 rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Global Rate</h2>
              <div className="flex items-center gap-4">
                {editingGlobalRate ? (
                  <>
                    <input
                      type="number"
                      value={newGlobalRate}
                      onChange={(e) => setNewGlobalRate(e.target.value)}
                      placeholder="Enter new global rate"
                      className="p-2 rounded bg-gray-700 text-white border border-gray-600"
                      step="0.01"
                      min="0"
                    />
                    <button
                      onClick={updateGlobalRate}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingGlobalRate(false);
                        setNewGlobalRate('');
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-white">
                      <span className="text-gray-400">Current global rate:</span>
                      <span className="text-2xl font-bold ml-3">{globalRate} coins per $1</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingGlobalRate(true);
                        setNewGlobalRate(globalRate.toString());
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Edit Global Rate
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Customer Rates Section */}
            <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
              <div className="p-4 bg-gray-750 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Customer-Specific Rates</h2>
                <button
                  onClick={() => setShowBulkRateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Bulk Assign Rates
                </button>
              </div>

              {customerRates.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No customer-specific rates configured yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">LiveMe ID</th>
                        <th className="px-4 py-3 text-left">Rate</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Expires</th>
                        <th className="px-4 py-3 text-left">Set By</th>
                        <th className="px-4 py-3 text-left">Set At</th>
                        <th className="px-4 py-3 text-left">Note</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {customerRates.map((rate) => {
                        // Find the customer's LiveMe ID from customers data
                        const customer = customers.find(c => c.email.toLowerCase() === rate.email.toLowerCase());
                        const liveMeId = customer?.liveMeId || '-';

                        return (
                        <tr key={rate.email} className="hover:bg-gray-700">
                          <td className="px-4 py-3">{rate.email}</td>
                          <td className="px-4 py-3">
                            {liveMeId === '-' ? (
                              <span className="text-gray-500 italic">Not found</span>
                            ) : (
                              <span className="text-white font-mono">{liveMeId}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingCustomerEmail === rate.email ? (
                              <input
                                type="number"
                                value={editingCustomerRate}
                                onChange={(e) => setEditingCustomerRate(e.target.value)}
                                className="w-24 p-1 rounded bg-gray-600 text-white"
                                step="0.01"
                                min="0"
                              />
                            ) : (
                              <span className="font-semibold">{rate.rate}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              rate.type === 'permanent' ? 'bg-green-600' : 'bg-yellow-600'
                            }`}>
                              {rate.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {rate.expiresAt ? new Date(rate.expiresAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{rate.setBy}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {new Date(rate.setAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {rate.note || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {editingCustomerEmail === rate.email ? (
                                <>
                                  <button
                                    onClick={() => saveCustomerRateEdit(rate.email)}
                                    className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCustomerEmail(null);
                                      setEditingCustomerRate('');
                                    }}
                                    className="bg-gray-600 text-white px-2 py-1 rounded text-sm hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingCustomerEmail(rate.email);
                                      setEditingCustomerRate(rate.rate.toString());
                                    }}
                                    className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => removeCustomerRate(rate.email)}
                                    className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rate History Section */}
            <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
              <button
                onClick={() => setShowRateHistory(!showRateHistory)}
                className="w-full p-4 bg-gray-750 border-b border-gray-700 flex justify-between items-center hover:bg-gray-700"
              >
                <h2 className="text-xl font-bold text-white">Rate Change History</h2>
                <span className="text-white text-xl">{showRateHistory ? '▼' : '▶'}</span>
              </button>

              {showRateHistory && (
                <div className="overflow-x-auto">
                  {rateHistory.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      No rate history available
                    </div>
                  ) : (
                    <table className="w-full text-white">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left">Timestamp</th>
                          <th className="px-4 py-3 text-left">Action</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">Old Value</th>
                          <th className="px-4 py-3 text-left">New Value</th>
                          <th className="px-4 py-3 text-left">Changed By</th>
                          <th className="px-4 py-3 text-left">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {rateHistory.map((entry, i) => (
                          <tr key={i} className="hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm">
                              {new Date(entry.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                entry.action === 'global_rate_change' ? 'bg-blue-600' :
                                entry.action === 'customer_rate_set' ? 'bg-green-600' :
                                'bg-red-600'
                              }`}>
                                {entry.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{entry.email || '-'}</td>
                            <td className="px-4 py-3">{entry.oldValue || '-'}</td>
                            <td className="px-4 py-3">{entry.newValue || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{entry.setBy}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{entry.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bulk Rate Assignment Modal */}
        {showBulkRateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Bulk Assign Rates</h2>
                  <button
                    onClick={() => {
                      setShowBulkRateModal(false);
                      setBulkRateEmails('');
                      setBulkRate('');
                      setBulkRateType('permanent');
                      setBulkRateExpiry('');
                      setBulkRateNote('');
                    }}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    &times;
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-white mb-2 font-semibold">
                    Customer Emails (one per line) *
                  </label>
                  <textarea
                    value={bulkRateEmails}
                    onChange={(e) => setBulkRateEmails(e.target.value)}
                    placeholder="customer1@example.com&#10;customer2@example.com&#10;customer3@example.com"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 h-32"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-white mb-2 font-semibold">
                    Rate (coins per $1) *
                  </label>
                  <input
                    type="number"
                    value={bulkRate}
                    onChange={(e) => setBulkRate(e.target.value)}
                    placeholder="Enter rate"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-white mb-2 font-semibold">
                    Rate Type *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center text-white">
                      <input
                        type="radio"
                        value="permanent"
                        checked={bulkRateType === 'permanent'}
                        onChange={(e) => setBulkRateType(e.target.value as 'permanent' | 'temporary')}
                        className="mr-2"
                      />
                      Permanent
                    </label>
                    <label className="flex items-center text-white">
                      <input
                        type="radio"
                        value="temporary"
                        checked={bulkRateType === 'temporary'}
                        onChange={(e) => setBulkRateType(e.target.value as 'permanent' | 'temporary')}
                        className="mr-2"
                      />
                      Temporary
                    </label>
                  </div>
                </div>

                {bulkRateType === 'temporary' && (
                  <div className="mb-4">
                    <label className="block text-white mb-2 font-semibold">
                      Expiration Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={bulkRateExpiry}
                      onChange={(e) => setBulkRateExpiry(e.target.value)}
                      className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-white mb-2 font-semibold">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={bulkRateNote}
                    onChange={(e) => setBulkRateNote(e.target.value)}
                    placeholder="Optional note about this rate assignment"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowBulkRateModal(false);
                      setBulkRateEmails('');
                      setBulkRate('');
                      setBulkRateType('permanent');
                      setBulkRateExpiry('');
                      setBulkRateNote('');
                    }}
                    className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitBulkRates}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  >
                    Assign Rates
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Email Modal */}
        {showBulkEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Send Bulk Email</h2>
                  <button
                    onClick={() => {
                      setShowBulkEmailModal(false);
                      setBulkEmailResult(null);
                    }}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    &times;
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-white mb-2 font-semibold">
                    Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  >
                    <option value="custom">Custom</option>
                    <option value="specialOffer">Special Offer</option>
                    <option value="serviceUpdate">Service Update</option>
                    <option value="thankYou">Thank You</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-white mb-2 font-semibold">
                    Recipients ({getSelectedCustomerEmails().length})
                  </label>
                  <div className="bg-gray-700 p-3 rounded max-h-32 overflow-y-auto">
                    <div className="text-sm text-gray-300">
                      {getSelectedCustomerEmails().map((email, i) => (
                        <div key={i} className="py-1">{email}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-white mb-2 font-semibold">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-white mb-2 font-semibold">
                    Email Body *
                  </label>
                  <div className="bg-gray-700 rounded border border-gray-600">
                    <ReactQuill
                      value={emailBody}
                      onChange={setEmailBody}
                      modules={editorModules}
                      formats={editorFormats}
                      theme="snow"
                      placeholder="Compose your email with formatting..."
                      style={{ minHeight: '300px' }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Use the toolbar above to format your email with bold, colors, links, and more.
                  </div>
                </div>

                {bulkEmailResult && (
                  <div
                    className={`mb-4 p-4 rounded ${
                      bulkEmailResult.success
                        ? 'bg-green-900 text-green-200'
                        : 'bg-red-900 text-red-200'
                    }`}
                  >
                    {bulkEmailResult.message}
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowBulkEmailModal(false);
                      setBulkEmailResult(null);
                    }}
                    className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                    disabled={sendingBulkEmail}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendBulkEmail}
                    disabled={sendingBulkEmail || !emailSubject || !emailBody}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingBulkEmail ? 'Sending...' : `Send to ${getSelectedCustomerEmails().length} recipient(s)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Detail Modal */}
        {selectedCustomerDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedCustomerDetail.name || 'Customer Details'}</h2>
                    <p className="text-gray-400">{selectedCustomerDetail.email}</p>
                    {selectedCustomerDetail.liveMeId && (
                      <p className="text-purple-400 font-mono text-sm mt-1">
                        LiveMe ID: {selectedCustomerDetail.liveMeId}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 items-start">
                    <button
                      onClick={() => {
                        // Pre-fill with current rate if exists
                        const customerRate = customerRates.find(r => r.email.toLowerCase() === selectedCustomerDetail.email.toLowerCase());
                        setBulkRateEmails(selectedCustomerDetail.email);
                        setBulkRate(customerRate?.rate.toString() || globalRate.toString());
                        setBulkRateType(customerRate?.type || 'permanent');
                        setBulkRateExpiry(customerRate?.expiresAt || '');
                        setBulkRateNote(customerRate?.note || '');
                        setSelectedCustomerDetail(null); // Close customer detail popup
                        setShowBulkRateModal(true);
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
                    >
                      {customerRates.find(r => r.email.toLowerCase() === selectedCustomerDetail.email.toLowerCase()) ? 'Update Rate' : 'Set Rate'}
                    </button>
                    <button
                      onClick={() => setSelectedCustomerDetail(null)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700 p-4 rounded">
                    <div className="text-gray-400 text-sm">Total Orders</div>
                    <div className="text-white text-2xl font-bold">{selectedCustomerDetail.totalOrders}</div>
                  </div>
                  <div className="bg-gray-700 p-4 rounded">
                    <div className="text-gray-400 text-sm">Total Spent</div>
                    <div className="text-white text-2xl font-bold">${selectedCustomerDetail.totalSpent.toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-700 p-4 rounded">
                    <div className="text-gray-400 text-sm">Customer Since</div>
                    <div className="text-white text-lg font-bold">
                      {new Date(selectedCustomerDetail.firstOrderDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="bg-gray-700 p-4 rounded">
                    <div className="text-gray-400 text-sm">Pricing Rate</div>
                    {(() => {
                      const customerRate = customerRates.find(r => r.email.toLowerCase() === selectedCustomerDetail.email.toLowerCase());
                      if (customerRate) {
                        return (
                          <div>
                            <div className="text-white text-2xl font-bold">{customerRate.rate} coins/$1</div>
                            <div className={`text-xs mt-1 ${customerRate.type === 'permanent' ? 'text-green-400' : 'text-yellow-400'}`}>
                              {customerRate.type === 'permanent' ? '✓ Custom Rate' : '⏰ Temporary'}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div>
                            <div className="text-white text-2xl font-bold">{globalRate} coins/$1</div>
                            <div className="text-xs text-gray-400 mt-1">Standard Global Rate</div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-4">Order History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Items</th>
                        <th className="px-4 py-3 text-left">Amount</th>
                        <th className="px-4 py-3 text-left">Total Coins</th>
                        <th className="px-4 py-3 text-left">Payment</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {getCustomerOrders().map((order) => (
                        <tr key={order.id} className="hover:bg-gray-700">
                          <td className="px-4 py-3">
                            {new Date(order.created).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {order.items.map((item: any, i: number) => (
                              <div key={i} className="text-sm">
                                {item.quantity}x {item.name}
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3">${order.amount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const totalCoins = order.items.reduce((sum: number, item: any) => {
                                if (item.amount) {
                                  return sum + (item.quantity * item.amount);
                                }
                                return sum;
                              }, 0);
                              return totalCoins > 0 ? totalCoins.toLocaleString() : '-';
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded text-xs bg-gray-600">
                              {order.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              (order.status === 'paid' || order.status === 'completed') ? 'bg-green-600' : 'bg-yellow-600'
                            }`}>
                              {order.status}
                            </span>
                            {order.fulfillmentStatus === 'fulfilled' && (
                              <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-600">
                                Fulfilled
                              </span>
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
        )}
      </div>
    </div>
  );
}
