import { memo } from 'react';
import { X, Clock } from 'lucide-react';

export interface SessionDetail {
  id: string;
  transactionCode: string;
  startTime: string;
  endTime: string;
  duration: string;
  actions: { type: 'take' | 'return'; product: string; quantity: number }[];
}

interface SessionDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionDetail | null;
}

function SessionDetailsDrawerComponent({ isOpen, onClose, session }: SessionDetailsDrawerProps) {
  if (!isOpen || !session) return null;

  const takenQuantity = session.actions
    .filter((action) => action.type === 'take')
    .reduce((sum, action) => sum + action.quantity, 0);
  const returnedQuantity = session.actions
    .filter((action) => action.type === 'return')
    .reduce((sum, action) => sum + action.quantity, 0);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', top: 0, left: 0 }}
      />

      <div
        className="fixed top-0 right-0 h-full bg-white shadow-xl z-50"
        style={{
          width: '380px',
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E' }}>
            Session Details
          </h3>
          <button
            onClick={onClose}
            className="transition-colors hover:bg-gray-100 rounded p-1"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={20} style={{ color: '#6B7280' }} />
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Transaction Code</p>
            <code style={{ fontSize: '15px', fontWeight: 600, color: '#1A1C1E', fontFamily: 'monospace' }}>
              {session.transactionCode}
            </code>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Time Range</p>
            <p style={{ fontSize: '14px', color: '#1A1C1E' }}>
              {session.startTime} - {session.endTime}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Duration</p>
            <p style={{ fontSize: '14px', color: '#1A1C1E' }}>{session.duration}</p>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1C1E', marginBottom: '16px' }}>
            Product Actions
          </h4>
          {session.actions.length === 0 ? (
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#F9FAFB' }}
            >
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                No product movement recorded for this transaction.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {session.actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: '#F9FAFB' }}
                >
                  <div className="flex-shrink-0">
                    {action.type === 'take' ? (
                      <Clock size={20} style={{ color: '#2563EB' }} />
                    ) : (
                      <Clock size={20} style={{ color: '#059669' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1C1E' }}>
                      {action.product}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: action.type === 'take' ? '#2563EB' : '#059669',
                          textTransform: 'capitalize',
                        }}
                      >
                        {action.type}
                      </span>
                      <span style={{ fontSize: '13px', color: '#6B7280' }}>
                        x {action.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            className="mt-4 p-3 rounded-lg"
            style={{ backgroundColor: '#F0F9FF', borderLeft: '3px solid #2563EB' }}
          >
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>Summary</p>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1C1E' }}>
              {takenQuantity} items taken, {returnedQuantity} items returned
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export const SessionDetailsDrawer = memo(SessionDetailsDrawerComponent);