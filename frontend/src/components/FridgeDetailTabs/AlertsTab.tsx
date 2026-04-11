import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';
import { TableSkeleton } from '../ui/table-skeleton';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { getDeviceAlerts, updateAlert } from '../../api/client';
import { formatRelativeTime } from '../../utils/time';
import { ALERT_STATUS, ALERT_STATUS_NAMES } from '../../utils/constants';

interface AlertsTabProps {
  fridgeId: string;
  isLoading?: boolean;
}

interface Alert {
  id: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  timestamp: string;
  message: string;
  status_id: number;
  resolution_note?: string;
}

export default function AlertsTab({ fridgeId, isLoading = false }: AlertsTabProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [resolveAlertId, setResolveAlertId] = useState<string | null>(null);
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');
  const [selectedResolvedAlert, setSelectedResolvedAlert] = useState<Alert | null>(null);

  const getSeverity = (alertType?: string | null): 'High' | 'Medium' | 'Low' => {
    const normalized = (alertType || '').toLowerCase();
    if (normalized.includes('temperature') || normalized.includes('door')) return 'High';
    if (normalized.includes('connection') || normalized.includes('power')) return 'Medium';
    return 'Low';
  };

  const handleUpdateAlert = async (alertId: string, nextStatusId: number, resolutionNote?: string) => {
    try {
      await updateAlert(alertId, nextStatusId, undefined, resolutionNote);
      setAlerts((prev) =>
        prev.map((alert) => (alert.id === alertId
          ? { ...alert, status_id: nextStatusId, resolution_note: resolutionNote || alert.resolution_note }
          : alert))
      );
      return true;
    } catch (error) {
      console.error('Failed to update alert', error);
      return false;
    }
  };

  const openResolveDialog = (alertId: string) => {
    setResolveAlertId(alertId);
    setResolutionNoteInput('');
  };

  const closeResolveDialog = () => {
    setResolveAlertId(null);
    setResolutionNoteInput('');
  };

  const handleResolveConfirm = async () => {
    if (!resolveAlertId) return;
    const note = resolutionNoteInput.trim();
    if (!note) return;

    const ok = await handleUpdateAlert(resolveAlertId, ALERT_STATUS.RESOLVED, note);
    if (ok) {
      closeResolveDialog();
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadAlerts = async () => {
      setIsFetching(true);
      try {
        const response = await getDeviceAlerts(fridgeId, undefined, { limit: 100 });
        const result = response.data;
        const mapped = result.map((alert) => ({
          id: alert.alert_id,
          type: alert.alert_type,
          severity: getSeverity(alert.alert_type),
          timestamp: formatRelativeTime(alert.timestamp),
          message: alert.message,
          status_id: alert.status_id,
          resolution_note: alert.resolution_note || undefined,
        }));
        if (isMounted) {
          setAlerts(mapped);
        }
      } catch (error) {
        console.error('Failed to load alerts', error);
        if (isMounted) setAlerts([]);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    loadAlerts();
    return () => {
      isMounted = false;
    };
  }, [fridgeId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return '#DC2626';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (statusId: number) => {
    if (statusId === ALERT_STATUS.RESOLVED) return '#10B981';
    if (statusId === ALERT_STATUS.ACKNOWLEDGED) return '#F59E0B';
    return '#DC2626';
  };

  const isOpenLikeStatus = (statusId: number) => statusId === ALERT_STATUS.OPEN || statusId === ALERT_STATUS.READ;

  if (alerts.length === 0 && !isLoading && !isFetching) {
    return (
      <div className="bg-white flex flex-col items-center justify-center" style={{ minHeight: '400px', borderRadius: '12px', boxShadow: '0 3px 8px rgba(0,0,0,0.05)', padding: '40px' }}>
        <EmptyState title="No alerts for this fridge" description="This fridge is operating normally." icon={<AlertTriangle size={48} strokeWidth={1.5} />} />
      </div>
    );
  }

  return (
    <div className="bg-white" style={{ width: '100%', minHeight: '400px', borderRadius: '12px', boxShadow: '0 3px 8px rgba(0,0,0,0.05)', padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '20px' }}>Alerts</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>Alert Type</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>Severity</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>Timestamp</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>Message</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>Status</th>
            <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading || isFetching ? (
            <tr><td colSpan={6} style={{ padding: '20px' }}><TableSkeleton /></td></tr>
          ) : (
            alerts.map((alert, index) => (
              <tr key={alert.id} className="transition-colors" style={{ borderBottom: index < alerts.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <td style={{ padding: '16px 8px', fontSize: '14px', fontWeight: 500, color: '#1A1C1E' }}>{alert.type}</td>
                <td style={{ padding: '16px 8px' }}>
                  <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: getSeverityColor(alert.severity), backgroundColor: `${getSeverityColor(alert.severity)}15` }}>
                    {alert.severity}
                  </span>
                </td>
                <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6B7280' }}>{alert.timestamp}</td>
                <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6B7280' }}>{alert.message}</td>
                <td style={{ padding: '16px 8px' }}>
                  <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: getStatusColor(alert.status_id), backgroundColor: `${getStatusColor(alert.status_id)}15` }}>
                    {ALERT_STATUS_NAMES[alert.status_id] || 'Open'}
                  </span>
                </td>
                <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                  <div className="flex items-center justify-center gap-2">
                    {isOpenLikeStatus(alert.status_id) && (
                      <>
                        <button className="transition-colors hover:underline" style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleUpdateAlert(alert.id, ALERT_STATUS.ACKNOWLEDGED)}>Acknowledge</button>
                        <span style={{ color: '#D1D5DB' }}>|</span>
                        <button className="transition-colors hover:underline" style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} onClick={() => openResolveDialog(alert.id)}>Resolve</button>
                      </>
                    )}
                    {alert.status_id === ALERT_STATUS.ACKNOWLEDGED && (
                      <button className="transition-colors hover:underline" style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} onClick={() => openResolveDialog(alert.id)}>Resolve</button>
                    )}
                    {alert.status_id === ALERT_STATUS.RESOLVED && (
                      <button
                        className="transition-colors hover:underline"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedResolvedAlert(alert)}
                      >
                        View Note
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {resolveAlertId && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeResolveDialog}
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          />
          <div
            className="fixed z-50"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(520px, calc(100vw - 32px))',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '6px' }}>
              Resolve Alert
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '14px' }}>
              Add a resolution note before marking this alert as resolved.
            </p>

            <div className="space-y-2" style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#6B7280' }}>Resolution Note</p>
              <Textarea
                value={resolutionNoteInput}
                onChange={(e) => setResolutionNoteInput(e.target.value)}
                placeholder="Write how this alert was resolved"
                className="min-h-24"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={closeResolveDialog}>Cancel</Button>
              <Button onClick={handleResolveConfirm} disabled={!resolutionNoteInput.trim()}>
                Resolve Alert
              </Button>
            </div>
          </div>
        </>
      )}

      {selectedResolvedAlert && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedResolvedAlert(null)}
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          />
          <div
            className="fixed z-50"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(520px, calc(100vw - 32px))',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '6px' }}>
              Resolution Note
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '14px' }}>
              {selectedResolvedAlert.type}
            </p>

            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '12px',
                minHeight: '96px',
                fontSize: '14px',
                color: '#1A1C1E',
                lineHeight: '1.5',
                marginBottom: '16px',
                whiteSpace: 'pre-wrap'
              }}
            >
              {selectedResolvedAlert.resolution_note || 'No resolution note available.'}
            </div>

            <div className="flex items-center justify-end">
              <Button variant="outline" onClick={() => setSelectedResolvedAlert(null)}>Close</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}