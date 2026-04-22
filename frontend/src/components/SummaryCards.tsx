import { memo } from 'react';
import { Refrigerator, Wifi, Activity, AlertTriangle } from 'lucide-react';

interface SummaryCardsProps {
  isLoading?: boolean;
  stats?: {
    totalFridges: number;
    onlineFridges: number;
    activeSessions: number;
    totalAlerts: number;
  };
}

function SummaryCards({ isLoading = false, stats }: SummaryCardsProps) {
  const resolvedStats = stats || {
    totalFridges: 0,
    onlineFridges: 0,
    activeSessions: 0,
    totalAlerts: 0,
  };
  const cards = [
    {
      title: 'Total Fridges',
      value: String(resolvedStats.totalFridges),
      icon: Refrigerator,
      iconColor: '#2563EB'
    },
    {
      title: 'Online Fridges',
      value: String(resolvedStats.onlineFridges),
      icon: Wifi,
      iconColor: '#10B981'
    },
    {
      title: 'Active Sessions Today',
      value: String(resolvedStats.activeSessions),
      icon: Activity,
      iconColor: '#F59E0B'
    },
    {
      title: 'Total Alerts',
      value: String(resolvedStats.totalAlerts),
      icon: AlertTriangle,
      iconColor: '#DC2626'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-6">
        {cards.map((_, index) => (
          <div
            key={index}
            className="bg-white animate-pulse"
            style={{
              height: '120px',
              borderRadius: '12px',
              boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div 
                  style={{ 
                    height: '14px', 
                    width: '120px', 
                    backgroundColor: '#E5E7EB', 
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }} 
                />
                <div 
                  style={{ 
                    height: '28px', 
                    width: '60px', 
                    backgroundColor: '#E5E7EB', 
                    borderRadius: '4px'
                  }} 
                />
              </div>
              <div 
                className="flex items-center justify-center"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#F3F4F6'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white"
            style={{
              height: '120px',
              borderRadius: '12px',
              boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                  {card.title}
                </p>
                <p style={{ fontSize: '28px', fontWeight: 600, color: '#1A1C1E' }}>
                  {card.value}
                </p>
              </div>
              <div 
                className="flex items-center justify-center"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: `${card.iconColor}15`
                }}
              >
                <Icon size={24} style={{ color: card.iconColor }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(SummaryCards);