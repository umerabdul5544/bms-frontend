import { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { chatbotApi } from '../utils/api';
import { 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  ArrowRight,
  Filter,
  User,
  Trophy,
  ShoppingCart,
  FileText,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { WelcomeBanner } from './WelcomeBanner';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { products, sales, customers, suppliers, purchases, accounts, accountTransactions, getLiveBalance, settings, shop, userName, userEmail, ledgerEntries } = useApp();
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  // Check if user is a power user (can see all data)
  const userRole = (shop?.role || '').toLowerCase().trim();
  const isPowerUser = ['admin', 'super_admin', 'manager'].includes(userRole);
  const currentUserName = (userName || '').trim();
  const currentUserEmail = (userEmail || '').trim();

  // Filter sales based on user role
  const userSales = (sales || []).filter(sale => {
    if (!sale) return false;
    if (isPowerUser) return true;
    const soldBy = ((sale as any).soldBy || '').trim();
    // Show sale if soldBy matches current user OR if soldBy is empty (legacy sales)
    if (!soldBy) return true;
    return soldBy === currentUserName ||
           soldBy === currentUserEmail ||
           soldBy.toLowerCase() === currentUserEmail.toLowerCase();
  });

  // 1. Get unique list of staff members from sales history for the filter (only for power users)
  const staffMembers = isPowerUser 
    ? Array.from(new Set(userSales.map(s => (s as any).soldBy || 'Admin')))
    : [currentUserName || currentUserEmail];

  // 2. Get today's date string in UTC (same as backend saves)
  const todayLocalStr = new Date().toISOString().split('T')[0];

  // 3. Filter sales based on selected staff (only for power users)
  const filteredSales = userSales.filter(sale => {
    if (!isPowerUser) return true; 
    const matchesStaff = staffFilter === 'all' || ((sale as any).soldBy || 'Admin') === staffFilter;
    return matchesStaff;
  });

  // 4. Calculate stats based on filtered data
  const todaySales = filteredSales.filter(sale => {
    if (!sale?.date) return false;
    const saleDateStr = String(sale.date).split('T')[0];
    return saleDateStr === todayLocalStr;
  });

  const todayRevenue = todaySales.reduce((sum, sale) => sum + (parseFloat(String((sale as any).total)) || 0), 0);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (parseFloat(String((sale as any).total)) || 0), 0);
  
  // Calculate profit (only for power users)
  let todayProfit = 0;
  let totalProfit = 0;
  
  if (isPowerUser) {
    todaySales.forEach(sale => {
      let saleCost = 0;
      (sale?.items || []).forEach(item => {
        const product = (products || []).find(p => p.id === item.productId);
        const costPrice = (product as any)?.costPrice || 0;
        saleCost += costPrice * (item.quantity || 0);
      });
      todayProfit += (sale?.total || 0) - saleCost;
    });

    filteredSales.forEach(sale => {
      let saleCost = 0;
      (sale?.items || []).forEach(item => {
        const product = (products || []).find(p => p.id === item.productId);
        const costPrice = (product as any)?.costPrice || 0;
        saleCost += costPrice * (item.quantity || 0);
      });
      totalProfit += (sale?.total || 0) - saleCost;
    });
  }
  
  // These stats remain global (business-wide) - only visible to power users
  const totalReceivables = (customers || []).reduce((sum, customer) => sum + (customer?.balance || 0), 0);
  const totalPayables = (suppliers || []).reduce((sum, supplier) => sum + (supplier?.balance || 0), 0);

  const lowStockProducts = products.filter(p => p.minStock > 0 && p.stock <= p.minStock);

  const now = new Date();

  const expiringProducts = settings?.enableExpiryDate
    ? products.filter(p => {
        if (!p.expiryDate) return false;
        const expStr = String(p.expiryDate).split('T')[0];
        const exp = new Date(expStr + 'T00:00:00');
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      })
    : [];

  // AI Business Intelligence — real Gemini analysis
  const loadAIInsights = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      // Build business context for Gemini
      const last7Days = sales.filter(s => {
        if (!s?.date) return false;
        const d = new Date(String(s.date).split('T')[0]);
        return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      });
      // Top selling products
      const productSales: Record<string, number> = {};
      last7Days.forEach(s => {
        (s.items || []).forEach((item: any) => {
          productSales[item.productName] = (productSales[item.productName] || 0) + (item.quantity || 0);
        });
      });
      const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 3);

      const weekRevenue = last7Days.reduce((s, sale) => s + (Number(sale.total) || 0), 0);
      const lowStockList = lowStockProducts.map(p => `${p.name} (${p.stock}/${p.minStock})`).join(', ');

      const prompt = `You are a business analyst for a retail/bakery POS system. Analyze this data and give 3 SHORT actionable insights in bullet points. Be specific with numbers. Max 2 sentences each.

Business Data (last 7 days):
- Revenue: RS. ${weekRevenue.toLocaleString()}
- Orders: ${last7Days.length}
- Top selling: ${topProducts.map(([name, qty]) => `${name} (${qty} units)`).join(', ') || 'No data'}
- Low stock alerts: ${lowStockList || 'None'}
- Total products: ${products.length}
- Total customers: ${customers.length}

Give 3 insights as plain text bullet points starting with •. No markdown, no headers.`;

      const response = await chatbotApi.query(prompt, []);
      if (response.text) {
        const lines = response.text.split('\n').filter((l: string) => l.trim().startsWith('•') || l.trim().startsWith('-') || l.trim().length > 20);
        setAiInsights(lines.slice(0, 3));
      }
      setAiLoaded(true);
    } catch {
      setAiInsights(['• Unable to load AI insights. Check your internet connection and Gemini API key.']);
      setAiLoaded(true);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <WelcomeBanner />

      {/* AI Business Intelligence — only for power users */}
      {isPowerUser && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <Sparkles size={15} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">AI Business Insights</h3>
                <p className="text-[10px] text-gray-400">Powered by Gemini · Based on your real sales data</p>
              </div>
            </div>
            <button
              onClick={loadAIInsights}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'Analyzing...' : aiLoaded ? 'Refresh' : 'Generate Insights'}
            </button>
          </div>

          {!aiLoaded && !aiLoading && (
            <div className="text-center py-6 text-gray-400">
              <Sparkles size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Click "Generate Insights" to get AI analysis of your business data</p>
            </div>
          )}

          {aiLoading && (
            <div className="flex items-center gap-3 py-4 px-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></span>
              </div>
              <p className="text-xs text-gray-500 italic">Gemini is analyzing your sales, inventory, and customer data...</p>
            </div>
          )}

          {aiLoaded && !aiLoading && aiInsights.length > 0 && (
            <div className="space-y-2">
              {aiInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <span className="text-indigo-500 mt-0.5 shrink-0 text-sm">✦</span>
                  <p className="text-xs text-gray-700 leading-relaxed">{insight.replace(/^[•\-]\s*/, '')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Quick Actions & Alerts */}
      {isPowerUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <Trophy size={14} className="text-yellow-500" /> Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onNavigate('pos')} className="p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors text-left flex items-center gap-2">
                <ShoppingCart size={14} /> New Sale
              </button>
              <button onClick={() => onNavigate('inventory')} className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors text-left flex items-center gap-2">
                <Package size={14} /> Add Stock
              </button>
              <button onClick={() => onNavigate('customers')} className="p-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-medium transition-colors text-left flex items-center gap-2">
                <Users size={14} /> Customers
              </button>
              <button onClick={() => onNavigate('reports')} className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium transition-colors text-left flex items-center gap-2">
                <FileText size={14} /> Reports
              </button>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" /> Alerts
              </h3>
              {(lowStockProducts.length + expiringProducts.length) > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {lowStockProducts.length + expiringProducts.length} issues
                </span>
              )}
            </div>

            {(lowStockProducts.length > 0 || expiringProducts.length > 0) ? (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {expiringProducts.map(p => {
                  const expStr = String(p.expiryDate!).split('T')[0];
                  const exp = new Date(expStr + 'T00:00:00');
                  const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
                  const diffDays = Math.ceil((exp.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = diffDays <= 0;
                  const isTomorrow = diffDays === 1;
                  const isToday = diffDays === 0;
                  return (
                    <div key={`exp-${p.id}`} className={`flex items-start justify-between p-2.5 rounded-lg border text-xs ${isExpired ? 'bg-red-50 border-red-100' : isTomorrow ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-100'}`}>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-gray-500 mt-0.5">
                          SN: <span className="font-mono text-blue-600">{p.serialNumber || 'N/A'}</span>
                          {' · '}
                          {isExpired ? <span className="text-red-600 font-semibold">Expired on {exp.toLocaleDateString()}</span>
                            : isToday ? <span className="text-red-600 font-semibold">Expires TODAY</span>
                            : isTomorrow ? <span className="text-orange-600 font-semibold">Expires TOMORROW ({exp.toLocaleDateString()})</span>
                            : <span>Expires {exp.toLocaleDateString()} ({diffDays}d left)</span>
                          }
                        </p>
                      </div>
                      <span className={`shrink-0 ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isExpired ? 'bg-red-600 text-white'
                        : isToday ? 'bg-red-500 text-white'
                        : isTomorrow ? 'bg-orange-500 text-white'
                        : 'bg-yellow-500 text-white'
                      }`}>
                        {isExpired ? 'Expired' : isToday ? 'Today' : isTomorrow ? 'Tomorrow' : `${diffDays}d`}
                      </span>
                    </div>
                  );
                })}
                {lowStockProducts.map(p => (
                  <div key={`ls-${p.id}`} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${p.stock === 0 ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-gray-500 mt-0.5">
                        SN: <span className="font-mono text-blue-600">{p.serialNumber || 'N/A'}</span>
                        {' · '}Stock: <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>{p.stock}</span> / min {p.minStock}
                      </p>
                    </div>
                    <span className={`shrink-0 ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${p.stock === 0 ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'}`}>
                      {p.stock === 0 ? 'Out' : 'Low'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="text-2xl mb-1">✓</span>
                <p className="text-xs text-gray-400">No alerts</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Header & Staff Filter (only show for power users) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
          {isPowerUser ? 'Business Overview' : 'My Sales Dashboard'}
        </h2>
        
        {isPowerUser && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Filter size={14} className="text-gray-400" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Filter by Staff:</span>
            <select 
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="text-xs font-semibold text-blue-600 bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Team Members</option>
              {staffMembers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Interactive Stats Grid */}
      <div className={`grid grid-cols-2 ${isPowerUser ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-2'} gap-3`}>
        {/* Today's Sales */}
        <div 
          onClick={() => onNavigate('sales')}
          className="relative overflow-hidden bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-green-300 transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all duration-500"></div>
          <div className="relative flex items-start justify-between">
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Today's Sales</p>
              <p className="text-2xl font-semibold text-gray-800 tracking-tight">RS.{todayRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-600 font-medium mt-1 bg-green-50 w-fit px-2 py-0.5 rounded">{todaySales.length} Orders</p>
            </div>
            <div className="bg-green-100/50 p-2.5 rounded-xl group-hover:bg-green-100 group-hover:scale-110 transition-all duration-300 border border-green-100">
              <DollarSign className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div 
          onClick={() => onNavigate('sales')}
          className="relative overflow-hidden bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
          <div className="relative flex items-start justify-between">
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">
                {isPowerUser ? 'Total Revenue' : 'My Revenue'}
              </p>
             <p className="text-2xl font-semibold text-gray-800 tracking-tight">
  RS.{(totalRevenue || 0).toLocaleString()}
</p>
<p className="text-xs text-blue-600 font-medium mt-1 bg-blue-50 w-fit px-2 py-0.5 rounded">
  {isPowerUser 
    ? (staffFilter === 'all' ? 'All Staff' : `By ${staffFilter}`)
    : `${(filteredSales || []).length} Sales`
  }
</p>
            </div>
            <div className="bg-blue-100/50 p-2.5 rounded-xl group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300 border border-blue-100">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        {/* Today's Profit - Only for power users */}
        {isPowerUser && (
          <div 
            onClick={() => onNavigate('reports')}
            className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl border border-transparent shadow-[0_4px_15px_-3px_rgba(124,58,237,0.4)] cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex flex-col">
                <p className="text-xs uppercase tracking-wider text-white/80 font-medium mb-1 drop-shadow-sm">Today Profit</p>
<p className={`text-2xl font-semibold text-white tracking-tight drop-shadow-md`}>
  RS.{(todayProfit || 0).toLocaleString()}
</p>
                <p className="text-xs text-white/90 font-medium mt-1 bg-white/20 w-fit px-2 py-0.5 rounded border border-white/10">Click for details</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-xl border border-white/30 text-white shadow-inner group-hover:scale-110 transition-transform">
                <TrendingUp size={20} />
              </div>
            </div>
          </div>
        )}

        {/* Total Profit - Only for power users */}
        {isPowerUser && (
          <div 
            onClick={() => onNavigate('reports')}
            className="relative overflow-hidden bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(34,197,94,0.1)] cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-green-300 transition-all duration-300 group"
          >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all duration-500"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex flex-col">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Total Profit</p>
<p className={`text-2xl font-semibold ${(totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'} tracking-tight`}>
  RS.{(totalProfit || 0).toLocaleString()}
</p>
                <p className="text-xs text-green-600 font-medium mt-1 bg-green-50 w-fit px-2 py-0.5 rounded">View reports</p>
              </div>
              <div className="bg-green-100/50 p-2.5 rounded-xl group-hover:bg-green-100 group-hover:scale-110 transition-all duration-300 border border-green-100">
                <DollarSign className="text-green-600" size={20} />
              </div>
            </div>
          </div>
        )}

        {/* Receivables - Only for power users */}
        {isPowerUser && (
          <div 
            onClick={() => onNavigate('customers')}
            className="relative overflow-hidden bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(249,115,22,0.1)] cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-orange-300 transition-all duration-300 group"
          >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-500"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex flex-col">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Receivables</p>
                <p className="text-2xl font-semibold text-orange-600 tracking-tight">
  RS.{(totalReceivables || 0).toLocaleString()}
</p>
                <p className="text-xs text-orange-600 font-medium mt-1 bg-orange-50 w-fit px-2 py-0.5 rounded">Outstanding</p>
              </div>
              <div className="bg-orange-100/50 p-2.5 rounded-xl group-hover:bg-orange-100 group-hover:scale-110 transition-all duration-300 border border-orange-100">
                <Users className="text-orange-600" size={20} />
              </div>
            </div>
          </div>
        )}

        {/* Payables - Only for power users */}
        {isPowerUser && (
          <div 
            onClick={() => onNavigate('suppliers')}
            className="relative overflow-hidden bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(239,68,68,0.1)] cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-red-300 transition-all duration-300 group"
          >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-500"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex flex-col">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Payables</p>
                <p className="text-2xl font-semibold text-red-600 tracking-tight">
  RS.{(totalPayables || 0).toLocaleString()}
</p>
                <p className="text-xs text-red-600 font-medium mt-1 bg-red-50 w-fit px-2 py-0.5 rounded">Awaiting</p>
              </div>
              <div className="bg-red-100/50 p-2.5 rounded-xl group-hover:bg-red-100 group-hover:scale-110 transition-all duration-300 border border-red-100">
                <Truck className="text-red-600" size={20} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sales and Financial Summary (unchanged) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Sales with Staff Filter */}
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {isPowerUser 
                ? (staffFilter === 'all' ? 'Recent Transactions' : `Sales by ${staffFilter}`)
                : 'My Recent Sales'
              }
            </h3>
            <button onClick={() => onNavigate('sales')} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              VIEW HISTORY <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredSales.length > 0 ? (
              filteredSales.slice(0, 6).map(sale => (
                <div key={sale.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{sale.customerName}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-2">
                      {String(sale.date).split('T')[0]}
                      {isPowerUser && (
                        <span className="flex items-center gap-1 text-blue-500 font-medium">
                          <User size={10} /> {(sale as any).soldBy || 'Admin'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                   <p className="text-sm font-bold text-gray-900">
  RS.{parseFloat(String((sale as any).total || 0)).toLocaleString()}
</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${sale.balance > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      {sale.balance > 0 ? 'Credit' : 'Paid'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <p className="text-xs text-gray-400">No sales found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Health Summary without Cash Balance */}
        {isPowerUser ? (
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Financial Health</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => onNavigate('customers')}
                  className="p-3 border border-gray-100 dark:border-slate-800 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
                >
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Receivables</p>
                  <p className="text-lg font-black text-orange-600 dark:text-orange-500">
                    RS.{totalReceivables.toLocaleString()}
                  </p>
                </div>
                <div 
                  onClick={() => onNavigate('suppliers')}
                  className="p-3 border border-gray-100 rounded cursor-pointer hover:bg-gray-50"
                >
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Total Payables</p>
                  <p className="text-sm font-bold text-red-600">RS.{totalPayables.toLocaleString()}</p>
                </div>
              </div>

              <button 
                onClick={() => onNavigate('ledger')} 
                className="w-full mt-2 py-2 border border-blue-600 text-blue-600 rounded text-[11px] font-bold hover:bg-blue-600 hover:text-white transition-all uppercase tracking-wide shadow-sm"
              >
                Open Business Ledger
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden p-4 flex flex-col justify-center items-center text-center h-full min-h-[200px]">
             <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
               <span className="text-blue-600 text-xl font-bold">✓</span>
             </div>
             <h3 className="text-sm font-bold text-gray-800 mb-1">You are ready for sales!</h3>
             <p className="text-[11px] text-gray-500 max-w-[200px]">
               Go to the Sales module to start serving customers or adding to your daily stats.
             </p>
             <button onClick={() => onNavigate('sales')} className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700">
               Open POS System
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
