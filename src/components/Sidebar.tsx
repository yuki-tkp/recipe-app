import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Database, 
  Flame, 
  ChefHat, 
  TrendingUp, 
  Truck, 
  Settings as SettingsIcon,
  UserCheck,
  Type,
  LogOut
} from 'lucide-react';
import { store, SystemSettings } from '../services/store';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  settings: SystemSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, settings }) => {
  const menuItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { id: 'inventory', label: '棚卸表', icon: ClipboardList },
    { id: 'ingredients', label: '食材マスタ', icon: Database },
    { id: 'preps', label: '仕込みレシピ', icon: ChefHat },
    { id: 'recipes', label: '提供レシピ', icon: Flame },
    { id: 'cost', label: '原価計算票', icon: TrendingUp },
    { id: 'suppliers', label: '業者管理', icon: Truck },
    { id: 'settings', label: '設定', icon: SettingsIcon },
  ];

  const userRole = store.getUserRole();
  const visibleMenuItems = userRole === 'staff'
    ? menuItems.filter(item => item.id === 'preps' || item.id === 'recipes')
    : menuItems;

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      await store.logout();
    }
  };

  const toggleFontSize = () => {
    const newSize = settings.fontSize === 'normal' ? 'large' : 'normal';
    store.updateSettings({ fontSize: newSize });
  };

  return (
    <aside className="sidebar no-print">
      {/* App Logo */}
      <div className="sidebar-logo">
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        }}>
          <ChefHat size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.05em', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            スマート原価
          </h1>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            レシピ＆棚卸管理
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? 'var(--primary-hover)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                fontSize: '0.95rem',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              }}
              className="sidebar-link"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom User / Setting Tools */}
      <div className="sidebar-footer">
        {/* Font Size Toggle */}
        <button
          onClick={toggleFontSize}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(255, 255, 255, 0.02)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Type size={15} />
            <span>大きめ文字表示</span>
          </div>
          <span style={{
            fontSize: '0.75rem',
            background: settings.fontSize === 'large' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '12px',
          }}>
            {settings.fontSize === 'large' ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px',
            marginTop: '8px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 700,
            transition: 'all 0.2s',
          }}
        >
          <LogOut size={16} />
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  );
};
