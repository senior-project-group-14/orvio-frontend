import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Search, X, AlertTriangle } from 'lucide-react';
import { EmptyState } from './ui/empty-state';
import { TableSkeleton } from './ui/table-skeleton';
import { getAdminDevices, getDeviceAlerts, updateAlert } from '../api/client';
import { formatDateTime, formatRelativeTime } from '../utils/time';
import { ALERT_STATUS } from '../utils/constants';

interface AlertsScreenProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

interface Alert {
  id: string;
  type: string;
  fridge: string;
  fridgeId: string;
  severity: 'High' | 'Medium' | 'Low';
  message: string;
  timestamp: string;
  status: 'Open' | 'Acknowledged' | 'Resolved';
  status_id: number;
  resolutionNote?: string;
  description: string;
  createdAt: string;
}

export default function AlertsScreen({ onLogout, onNavigate }: AlertsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fridgeFilter, setFridgeFilter] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [fridges, setFridges] = useState<{ id: string; name: string }[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');



  const getSeverity = (alertType?: string | null): 'High' | 'Medium' | 'Low' => {
    const normalized = (alertType || '').toLowerCase();
    if (normalized.includes('temperature') || normalized.includes('door')) return 'High';
    if (normalized.includes('connection') || normalized.includes('power')) return 'Medium';
    return 'Low';
  };

  const formatStatus = (statusId?: number | null): 'Open' | 'Acknowledged' | 'Resolved' => {
    if (statusId === ALERT_STATUS.RESOLVED) return 'Resolved';
    if (statusId === ALERT_STATUS.ACKNOWLEDGED) return 'Acknowledged';
    return 'Open';
  };

  const resolveAlert = async (alertId: string, resolutionNote: string) => {
    const trimmedNote = resolutionNote.trim();
    if (!trimmedNote) return;

    try {
      await updateAlert(alertId, ALERT_STATUS.RESOLVED, undefined, trimmedNote);
      setAlerts((prev) => prev.map((alert) => (alert.id === alertId
        ? { ...alert, status: 'Resolved', status_id: ALERT_STATUS.RESOLVED, resolutionNote: trimmedNote }
        : alert)));
      setSelectedAlert(null);
      setResolutionNoteInput('');
    } catch (error) {
      console.error('Failed to resolve alert', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadAlerts = async () => {
      setIsFetching(true);
      setIsLoading(true);
      try {
        const devicesResponse = await getAdminDevices({ limit: 100 });
        const devices = devicesResponse.data;
        const deviceNameMap = new Map(devices.map((device) => [device.device_id, device.name || device.device_id]));
        const deviceOptions = devices.map((device) => ({ id: device.device_id, name: device.name || device.device_id }));

        const results = await Promise.all(
          devices.map((device) => getDeviceAlerts(device.device_id, undefined, { limit: 100 }).then(r => r.data).catch(() => []))
        );
        const all = results.flat();
        const mapped = all.map((alert) => ({
          id: alert.alert_id,
          type: alert.alert_type,
          fridge: deviceNameMap.get(alert.device_id) || alert.device_id,
          fridgeId: alert.device_id,
          severity: getSeverity(alert.alert_type),
          message: alert.message,
          timestamp: formatRelativeTime(alert.timestamp),
          status: formatStatus(alert.status_id),
          status_id: alert.status_id,
          resolutionNote: alert.resolution_note || undefined,
          description: alert.message,
          createdAt: formatDateTime(alert.timestamp),
        }));

        if (isMounted) {
          setFridges(deviceOptions);
          setAlerts(mapped.length > 0 ? mapped : []);
        }
      } catch (error) {
        console.error('Failed to load alerts', error);
        if (isMounted) {
          setFridges([]);
          setAlerts([]);
        }
      } finally {
        if (isMounted) {
          setIsFetching(false);
          setIsLoading(false);
        }
      }
    };

    loadAlerts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.fridge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = !severityFilter || alert.severity === severityFilter;
    const matchesStatus = !statusFilter || alert.status === statusFilter;
    const matchesFridge = !fridgeFilter || alert.fridgeId === fridgeFilter;

    return matchesSearch && matchesSeverity && matchesStatus && matchesFridge;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return '#DC2626';
      case 'Medium':
        return '#F59E0B';
      case 'Low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return '#DC2626';
      case 'Acknowledged':
        return '#F59E0B';
      case 'Resolved':
        return '#9CA3AF';
      default:
        return '#6B7280';
    }
  };

  const handleResolveAlert = (alertId: string) => {
    resolveAlert(alertId, resolutionNoteInput);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSeverityFilter('');
    setStatusFilter('');
    setFridgeFilter('');
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      <Sidebar activePage="Alerts" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col">
        <Topbar onLogout={onLogout} pageTitle="Alerts" />

        <main style={{ padding: '24px' }}>
          {/* Filter Bar */}
          <div className="flex items-center gap-4" style={{ marginBottom: '24px' }}>
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
                placeholder="Search alerts..."
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

            {/* Severity Dropdown */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                width: '150px',
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                color: severityFilter ? '#1A1C1E' : '#9CA3AF',
                cursor: 'pointer'
              }}
            >
              <option value="">All Severity</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                width: '150px',
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                color: statusFilter ? '#1A1C1E' : '#9CA3AF',
                cursor: 'pointer'
              }}
            >
              <option value="">All Status</option>
              <option value="Open">Open</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>

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

            {/* Reset Filters */}
            <button
              onClick={handleResetFilters}
              className="transition-colors hover:underline"
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>

          {/* Alerts Table */}
          <div
            className="bg-white"
            style={{
              borderRadius: '12px',
              boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
              padding: '24px',
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
                      Alert Type
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Fridge
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Severity
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Message
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Timestamp
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Status
                    </th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert, index) => (
                    <tr
                      key={alert.id}
                      className="transition-colors"
                      style={{
                        borderBottom: index < filteredAlerts.length - 1 ? '1px solid #F3F4F6' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '16px 8px', fontSize: '14px', fontWeight: 500, color: '#1A1C1E' }}>
                        {alert.type}
                      </td>
                      <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6B7280' }}>
                        {alert.fridge}
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: getSeverityColor(alert.severity),
                            backgroundColor: `${getSeverityColor(alert.severity)}15`
                          }}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6B7280', maxWidth: '300px' }}>
                        {alert.message}
                      </td>
                      <td style={{ padding: '16px 8px', fontSize: '14px', color: '#9CA3AF' }}>
                        {alert.timestamp}
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: getStatusColor(alert.status),
                            backgroundColor: `${getStatusColor(alert.status)}15`
                          }}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedAlert(alert);
                            setResolutionNoteInput(alert.resolutionNote || '');
                          }}
                          className="transition-colors hover:bg-blue-700"
                          style={{
                            height: '32px',
                            padding: '0 16px',
                            backgroundColor: '#2563EB',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {filteredAlerts.length === 0 && !isLoading && !isFetching && (
              <EmptyState 
                title="No alerts found"
                description="Try adjusting your search filters to find alerts."
                icon={<AlertTriangle size={48} strokeWidth={1.5} />}
              />
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

      {/* Alert Detail Drawer */}
      {selectedAlert && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedAlert(null)}
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', top: 0, left: 0 }}
          />

          {/* Drawer */}
          <div
            className="fixed top-0 right-0 h-full bg-white shadow-xl z-50"
            style={{
              width: '380px',
              padding: '24px',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between" style={{ marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '8px' }}>
                  {selectedAlert.type}
                </h3>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: getSeverityColor(selectedAlert.severity),
                    backgroundColor: `${getSeverityColor(selectedAlert.severity)}15`
                  }}
                >
                  {selectedAlert.severity}
                </span>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="transition-colors hover:bg-gray-100 rounded p-1"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <X size={20} style={{ color: '#6B7280' }} />
              </button>
            </div>

            {/* Alert Info */}
            <div className="space-y-4" style={{ marginBottom: '24px' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Fridge</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#1A1C1E' }}>
                  {selectedAlert.fridge}
                </p>
                <p style={{ fontSize: '13px', color: '#9CA3AF' }}>{selectedAlert.fridgeId}</p>
              </div>

              <div>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Created At</p>
                <p style={{ fontSize: '14px', color: '#1A1C1E' }}>{selectedAlert.createdAt}</p>
              </div>

              <div>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Description</p>
                <p style={{ fontSize: '14px', color: '#1A1C1E', lineHeight: '1.5' }}>
                  {selectedAlert.description}
                </p>
              </div>

              <div>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Status</p>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: getStatusColor(selectedAlert.status),
                    backgroundColor: `${getStatusColor(selectedAlert.status)}15`
                  }}
                >
                  {selectedAlert.status}
                </span>
              </div>

              {selectedAlert.status === 'Resolved' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Resolution Note</p>
                  <p style={{ fontSize: '14px', color: '#1A1C1E', lineHeight: '1.5' }}>
                    {selectedAlert.resolutionNote || '-'}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedAlert.status !== 'Resolved' && (
              <div>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Resolution Note</p>
                <textarea
                  value={resolutionNoteInput}
                  onChange={(e) => setResolutionNoteInput(e.target.value)}
                  placeholder="Write how this alert was resolved"
                  style={{
                    width: '100%',
                    minHeight: '88px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: '#1A1C1E',
                    marginBottom: '12px',
                    resize: 'vertical'
                  }}
                />
                <button
                  onClick={() => handleResolveAlert(selectedAlert.id)}
                  disabled={!resolutionNoteInput.trim()}
                  className="w-full transition-colors hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    height: '44px',
                    backgroundColor: '#2563EB',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: resolutionNoteInput.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Resolve Alert
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}