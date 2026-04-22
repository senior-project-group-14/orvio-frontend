import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ArrowLeft } from 'lucide-react';
import StatusTab from './FridgeDetailTabs/StatusTab';
import InventoryTab from './FridgeDetailTabs/InventoryTab';
import SessionsTab from './FridgeDetailTabs/SessionsTab';
import AlertsTab from './FridgeDetailTabs/AlertsTab';
import { Skeleton } from './ui/skeleton';
import { getAdminDevices, getDeviceTelemetry, getDeviceAlerts } from '../api/client';
import { formatRelativeTime } from '../utils/time';
import { ALERT_STATUS } from '../utils/constants';
import fridgeIllustration from '../assets/fridge-illustration.svg';
import fridgeWhiteLights from '../assets/fridge-white-lights.svg';
import fridgeRedLights from '../assets/fridge-red-lights.svg';

interface FridgeDetailProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
  fridgeId: string;
}

interface FridgeHeaderData {
  name: string;
  location: string;
  status: 'online' | 'offline';
  door: 'open' | 'closed';
  temperature: string;
  lastActive: string;
}

const defaultFridgeData: FridgeHeaderData = {
  name: 'Loading...',
  location: '',
  status: 'offline',
  door: 'closed',
  temperature: 'N/A',
  lastActive: 'N/A',
};

function FridgeDetail({ onLogout, onNavigate, fridgeId }: FridgeDetailProps) {
  const [activeTab, setActiveTab] = useState('Status');
  const [isLoading, setIsLoading] = useState(true);
  const [fridgeData, setFridgeData] = useState<FridgeHeaderData>(defaultFridgeData);
  const [temperatureTrend, setTemperatureTrend] = useState<number[]>([]);
  const [hasOpenAlert, setHasOpenAlert] = useState(false);

  const normalizeStatus = (status?: string | null): 'online' | 'offline' => {
    if (!status) return 'offline';
    const normalized = status.toLowerCase();
    return normalized.includes('online') || normalized.includes('active') ? 'online' : 'offline';
  };

  useEffect(() => {
    let isMounted = true;

    const loadFridge = async () => {
      setIsLoading(true);
      try {
        const devicesResponse = await getAdminDevices({ limit: 100 });
        const devices = devicesResponse.data;
        const device = devices.find((item) => item.device_id === fridgeId);

        if (device) {
          const telemetryResponse = await getDeviceTelemetry(device.device_id, { limit: 7 }).catch(() => ({ data: [] }));
          const telemetry = telemetryResponse.data;
          const alertsResponse = await getDeviceAlerts(device.device_id, ALERT_STATUS.OPEN, { limit: 1 }).catch(() => ({ data: [] }));
          const openAlerts = alertsResponse.data;
          const latestTelemetry = telemetry[0];
          const temperatureValue = latestTelemetry?.internal_temperature ?? device.default_temperature;
          const doorStatus = latestTelemetry?.door_sensor_status ?? device.door_status;
          const lastActive = device.last_checkin_time || latestTelemetry?.timestamp || null;

          const nextFridgeData: FridgeHeaderData = {
            name: device.name || 'Unnamed fridge',
            location: device.location_description || 'Unknown location',
            status: normalizeStatus(device.status),
            door: doorStatus ? 'open' : 'closed',
            temperature: temperatureValue !== undefined && temperatureValue !== null ? `${temperatureValue}°C` : 'N/A',
            lastActive: formatRelativeTime(lastActive),
          };

          const trendValues = telemetry
            .slice(0, 7)
            .reverse()
            .map((item) => Number(item.internal_temperature))
            .filter((value) => !Number.isNaN(value));

          if (isMounted) {
            setFridgeData(nextFridgeData);
            setTemperatureTrend(trendValues);
            setHasOpenAlert(openAlerts.length > 0);
          }
        }
      } catch (error) {
        console.error('Failed to load fridge details', error);
        if (isMounted) {
          setFridgeData(defaultFridgeData);
          setHasOpenAlert(false);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFridge();
    return () => {
      isMounted = false;
    };
  }, [fridgeId]);

  const tabs = useMemo(() => ['Status', 'Inventory', 'Sessions', 'Alerts'], []);
  const handleBackToFridges = useCallback(() => {
    onNavigate('Fridges');
  }, [onNavigate]);

  const getStatusColor = (status: string) => {
    return status === 'online' ? '#10B981' : '#9CA3AF';
  };

  const getDoorColor = (door: string) => {
    return door === 'open' ? '#F59E0B' : '#10B981';
  };

  const fridgeImageSrc = hasOpenAlert
    ? fridgeRedLights
    : fridgeData.status === 'online'
      ? fridgeWhiteLights
      : fridgeIllustration;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Sidebar */}
      <Sidebar activePage="Fridges" onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <Topbar onLogout={onLogout} pageTitle="Fridge Detail" />

        {/* Content */}
        <main style={{ padding: '24px' }}>
          {/* Back Button */}
          <button
            onClick={handleBackToFridges}
            className="flex items-center gap-2 mb-4 transition-colors hover:text-blue-700"
            style={{
              background: 'none',
              border: 'none',
              color: '#2563EB',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
            Back to Fridges
          </button>

          <div>
            {/* Header Section - Fridge Info */}
            <div
              className="bg-white flex items-center justify-between"
              style={{
                width: '100%',
                borderRadius: '12px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
                padding: '20px 24px',
                marginBottom: '24px'
              }}
            >
              <div style={{ minWidth: 0, paddingRight: '16px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1A1C1E', marginBottom: '6px' }}>
                  {fridgeData.name}
                </h1>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>
                  {fridgeData.location}
                </p>

                <div className="flex items-center gap-2" style={{ marginTop: '14px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '28px',
                      padding: '0 12px',
                      borderRadius: '14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: getStatusColor(fridgeData.status),
                      backgroundColor: `${getStatusColor(fridgeData.status)}15`
                    }}
                  >
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(fridgeData.status)
                      }}
                    />
                    {fridgeData.status === 'online' ? 'Online' : 'Offline'}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: '28px',
                      padding: '0 12px',
                      borderRadius: '14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: getDoorColor(fridgeData.door),
                      backgroundColor: `${getDoorColor(fridgeData.door)}15`,
                      textTransform: 'capitalize'
                    }}
                  >
                    Door: {fridgeData.door}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: '28px',
                      padding: '0 12px',
                      borderRadius: '14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF'
                    }}
                  >
                    {fridgeData.temperature}
                  </span>

                  <span style={{ fontSize: '13px', color: '#6B7280' }}>
                    Last active: {fridgeData.lastActive}
                  </span>
                </div>
              </div>

              <div aria-hidden="true" className="pointer-events-none flex items-center justify-center" style={{ flexShrink: 0 }}>
                <img
                  src={fridgeImageSrc}
                  alt=""
                  style={{
                    width: '96px',
                    height: '128px',
                    display: 'block'
                  }}
                />
              </div>
            </div>

              {/* Tabs */}
              <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }}>
                <div className="flex gap-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="relative transition-colors"
                      style={{
                        background: 'none',
                        border: 'none',
                        height: '48px',
                        fontSize: '14px',
                        fontWeight: activeTab === tab ? 600 : 500,
                        color: activeTab === tab ? '#2563EB' : '#6B7280',
                        cursor: 'pointer'
                      }}
                    >
                      {tab}
                      {activeTab === tab && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '2px',
                            backgroundColor: '#2563EB'
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'Status' && (
                <StatusTab fridgeData={fridgeData} temperatureTrend={temperatureTrend} isLoading={isLoading} />
              )}
              {activeTab === 'Inventory' && <InventoryTab fridgeId={fridgeId} isLoading={isLoading} />}
              {activeTab === 'Sessions' && <SessionsTab fridgeId={fridgeId} isLoading={isLoading} />}
              {activeTab === 'Alerts' && <AlertsTab fridgeId={fridgeId} isLoading={isLoading} />}
            </div>

          {/* Footer */}
          <div className="text-center" style={{ marginTop: '32px' }}>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
              © 2025 Smart Fridge System
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default memo(FridgeDetail);