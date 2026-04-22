import { memo, useMemo } from 'react';
import { LayoutDashboard, Refrigerator, Bell, Receipt, UserCog, Settings, Package } from 'lucide-react';
import { getCurrentUserRole } from '../api/client';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const currentUserRole = getCurrentUserRole();
  const isSystemAdmin = currentUserRole === '1' || currentUserRole === 'SYSTEM_ADMIN';

  const menuItems = useMemo(
    () => [
      { name: 'Dashboard', icon: LayoutDashboard },
      { name: 'Fridges', icon: Refrigerator },
      { name: 'Products', icon: Package },
      { name: 'Alerts', icon: Bell },
      { name: 'Transactions', icon: Receipt },
      ...(isSystemAdmin ? [{ name: 'Admin Management', icon: UserCog }] : []),
      { name: 'Settings', icon: Settings },
    ],
    [isSystemAdmin],
  );

  return (
    <aside 
      className="bg-white"
      style={{
        width: '240px',
        height: '100vh',
        boxShadow: '0 0 6px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0
      }}
    >
      {/* Logo Area */}
      <div 
        className="flex items-center"
        style={{
          height: '72px',
          padding: '24px'
        }}
      >
        <div 
          className="rounded-full flex items-center justify-center"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#2563EB',
            marginRight: '12px',
            flexShrink: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#1A1C1E' }}>
          Smart Fridge Admin
        </span>
      </div>

      {/* Menu Items */}
      <nav style={{ padding: '0 16px' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.name;

          return (
            <button
              key={item.name}
              onClick={() => onNavigate(item.name)}
              className="w-full flex items-center gap-3 transition-all relative"
              style={{
                height: '48px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                color: isActive ? '#2563EB' : '#6B7280',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#F0F2F6';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: '-16px',
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    backgroundColor: '#2563EB',
                    borderRadius: '0 2px 2px 0'
                  }}
                />
              )}
              <Icon size={20} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default memo(Sidebar);