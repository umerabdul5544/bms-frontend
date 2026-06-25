import { useState, useEffect, useRef } from 'react';
import SplashScreen from "./components/Splashscreen";
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { POSInterface } from './components/POSInterface';
import { InventoryManagement } from './components/InventoryManagement';
import { LedgerManagement }  from './components/LedgerManagement';
import { SalesHistory } from './components/SalesHistory';
import { CustomerManagement } from './components/CustomerManagement';
import { AdminPanel } from './components/AdminPanel';
import { UserManagement } from './components/UserManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { PurchaseManagement } from './components/PurchaseManagement';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { AccountHistoryView } from './components/FinancialReport';
import { Settings } from './components/Settings';
import { AppProvider, useApp } from './components/AppContext';
import { authApi, setAccessToken } from './utils/api';
import BanksPage from './components/BanksPage';
import { Chatbot } from './components/Chatbot';
import { 
  LogOut, 
  Shield, 
  Users, 
  Store, 
  Truck, 
  ShoppingBag, 
  ShoppingCart, 
  Package, 
  LayoutDashboard, 
  History, 
  BookOpen,
  FileText,
  Scale, 
  Landmark,
  Settings as SettingsIcon
} from 'lucide-react';

type View = 
  | 'dashboard' 
  | 'pos' 
  | 'inventory' 
  | 'ledger' 
  | 'sales' 
  | 'customers' 
  | 'admin' 
  | 'users' 
  | 'suppliers' 
  | 'purchases' 
  | 'reports' 
  | 'trial-balance' 
  | 'banks'
  | 'settings';


interface MainAppProps {
  handleSignOut: () => void;
  userEmail: string;
  userName: string;
}

function MainApp({ handleSignOut, userEmail, userName }: MainAppProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const currentViewRef = useRef<View>('dashboard');
  const { shop, settings } = useApp();

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    const shortcutHandler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const targetView: Partial<Record<string, View>> = {
        d: 'dashboard',
        i: 'inventory',
        r: 'reports',
        l: 'ledger',
        a: 'trial-balance',
        b: 'banks',
        h: 'sales',
        c: 'customers',
        t: 'users',
        u: 'suppliers',
        e: 'settings',
      };

      if (key === 'p') {
        event.preventDefault();
        if (currentViewRef.current === 'pos') {
          window.dispatchEvent(new CustomEvent('shortcut-print'));
          return;
        }
        setCurrentView('pos');
        return;
      }

      if (key === 's') {
        event.preventDefault();
        if (currentViewRef.current === 'settings') {
          window.dispatchEvent(new CustomEvent('shortcut-save'));
          return;
        }
        setCurrentView('settings');
        return;
      }

      const view = targetView[key];
      if (view) {
        event.preventDefault();
        setCurrentView(view);
      }
    };

    window.addEventListener('keydown', shortcutHandler);
    return () => window.removeEventListener('keydown', shortcutHandler);
  }, []);

  const isSuperAdmin = shop?.role === 'super_admin';
  const isAdmin = shop?.role === 'admin';
  const isManager = shop?.role === 'manager';
  const isSalesman = shop?.role === 'salesman';

  const menuItems = isSuperAdmin ? [
    { id: 'admin', label: 'Platform', icon: <Shield size={16} />, show: true },
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, show: true },
    { id: 'pos', label: 'Sales', icon: <ShoppingCart size={16} />, show: true },
    { id: 'purchases', label: 'Stock', icon: <ShoppingBag size={16} />, show: true || isManager },
    { id: 'inventory', label: 'Inventory', icon: <Package size={16} />, show: true || isManager },
    { id: 'suppliers', label: 'Suppliers', icon: <Truck size={16} />, show: true || isManager },
    { id: 'reports', label: 'Reports', icon: <FileText size={16} />, show: true || isManager },
    { id: 'ledger', label: 'Ledger', icon: <BookOpen size={16} />, show: true},
    { id: 'trial-balance', label: 'Accounts', icon: <Scale size={16} />, show: true || isManager },
    { id: 'banks', label: 'Banks', icon: <Landmark size={16} />, show: true },
    { id: 'sales', label: 'History', icon: <History size={16} />, show: true },
    { id: 'customers', label: 'Customers', icon: <Users size={16} />, show: true },
    { id: 'users', label: 'Team', icon: <Users size={16} />, show: true },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} />, show: true || isManager },
  ];

  useEffect(() => {
    if (settings.themeMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [settings.themeMode]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] flex flex-col font-sans h-screen overflow-hidden transition-colors duration-300">

      {/* Top Navigation Bar - Maroon */}
      <nav className="bg-[#8A252C] dark:bg-[#5A181D] text-white shadow-md shrink-0 z-50">
        <div className="w-full mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="h-10 w-auto object-contain bg-white/10 p-1 rounded-lg backdrop-blur-sm self-center transition-transform hover:scale-105" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Store size={22} className="text-white/90" />
                    <h1 className="text-[15px] font-semibold tracking-wide">
                      {isSuperAdmin ? 'Platform Control' : (settings?.bakeryName || shop?.shopName || 'BMS POS')}
                    </h1>
                  </div>
                )}
              </div>
              
              <div className="hidden md:flex gap-1 ml-4 border-l border-white/20 dark:border-white/10 pl-4">
                <span className="px-2 text-xs font-medium text-white/70">Terminal ID: {shop?.shopName || 'MAIN-01'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[13px] font-medium text-white">{userName}</span>
                <span className="text-[10px] text-red-200">
                  {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Owner' : isManager ? 'Manager' : 'Salesman'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-900/50 hover:bg-red-900 rounded text-sm transition-colors border border-transparent hover:border-white/10"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-grow overflow-hidden">
        {/* 🚀 New Vertical Sidebar - Peach color, Icon centric */}
        <aside className="w-[100px] bg-[#FDEBEA] dark:bg-[#1E293B] border-r border-[#EED4D3] dark:border-[#334155] flex flex-col shrink-0 overflow-y-auto scrollbar-hide z-40 py-4 transition-colors">
          <div className="flex flex-col gap-1 w-full px-2">
            {menuItems.filter(item => item.show).map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg text-center transition-all ${
                  currentView === item.id
                    ? 'bg-white dark:bg-[#334155] shadow-sm text-[#8A252C] dark:text-red-400 border border-[#EED4D3] dark:border-[#475569]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`p-1 ${currentView === item.id ? 'text-[#8A252C] dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {item.icon}
                </div>
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* 🎯 Main Content Viewer */}
        <main className="flex-grow bg-[#F4F6F8] dark:bg-[#0F172A] p-4 sm:p-6 overflow-hidden flex flex-col transition-colors">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-gray-200 dark:border-[#334155] flex-grow overflow-y-auto p-4 sm:p-6 animate-in fade-in duration-300">
            {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
            {currentView === 'pos' && <POSInterface />}
            {currentView === 'purchases' && <PurchaseManagement />}
            {currentView === 'inventory' && <InventoryManagement />}
            {currentView === 'suppliers' && <SupplierManagement />}
            {currentView === 'reports' && <ReportsAnalytics />}
            {currentView === 'ledger' && <LedgerManagement />}
            {currentView === 'trial-balance' && <AccountHistoryView />}
            {currentView === 'sales' && <SalesHistory />}
            {currentView === 'customers' && <CustomerManagement />}
            {currentView === 'users' && <UserManagement />}
            {currentView === 'admin' && <AdminPanel />}
            {currentView === 'banks' && <BanksPage />}
            {currentView === 'settings' && <Settings />}
          </div>
        </main>
      </div>

      
      {/* 🆕 Global Chatbot */}
      <Chatbot />
    </div>
  );
}


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [splashDone, setSplashDone] = useState(false);

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('token');
      setSession(null);
      setIsAuthenticated(false);
      setAccessToken(null);
      setUserEmail('');
      setUserName('');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setIsLoading(false); return; }

      setAccessToken(token);
      const result = await authApi.getSession();

      if (result.shop) {
        const name = result.shop.teamMemberName || result.shop.ownerName || '';
        setUserName(name);
        setSession(result);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      localStorage.removeItem('token');
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleAuthSuccess = (sessionData: any) => {
    if (!sessionData.shop) {
      alert('Your account is pending admin approval.');
      return;
    }
    if (sessionData.token) {
      localStorage.setItem('token', sessionData.token);
      setAccessToken(sessionData.token);
    }
    if (sessionData.shop?.email) setUserEmail(sessionData.shop.email);
    const name = sessionData.shop.teamMemberName || sessionData.shop.ownerName || '';
    setUserName(name);
    setSession(sessionData);
    setIsAuthenticated(true);
  };

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm font-medium">Synchronizing session...</p>
        </div>
      </div>
    );
  }

  console.log("Render State:", { isAuthenticated, hasSession: !!session, hasShop: !!session?.shop });

  if (!isAuthenticated || !session || !session.shop) {
    if (isAuthenticated && !session) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 text-sm font-medium">Finalizing session...</p>
          </div>
        </div>
      );
    }
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <AppProvider 
      initialShop={session.shop} 
      userName={userName}
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <MainApp handleSignOut={handleSignOut} userEmail={userEmail} userName={userName} />
    </AppProvider>
  );
}