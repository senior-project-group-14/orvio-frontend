import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { getAdminDevices, getDeviceAlerts, getAlertReads, markAlertRead } from '../api/client';
import { ALERT_STATUS } from '../utils/constants';
import { formatRelativeTime } from '../utils/time';

interface TopbarProps {
  onLogout: () => void;
  pageTitle?: string;
}

interface NotificationItem {
  id: string;
  fridgeName: string;
  type: string;
  message: string;
  timestamp: string;
  createdAt: string;
  readAt?: string;
  statusId: number;
}

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

function Topbar({ onLogout, pageTitle = 'Dashboard' }: TopbarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.statusId === ALERT_STATUS.OPEN).length,
    [notifications],
  );

  const badgeLabel = useMemo(() => {
    if (unreadCount > 99) return '99+';
    return String(unreadCount);
  }, [unreadCount]);

  const loadNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const devicesResponse = await getAdminDevices({ limit: 100 });
      const devices = devicesResponse.data;
      const deviceNameMap = new Map(devices.map((device) => [device.device_id, device.name || device.device_id]));

      const alertsResults = await Promise.all(
        devices.map((device) =>
          getDeviceAlerts(device.device_id, ALERT_STATUS.OPEN, { limit: 100 })
            .then((result) => result.data)
            .catch(() => [])
        )
      );

      const nowMs = Date.now();
      const openAlerts = alertsResults.flat();
      const readRows = await getAlertReads(openAlerts.map((alert) => alert.alert_id));
      const readAtMap = new Map(readRows.map((row) => [row.alert_id, row.read_at]));

      const mapped = openAlerts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((alert) => ({
          id: alert.alert_id,
          fridgeName: deviceNameMap.get(alert.device_id) || alert.device_id,
          type: alert.alert_type,
          message: alert.message,
          timestamp: formatRelativeTime(alert.timestamp),
          createdAt: alert.timestamp,
          readAt: readAtMap.get(alert.alert_id),
          statusId: readAtMap.has(alert.alert_id) ? ALERT_STATUS.READ : ALERT_STATUS.OPEN,
        }))
        .filter((item) => {
          const readAt = item.readAt;
          if (!readAt) return true;

          const readAtMs = new Date(readAt).getTime();
          if (Number.isNaN(readAtMs)) return true;

          if (nowMs - readAtMs > SEVEN_DAYS_IN_MS) return false;

          return true;
        })
        .slice(0, 10);

      setNotifications(mapped);
    } catch (error) {
      console.error('Failed to load topbar notifications', error);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    const runLoad = () => {
      if (document.visibilityState === 'hidden') return;
      void loadNotifications();
    };

    const idleId =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(() => {
            runLoad();
          }, { timeout: 750 })
        : window.setTimeout(runLoad, 0);

    const intervalId = window.setInterval(() => {
      runLoad();
    }, 60_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runLoad();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const navigateToAlerts = useCallback(() => {
    window.location.hash = '#alerts';
    setIsNotificationsOpen(false);
  }, []);

  const handleNotificationClick = useCallback(async (notification: NotificationItem) => {
    if (notification.statusId === ALERT_STATUS.OPEN) {
      const readAtNow = new Date().toISOString();

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, statusId: ALERT_STATUS.READ, timestamp: 'just now', readAt: readAtNow }
            : item
        )
      );

      try {
        await markAlertRead(notification.id);
      } catch (error) {
        console.error('Failed to mark alert as read', error);
        void loadNotifications();
      }
    }

    setIsNotificationsOpen(false);
    window.location.hash = '#alerts';
  }, [loadNotifications]);

  return (
    <header 
      className="bg-white flex items-center justify-between"
      style={{
        height: '64px',
        padding: '0 24px',
        borderBottom: '1px solid #E5E7EB'
      }}
    >
      {/* Page Title */}
      <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1C1E' }}>
        {pageTitle}
      </h1>

      {/* Right Side */}
      <div className="flex items-center gap-4" ref={containerRef}>
        {/* Bell Icon */}
        <button 
          onClick={() => setIsNotificationsOpen((prev) => !prev)}
          className="relative transition-colors hover:bg-gray-100 rounded-full p-2"
          style={{ border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
          aria-label="Open notifications"
        >
          <Bell size={20} style={{ color: '#6B7280' }} />
          {/* Notification Badge */}
          {unreadCount > 0 && (
            <span
              className="absolute top-0 right-0 rounded-full"
              style={{
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                backgroundColor: '#DC2626',
                color: 'white',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {badgeLabel}
            </span>
          )}
        </button>

        {isNotificationsOpen && (
          <div
            className="bg-white"
            style={{
              position: 'absolute',
              top: '56px',
              right: '96px',
              width: '360px',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9' }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Notifications</span>
              <button
                onClick={navigateToAlerts}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View all
              </button>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {isLoadingNotifications ? (
                <div style={{ padding: '14px', fontSize: '13px', color: '#6B7280' }}>Loading alerts...</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '14px', fontSize: '13px', color: '#6B7280' }}>No notifications</div>
              ) : (
                notifications.map((notification, index) => (
                  <button
                    key={notification.id}
                    onClick={() => {
                      void handleNotificationClick(notification);
                    }}
                    className="w-full text-left hover:bg-gray-50 transition-colors"
                    style={{
                      padding: '12px 14px',
                      border: 'none',
                      background: notification.statusId === ALERT_STATUS.READ ? '#F3F4F6' : 'transparent',
                      borderBottom: index < notifications.length - 1 ? '1px solid #F8FAFC' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: 700, color: notification.statusId === ALERT_STATUS.READ ? '#6B7280' : '#1F2937', marginBottom: '3px' }}>
                      {notification.fridgeName} - {notification.type}
                    </p>
                    <p style={{ fontSize: '12px', color: notification.statusId === ALERT_STATUS.READ ? '#9CA3AF' : '#4B5563', marginBottom: '4px' }}>{notification.message}</p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{notification.timestamp}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Admin Avatar */}
        <div className="flex items-center gap-3">
          <div 
            className="rounded-full flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#2563EB',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            A
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#1A1C1E' }}>
            Admin
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 transition-colors hover:bg-gray-100 rounded-lg px-3 py-2"
          style={{ border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: '#6B7280' }}
        >
          <LogOut size={18} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default memo(Topbar);