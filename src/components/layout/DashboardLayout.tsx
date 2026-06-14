import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Sprout, 
  Map, 
  CloudSun, 
  ScanLine, 
  ShoppingBag, 
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  Stethoscope,
  ClipboardList,
  Tractor,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, roleLabels, roleIcons, UserRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import AIAssistant from '@/components/ai/AIAssistant';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  path: string;
}

const menuItemsByRole: Record<UserRole, MenuItem[]> = {
  farmer: [
    { icon: Home, labelKey: 'nav.dashboard', path: '/farmer' },
    { icon: Map, labelKey: 'nav.farmMapping', path: '/farmer/map' },
    { icon: CloudSun, labelKey: 'nav.weatherCrops', path: '/farmer/weather' },
    { icon: ScanLine, labelKey: 'nav.diseaseDetection', path: '/farmer/disease' },
    { icon: Sparkles, labelKey: 'Quality Grading', path: '/farmer/quality' },
    { icon: ShoppingBag, labelKey: 'nav.myProducts', path: '/farmer/products' },
    { icon: ClipboardList, labelKey: 'nav.orders', path: '/farmer/orders' },
    { icon: Tractor, labelKey: 'Equipment Rental', path: '/farmer/equipment' },
    { icon: ArrowRightLeft, labelKey: 'Direct Trading', path: '/farmer/trading' },
    { icon: Stethoscope, labelKey: 'Nearby Vets', path: '/farmer/vets' },
    { icon: FileText, labelKey: 'nav.govtSchemes', path: '/farmer/schemes' },
  ],
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const menuItems = menuItemsByRole[user.role] || [];

  // Helper to get translated label or fallback to key
  const getLabel = (labelKey: string) => {
    const translated = t(labelKey);
    // If the translation returns the key itself (not found), use the key as label
    return translated === labelKey ? labelKey : translated;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-[85vw] max-w-[280px] lg:w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border">
          <Link to="/farmer" className="flex items-center gap-2 text-lg lg:text-xl font-bold text-primary">
            <Sprout className="h-6 w-6 lg:h-7 lg:w-7" />
            <span>Farmaline</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-3 hover:bg-muted rounded-xl touch-target"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="p-3 lg:p-4 border-b border-border">
          <div className="flex items-center gap-3 p-2.5 lg:p-3 bg-muted/50 rounded-xl">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-primary/10 flex items-center justify-center text-base lg:text-lg">
              {roleIcons[user.role]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm lg:text-base">{user.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[user.role]}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 lg:px-4 py-3.5 lg:py-3 rounded-xl transition-all duration-200 touch-target",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground active:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium text-sm lg:text-base">{getLabel(item.labelKey)}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 lg:p-4 border-t border-border space-y-1">
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 lg:px-4 py-3.5 lg:py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-target"
          >
            <ChevronRight className="h-5 w-5" />
            <span className="font-medium text-sm lg:text-base">Profile</span>
          </Link>
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 lg:px-4 py-3.5 lg:py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-target"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium text-sm lg:text-base">{t('common.settings')}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 lg:px-4 py-3.5 lg:py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors touch-target"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium text-sm lg:text-base">{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 lg:h-16 bg-card border-b border-border flex items-center justify-between px-3 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-3 hover:bg-muted rounded-xl touch-target active:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              {title && <h1 className="text-base lg:text-lg font-bold truncate">{title}</h1>}
              {subtitle && <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            <LanguageSwitcher />
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive h-10 w-10 lg:h-9 lg:w-9"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 lg:p-6 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Global AI Agent for the farmer workspace */}
      <AIAssistant userRole={user.role} currentPage={location.pathname} />
    </div>
  );
}
