import { useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ExportButton } from './ui/export-button';
import { ChartSkeleton } from './ui/table-skeleton';
import { exportData } from '../utils/export';

interface AnalyticsItem {
  name: string;
  count: number;
}

interface HourlyItem {
  hour: string;
  count: number;
}

interface TransactionsAnalyticsProps {
  isLoading: boolean;
  topProductsData: AnalyticsItem[];
  hourlyActivityData: HourlyItem[];
}

export default function TransactionsAnalytics({
  isLoading,
  topProductsData,
  hourlyActivityData,
}: TransactionsAnalyticsProps) {
  const handleTopProductsExport = useCallback(async (format: 'csv' | 'png' | 'pdf') => {
    const data = topProductsData.map((item) => ({
      Product: item.name,
      Count: item.count,
    }));

    if (format === 'csv') {
      await exportData(format, data, { filename: 'top-products' });
    } else {
      await exportData(format, 'top-products-chart', {
        filename: 'top-products',
        title: 'Top Products',
      });
    }
  }, [topProductsData]);

  const handleHourlyActivityExport = useCallback(async (format: 'csv' | 'png' | 'pdf') => {
    const data = hourlyActivityData.map((item) => ({
      Hour: item.hour,
      Count: item.count,
    }));

    if (format === 'csv') {
      await exportData(format, data, { filename: 'hourly-activity' });
    } else {
      await exportData(format, 'hourly-activity-chart', {
        filename: 'hourly-activity',
        title: 'Hourly Activity',
      });
    }
  }, [hourlyActivityData]);

  return (
    <div className="grid grid-cols-2 gap-6" style={{ marginBottom: '24px' }}>
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
            padding: '20px',
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
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
            padding: '20px',
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
                  fontSize: '13px',
                }}
              />
              <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
