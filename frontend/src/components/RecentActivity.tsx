import { ArrowDownCircle, ArrowUpCircle, Activity } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { EmptyState } from './ui/empty-state';

interface RecentActivityProps {
  isLoading?: boolean;
  activities?: {
    time: string;
    fridge: string;
    action: 'Take' | 'Return' | 'No product movement';
    count: string;
    summary: string;
  }[];
}

export default function RecentActivity({ isLoading = false, activities }: RecentActivityProps) {
  const resolvedActivities = activities ?? [];

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
        Recent Activity
      </h2>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : resolvedActivities.length === 0 ? (
          <EmptyState
            title="No activity"
            description="There is no recent activity to display."
            icon={<Activity size={48} strokeWidth={1.5} />}
          />
        ) : (
          <div className="space-y-3">
            {resolvedActivities.map((activity, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50"
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {activity.action === 'Take' ? (
                    <ArrowDownCircle size={20} style={{ color: '#2563EB' }} />
                  ) : activity.action === 'Return' ? (
                    <ArrowUpCircle size={20} style={{ color: '#059669' }} />
                  ) : (
                    <Activity size={20} style={{ color: '#6B7280' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1C1E' }}>
                      {activity.fridge}
                    </p>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {activity.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color:
                          activity.action === 'Take'
                            ? '#2563EB'
                            : activity.action === 'Return'
                              ? '#059669'
                              : '#6B7280'
                      }}
                    >
                      {activity.action}
                    </span>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                      {activity.count}
                    </span>
                  </div>
                  {activity.summary && activity.summary !== '-' ? (
                    <div style={{ marginTop: '4px' }}>
                      <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        {activity.summary}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}