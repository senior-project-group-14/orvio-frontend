import { lazy, memo, startTransition, Suspense, useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SummaryCards from './SummaryCards';
import RecentAlerts from './RecentAlerts';
import RecentActivity from './RecentActivity';
import { ChartSkeleton } from './ui/table-skeleton';
import {
  getDashboardSummary,
} from '../api/client';
import { formatRelativeTime, formatTime } from '../utils/time';

const ConsumptionChart = lazy(() => import('./ConsumptionChart'));

type DashboardAlert = {
  type: string;
  fridge: string;
  severity: 'High' | 'Medium' | 'Low';
  time: string;
};

type DashboardActivity = {
  time: string;
  fridge: string;
  action: 'Take' | 'Return' | 'No product movement';
  count: string;
  summary: string;
};

type WeeklyActivity = { day: string; sessions: number };

interface DashboardProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

function Dashboard({ onLogout, onNavigate }: DashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{ totalFridges: number; onlineFridges: number; activeSessions: number; totalAlerts: number } | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<DashboardAlert[] | null>(null);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[] | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyActivity[] | null>(null);

  const resolvedStats = useMemo(() => stats || undefined, [stats]);
  const resolvedRecentAlerts = useMemo(() => recentAlerts || undefined, [recentAlerts]);
  const resolvedRecentActivity = useMemo(() => recentActivity || undefined, [recentActivity]);
  const resolvedWeeklyData = useMemo(() => weeklyData || undefined, [weeklyData]);

  const getSeverity = (alertType?: string | null): 'High' | 'Medium' | 'Low' => {
    const normalized = (alertType || '').toLowerCase();
    if (normalized.includes('temperature') || normalized.includes('door')) return 'High';
    if (normalized.includes('connection') || normalized.includes('power')) return 'Medium';
    return 'Low';
  };

  const getActionLabel = (actionType?: string | null, itemCount = 0): 'Take' | 'Return' | 'No product movement' => {
    if (itemCount <= 0) return 'No product movement';
    if (actionType && actionType.toLowerCase().includes('return')) return 'Return';
    return 'Take';
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const dashboardSummary = await getDashboardSummary();

        const nextStats = dashboardSummary.stats;

        const nextRecentAlerts = dashboardSummary.recentAlerts.map((alert) => ({
          type: alert.alert_type,
          fridge: alert.fridge,
          severity: getSeverity(alert.alert_type),
          time: formatRelativeTime(alert.timestamp),
        }));

        const nextRecentActivity = dashboardSummary.recentActivity.map((activity) => {
          const itemCount = Math.max(0, Number(activity.item_count || 0));
          const backendCount = (activity.display_count || '').trim();

          return {
            time: formatTime(activity.start_time),
            fridge: activity.fridge,
            action:
              itemCount === 0
                ? 'No product movement'
                : ((activity.display_action === 'Take' || activity.display_action === 'Return')
                  ? activity.display_action
                  : getActionLabel(activity.action_type, activity.item_count)),
            count:
              itemCount === 0
                ? 'No product movement'
                : (backendCount.length > 0
                  ? backendCount
                  : `${itemCount} item${itemCount === 1 ? '' : 's'}`),
            summary: activity.product_summary && activity.product_summary.trim().length > 0
              ? activity.product_summary
              : '-',
          };
        });

        const nextWeeklyData = dashboardSummary.weeklyData;

        if (!isMounted) return;
        setStats(nextStats);

        // Hydrate non-critical sections in a transition to keep the initial dashboard paint responsive.
        startTransition(() => {
          setRecentAlerts(nextRecentAlerts);
          setRecentActivity(nextRecentActivity);
          setWeeklyData(nextWeeklyData);
        });
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Sidebar */}
      <Sidebar activePage="Dashboard" onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <Topbar onLogout={onLogout} pageTitle="Dashboard" />

        {/* Content */}
        <main style={{ padding: '24px' }}>
          {/* Summary Cards */}
          <SummaryCards isLoading={isLoading} stats={resolvedStats} />

          {/* Widgets Grid */}
          <div className="grid grid-cols-3 gap-6" style={{ marginTop: '24px' }}>
            {/* Recent Alerts - 2 columns */}
            <div className="col-span-2">
              <RecentAlerts isLoading={isLoading} alerts={resolvedRecentAlerts} />
            </div>

            {/* Recent Activity - 1 column */}
            <div className="col-span-1">
              <RecentActivity isLoading={isLoading} activities={resolvedRecentActivity} />
            </div>
          </div>

          {/* Consumption Chart - Full Width */}
          <div style={{ marginTop: '24px' }}>
            <Suspense fallback={<ChartSkeleton />}>
              <ConsumptionChart isLoading={isLoading} data={resolvedWeeklyData} />
            </Suspense>
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

export default memo(Dashboard);