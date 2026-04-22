import { memo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ExportButton } from './ui/export-button';
import { ChartSkeleton } from './ui/table-skeleton';
import { exportData } from '../utils/export';

interface ConsumptionChartProps {
  isLoading?: boolean;
  data?: { day: string; sessions: number }[];
}

function ConsumptionChart({ isLoading = false, data }: ConsumptionChartProps) {
  const resolvedData = data ?? [];

  const handleExport = useCallback(async (format: 'csv' | 'png' | 'pdf') => {
    const data = resolvedData.map(item => ({
      Day: item.day,
      Sessions: item.sessions
    }));
    
    if (format === 'csv') {
      await exportData(format, data, { filename: 'weekly-activity' });
    } else {
      await exportData(format, 'weekly-activity-chart', { 
        filename: 'weekly-activity',
        title: 'Weekly Activity'
      });
    }
  }, [resolvedData]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <div 
      id="weekly-activity-chart"
      className="bg-white"
      style={{
        height: '260px',
        borderRadius: '12px',
        boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
        padding: '20px',
        position: 'relative'
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E' }}>
          Weekly Activity
        </h2>
        <ExportButton onExport={handleExport} />
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={resolvedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis 
            dataKey="day" 
            tick={{ fill: '#6B7280', fontSize: 13 }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            tick={{ fill: '#6B7280', fontSize: 13 }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFFFFF', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '13px'
            }}
            cursor={{ fill: '#F3F4F6' }}
          />
          <Bar dataKey="sessions" fill="#2563EB" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(ConsumptionChart);