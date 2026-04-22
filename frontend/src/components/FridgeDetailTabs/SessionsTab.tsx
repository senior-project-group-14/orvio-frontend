import { memo, useCallback, useEffect, useState } from 'react';
import { EmptyState } from '../ui/empty-state';
import { TableSkeleton } from '../ui/table-skeleton';
import { getDeviceTransactions } from '../../api/client';
import { formatDuration, formatTime } from '../../utils/time';
import { SessionDetailsDrawer } from '../SessionDetailsDrawer';

interface SessionsTabProps {
  fridgeId: string;
  isLoading?: boolean;
}

interface Session {
  id: string;
  transactionCode: string;
  startTime: string;
  endTime: string;
  duration: string;
  actions: { type: 'take' | 'return'; product: string; quantity: number }[];
}

function SessionsTab({ fridgeId, isLoading = false }: SessionsTabProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const openSession = useCallback((session: Session) => {
    setSelectedSession(session);
  }, []);

  const closeSession = useCallback(() => {
    setSelectedSession(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      setIsFetching(true);
      try {
        const response = await getDeviceTransactions(fridgeId, { limit: 50 });
        const transactions = response.data;
        const mapped = transactions.map((txn) => {
          const items = txn.items || [];
          const actions = items
            .map((item) => ({
              type: item.action_type && item.action_type.toLowerCase().includes('return') ? 'return' : 'take',
              product: item.product?.name || 'Unknown product',
              quantity: Math.max(0, Number(item.quantity || 0)),
            }))
            .filter((item) => item.quantity > 0);
          return {
            id: txn.transaction_id,
            transactionCode: txn.transaction_code || txn.transaction_id,
            startTime: formatTime(txn.start_time),
            endTime: formatTime(txn.end_time || txn.start_time),
            duration: formatDuration(txn.start_time, txn.end_time || undefined),
            actions,
          };
        });
        if (isMounted) {
          setSessions(mapped);
        }
      } catch (error) {
        console.error('Failed to load sessions', error);
        if (isMounted) setSessions([]);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    loadSessions();
    return () => {
      isMounted = false;
    };
  }, [fridgeId]);

  return (
    <div className="relative">
      {/* Sessions Table */}
      <div
        className="bg-white"
        style={{
          width: '100%',
          minHeight: '360px',
          borderRadius: '12px',
          boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
          padding: '24px'
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '20px' }}>
          Recent Sessions
        </h2>

        <div style={{ overflowX: 'auto' }}>
          {isLoading || isFetching ? (
            <TableSkeleton columns={5} rows={5} />
          ) : sessions.length === 0 ? (
            <EmptyState 
              title="No sessions found"
              description="There are no recent sessions for this fridge."
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                    Transaction Code
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                    Start Time
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                    End Time
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                    Duration
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, index) => (
                  <tr
                    key={session.id}
                    className="transition-colors"
                    style={{
                      borderBottom: index < sessions.length - 1 ? '1px solid #F3F4F6' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '16px 8px' }}>
                      <code 
                        className="hover:underline cursor-pointer"
                        style={{ 
                          fontSize: '13px', 
                          fontWeight: 500, 
                          color: '#2563EB',
                          fontFamily: 'monospace'
                        }}
                        title={session.transactionCode}
                        onClick={() => openSession(session)}
                      >
                        {session.transactionCode}
                      </code>
                    </td>
                    <td style={{ padding: '16px 8px', fontSize: '14px', color: '#1A1C1E' }}>
                      {session.startTime}
                    </td>
                    <td style={{ padding: '16px 8px', fontSize: '14px', color: '#1A1C1E' }}>
                      {session.endTime}
                    </td>
                    <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6B7280' }}>
                      {session.duration}
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => openSession(session)}
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
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SessionDetailsDrawer
        isOpen={selectedSession !== null}
        session={selectedSession}
        onClose={closeSession}
      />
    </div>
  );
}

export default memo(SessionsTab);