import { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Search, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { EmptyState } from './ui/empty-state';
import { ExportButton } from './ui/export-button';
import { TableSkeleton, ChartSkeleton } from './ui/table-skeleton';
import { getAdminDevices, getDeviceTransactions } from '../api/client';
import { formatDuration, formatTime } from '../utils/time';
import { exportData } from '../utils/export';
import { SessionDetailsDrawer, SessionDetail } from './SessionDetailsDrawer';

interface TransactionsScreenProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

interface Transaction {
  id: string;
  transactionCode: string;
  timestamp: string;
  createdAt: string;
  fridge: string;
  fridgeId: string;
  product: string;
  action: 'Take' | 'Return';
  quantity: number;
  sessionId: string;
}

export default function TransactionsScreen({ onLogout, onNavigate }: TransactionsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [fridgeFilter, setFridgeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [dateRange, setDateRange] = useState('today');
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fridges, setFridges] = useState<{ id: string; name: string }[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);



  const getActionLabel = (actionType?: string | null): 'Take' | 'Return' => {
    if (actionType && actionType.toLowerCase().includes('return')) return 'Return';
    return 'Take';
  };

  useEffect(() => {
    let isMounted = true;
    const loadTransactions = async () => {
      setIsFetching(true);
      setIsLoading(true);
      try {
        const devicesResponse = await getAdminDevices({ limit: 100 });
        const devices = devicesResponse.data;
        const deviceNameMap = new Map(devices.map((device) => [device.device_id, device.name || device.device_id]));
        const deviceOptions = devices.map((device) => ({ id: device.device_id, name: device.name || device.device_id }));
        const results = await Promise.all(
          devices.map((device) => getDeviceTransactions(device.device_id, { limit: 100 }).then(r => r.data).catch(() => []))
        );
        const flattened = results.flat();

        const mapped = flattened.flatMap((txn) => {
          const items = txn.items || [];
          if (items.length === 0) {
            return [{
              id: txn.transaction_id,
              transactionCode: txn.transaction_code || txn.transaction_id,
              timestamp: formatTime(txn.start_time),
              createdAt: txn.start_time,
              fridge: deviceNameMap.get(txn.device_id) || txn.device_id,
              fridgeId: txn.device_id,
              product: '-',
              action: getActionLabel(txn.transaction_type),
              quantity: 0,
              sessionId: txn.transaction_id,
            }];
          }
          return items.map((item) => ({
            id: `${txn.transaction_id}-${item.transaction_item_id}`,
            transactionCode: txn.transaction_code || txn.transaction_id,
            timestamp: formatTime(txn.start_time),
            createdAt: txn.start_time,
            fridge: deviceNameMap.get(txn.device_id) || txn.device_id,
            fridgeId: txn.device_id,
            product: item.product?.name || 'Unknown product',
            action: getActionLabel(item.action_type || txn.transaction_type),
            quantity: Math.max(0, Number(item.quantity || 0)),
            sessionId: txn.transaction_id,
          }));
        });

        if (isMounted) {
          setFridges(deviceOptions);
          setTransactions(mapped);
        }
      } catch (error) {
        console.error('Failed to load transactions', error);
        if (isMounted) {
          setFridges([]);
          setTransactions([]);
        }
      } finally {
        if (isMounted) {
          setIsFetching(false);
          setIsLoading(false);
        }
      }
    };

    loadTransactions();
    return () => {
      isMounted = false;
    };
  }, []);

  const dateRangeStart = useMemo(() => {
    const now = new Date();
    if (dateRange === '7days') {
      now.setDate(now.getDate() - 7);
      return now;
    }
    if (dateRange === '30days') {
      now.setDate(now.getDate() - 30);
      return now;
    }
    return new Date(now.toDateString());
  }, [dateRange]);

  // Filter transactions
  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.fridge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.transactionCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFridge = !fridgeFilter || txn.fridgeId === fridgeFilter;
    const matchesProduct = !productFilter || txn.product === productFilter;

    const matchesDate = dateRangeStart ? new Date(txn.createdAt) >= dateRangeStart : true;

    return matchesSearch && matchesFridge && matchesProduct && matchesDate;
  });

  const getActionColor = (action: string) => {
    return action === 'Take' ? '#2563EB' : '#059669';
  };

  const analyticsSource = filteredTransactions.length > 0 ? filteredTransactions : transactions;
  const topProductsData = useMemo(() => {
    if (analyticsSource.length === 0) return [];
    const counts = new Map<string, number>();
    analyticsSource.forEach((txn) => {
      counts.set(txn.product, (counts.get(txn.product) || 0) + txn.quantity);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [analyticsSource]);

  const hourlyActivityData = useMemo(() => {
    if (analyticsSource.length === 0) return [];
    const hours = new Map<string, number>();
    analyticsSource.forEach((txn) => {
      const date = new Date(txn.createdAt);
      const hour = date.toLocaleTimeString('en-US', { hour: 'numeric' }).replace(' ', '');
      hours.set(hour, (hours.get(hour) || 0) + txn.quantity);
    });
    return Array.from(hours.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(0, 9);
  }, [analyticsSource]);

  const sessionsById = useMemo(() => {
    const grouped = new Map<string, {
      sessionId: string;
      transactionCode: string;
      startAt: string;
      endAt: string;
      actions: { type: 'take' | 'return'; product: string; quantity: number }[];
    }>();

    transactions.forEach((txn) => {
      const existing = grouped.get(txn.sessionId);
      const action = txn.quantity > 0
        ? {
            type: txn.action === 'Take' ? 'take' : 'return',
            product: txn.product,
            quantity: txn.quantity,
          } as const
        : null;

      if (!existing) {
        grouped.set(txn.sessionId, {
          sessionId: txn.sessionId,
          transactionCode: txn.transactionCode,
          startAt: txn.createdAt,
          endAt: txn.createdAt,
          actions: action ? [action] : [],
        });
        return;
      }

      if (new Date(txn.createdAt) < new Date(existing.startAt)) {
        existing.startAt = txn.createdAt;
      }
      if (new Date(txn.createdAt) > new Date(existing.endAt)) {
        existing.endAt = txn.createdAt;
      }
      if (action) {
        existing.actions.push(action);
      }
    });

    return grouped;
  }, [transactions]);

  const selectedSession: SessionDetail | null = useMemo(() => {
    if (!selectedSessionId) return null;
    const session = sessionsById.get(selectedSessionId);
    if (!session) return null;

    return {
      id: session.sessionId,
      transactionCode: session.transactionCode,
      startTime: formatTime(session.startAt),
      endTime: formatTime(session.endAt),
      duration: formatDuration(session.startAt, session.endAt),
      actions: session.actions,
    };
  }, [selectedSessionId, sessionsById]);

  const handleTopProductsExport = async (format: 'csv' | 'png' | 'pdf') => {
    const data = topProductsData.map(item => ({
      Product: item.name,
      Count: item.count
    }));
    
    if (format === 'csv') {
      await exportData(format, data, { filename: 'top-products' });
    } else {
      await exportData(format, 'top-products-chart', { 
        filename: 'top-products',
        title: 'Top Products'
      });
    }
  };

  const handleHourlyActivityExport = async (format: 'csv' | 'png' | 'pdf') => {
    const data = hourlyActivityData.map(item => ({
      Hour: item.hour,
      Count: item.count
    }));
    
    if (format === 'csv') {
      await exportData(format, data, { filename: 'hourly-activity' });
    } else {
      await exportData(format, 'hourly-activity-chart', { 
        filename: 'hourly-activity',
        title: 'Hourly Activity'
      });
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      <Sidebar activePage="Transactions" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col">
        <Topbar onLogout={onLogout} pageTitle="Transactions" />

        <main style={{ padding: '24px' }}>
          {/* Filters */}
          <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  style={{
                    width: '300px',
                    height: '40px',
                    paddingLeft: '40px',
                    paddingRight: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Fridge Dropdown */}
              <select
                value={fridgeFilter}
                onChange={(e) => setFridgeFilter(e.target.value)}
                className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{
                  width: '200px',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: fridgeFilter ? '#1A1C1E' : '#9CA3AF',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Fridges</option>
                {fridges.map((fridge) => (
                  <option key={fridge.id} value={fridge.id}>
                    {fridge.id} - {fridge.name}
                  </option>
                ))}
              </select>

              {/* Product Dropdown */}
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{
                  width: '200px',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: productFilter ? '#1A1C1E' : '#9CA3AF',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Products</option>
                {Array.from(new Set(transactions.map((txn) => txn.product))).map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>

            {/* Right Section - Date Range */}
            <div className="flex items-center gap-2">
              <Calendar size={18} style={{ color: '#6B7280' }} />
              <button
                onClick={() => setDateRange('today')}
                className="transition-colors"
                style={{
                  height: '36px',
                  padding: '0 16px',
                  backgroundColor: dateRange === 'today' ? '#EFF6FF' : 'transparent',
                  color: dateRange === 'today' ? '#2563EB' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
              <button
                onClick={() => setDateRange('7days')}
                className="transition-colors"
                style={{
                  height: '36px',
                  padding: '0 16px',
                  backgroundColor: dateRange === '7days' ? '#EFF6FF' : 'transparent',
                  color: dateRange === '7days' ? '#2563EB' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  cursor: 'pointer'
                }}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateRange('30days')}
                className="transition-colors"
                style={{
                  height: '36px',
                  padding: '0 16px',
                  backgroundColor: dateRange === '30days' ? '#EFF6FF' : 'transparent',
                  color: dateRange === '30days' ? '#2563EB' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  cursor: 'pointer'
                }}
              >
                Last 30 Days
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div
            className="bg-white"
            style={{
              borderRadius: '12px',
              boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
              padding: '24px',
              marginBottom: '24px',
              overflow: 'auto'
            }}
          >
            {isLoading || isFetching ? (
              <TableSkeleton />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Timestamp
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Fridge
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Product
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Action
                    </th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Quantity
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Transaction Code
                    </th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn, index) => (
                    <tr
                      key={txn.id}
                      className="transition-colors"
                      style={{
                        borderBottom: index < filteredTransactions.length - 1 ? '1px solid #F3F4F6' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '18px 8px', fontSize: '14px', color: '#1A1C1E' }}>
                        {txn.timestamp}
                      </td>
                      <td style={{ padding: '18px 8px', fontSize: '14px', color: '#6B7280' }}>
                        {txn.fridge}
                      </td>
                      <td style={{ padding: '18px 8px', fontSize: '14px', fontWeight: 500, color: '#1A1C1E', textAlign: txn.quantity <= 0 ? 'center' : 'left' }}>
                        {txn.quantity <= 0 ? (
                          <div className="flex w-full items-center justify-center">-</div>
                        ) : (
                          txn.product
                        )}
                      </td>
                      <td style={{ padding: '18px 8px', textAlign: txn.quantity <= 0 ? 'center' : 'left' }}>
                        {txn.quantity <= 0 ? (
                          <div className="flex w-full items-center justify-center">
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: getActionColor(txn.action)
                              }}
                            >
                              -
                            </span>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: getActionColor(txn.action)
                            }}
                          >
                            {txn.action}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '18px 8px', fontSize: '14px', fontWeight: 600, color: '#1A1C1E', textAlign: 'center' }}>
                        {txn.quantity <= 0 ? '0' : `${txn.action === 'Take' ? '-' : '+'}${txn.quantity}`}
                      </td>
                      <td style={{ padding: '18px 8px' }}>
                        <code 
                          className="hover:underline cursor-pointer"
                          style={{ 
                            fontSize: '13px', 
                            color: '#2563EB', 
                            fontFamily: 'monospace',
                            fontWeight: 500
                          }}
                          title={txn.transactionCode}
                        >
                          {txn.transactionCode}
                        </code>
                      </td>
                      <td style={{ padding: '18px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedSessionId(txn.sessionId)}
                          className="transition-colors hover:underline"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563EB',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          View Session
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {filteredTransactions.length === 0 && !isLoading && !isFetching && (
              <EmptyState 
                title="No transactions found"
                description="Try adjusting your search filters to find transactions."
              />
            )}
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-2 gap-6" style={{ marginBottom: '24px' }}>
            {/* Top Products Chart */}
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <div
                id="top-products-chart"
                className="bg-white"
                style={{
                  height: '260px',
                  borderRadius: '12px',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
                  padding: '20px'
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1C1E' }}>
                    Top Products
                  </h3>
                  <ExportButton onExport={handleTopProductsExport} />
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={topProductsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    />
                    <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Hourly Activity Chart */}
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <div
                id="hourly-activity-chart"
                className="bg-white"
                style={{
                  height: '260px',
                  borderRadius: '12px',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
                  padding: '20px'
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1C1E' }}>
                    Hourly Activity
                  </h3>
                  <ExportButton onExport={handleHourlyActivityExport} />
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={hourlyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="hour" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center" style={{ marginTop: '32px' }}>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
              © 2025 Smart Fridge System
            </p>
          </div>
        </main>
      </div>

      <SessionDetailsDrawer
        isOpen={selectedSessionId !== null}
        session={selectedSession}
        onClose={() => setSelectedSessionId(null)}
      />
    </div>
  );
}