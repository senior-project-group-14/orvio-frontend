import { Thermometer, Wifi, DoorOpen, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { ChartSkeleton } from '../ui/table-skeleton';

interface StatusTabProps {
  fridgeData: any;
  temperatureTrend?: number[];
  isLoading?: boolean;
}

export default function StatusTab({ fridgeData, temperatureTrend, isLoading = false }: StatusTabProps) {
  const trendValues = temperatureTrend && temperatureTrend.length > 0 ? temperatureTrend : [];
  const tempData = trendValues.map((value) => ({ value }));

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <div
      className="bg-white"
      style={{
        width: '100%',
        minHeight: '260px',
        borderRadius: '12px',
        boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
        padding: '24px'
      }}
    >
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '16px' }}>
        Live Status
      </h2>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-6" style={{ marginBottom: '20px' }}>
        {/* Temperature */}
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF'
            }}
          >
            <Thermometer size={24} style={{ color: '#2563EB' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
              Temperature
            </p>
            <p style={{ fontSize: '28px', fontWeight: 600, color: '#1A1C1E' }}>
              {fridgeData.temperature}
            </p>
            <p style={{ fontSize: '12px', color: '#10B981' }}>
              Normal range
            </p>
          </div>
        </div>

        {/* Last Heartbeat */}
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#F0FDF4'
            }}
          >
            <Activity size={24} style={{ color: '#10B981' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
              Last Heartbeat
            </p>
            <p style={{ fontSize: '20px', fontWeight: 600, color: '#1A1C1E' }}>
              {fridgeData.lastActive}
            </p>
            <p style={{ fontSize: '12px', color: '#10B981' }}>
              Connected
            </p>
          </div>
        </div>

        {/* Door Status */}
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: fridgeData.door === 'open' ? '#FEF3C7' : '#F0FDF4'
            }}
          >
            <DoorOpen size={24} style={{ color: fridgeData.door === 'open' ? '#F59E0B' : '#10B981' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
              Door Status
            </p>
            <p style={{ fontSize: '20px', fontWeight: 600, color: '#1A1C1E', textTransform: 'capitalize' }}>
              {fridgeData.door}
            </p>
            <p style={{ fontSize: '12px', color: fridgeData.door === 'open' ? '#F59E0B' : '#6B7280' }}>
              {fridgeData.door === 'open' ? 'Open for 2 mins' : 'Normal'}
            </p>
          </div>
        </div>

        {/* Network Status */}
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#F0FDF4'
            }}
          >
            <Wifi size={24} style={{ color: '#10B981' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
              Network Status
            </p>
            <p style={{ fontSize: '20px', fontWeight: 600, color: '#1A1C1E' }}>
              24ms
            </p>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>
              IP: your_IPv45
            </p>
          </div>
        </div>
      </div>

      {/* Temperature Chart */}
      <div style={{ marginTop: '20px' }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', marginBottom: '12px' }}>
          Temperature Trend (Last 7 hours)
        </p>
        <div style={{ height: '80px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2563EB" 
                strokeWidth={2} 
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}