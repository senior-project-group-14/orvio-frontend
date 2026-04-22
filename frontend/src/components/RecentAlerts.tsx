import { memo } from 'react';
import { EmptyState } from './ui/empty-state';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface RecentAlertsProps {
  isLoading?: boolean;
  alerts?: {
    type: string;
    fridge: string;
    severity: 'High' | 'Medium' | 'Low';
    time: string;
  }[];
}

function RecentAlerts({ isLoading = false, alerts }: RecentAlertsProps) {
  const resolvedAlerts = alerts ?? [];

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

  return (
    <div 
      className="bg-white"
      style={{
        height: '300px',
        borderRadius: '12px',
        boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '16px' }}>
        Recent Alerts
      </h2>

      {isLoading ? (
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          ))}
        </div>
      ) : resolvedAlerts.length === 0 ? (
        <EmptyState 
          title="No alerts"
          description="There are no recent alerts to display."
          icon={<AlertTriangle size={48} strokeWidth={1.5} />}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>
                  Alert Type
                </th>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>
                  Fridge
                </th>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>
                  Severity
                </th>
                <th style={{ textAlign: 'right', padding: '8px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {resolvedAlerts.map((alert, index) => (
                <tr 
                  key={index}
                  style={{ 
                    borderBottom: index < resolvedAlerts.length - 1 ? '1px solid #F3F4F6' : 'none'
                  }}
                >
                  <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1A1C1E' }}>
                    {alert.type}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px', color: '#6B7280' }}>
                    {alert.fridge}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span 
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: getSeverityColor(alert.severity),
                        backgroundColor: `${getSeverityColor(alert.severity)}15`
                      }}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '13px', color: '#9CA3AF', textAlign: 'right' }}>
                    {alert.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default memo(RecentAlerts);