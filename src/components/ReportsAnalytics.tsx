import { useState } from 'react';
import { useApp } from './AppContext';
import { Calendar, TrendingUp, DollarSign, Package, Users, FileText, Download } from 'lucide-react';

export function ReportsAnalytics() {
  const { sales, products, shop, userName, userEmail } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  if (!sales || !products || !Array.isArray(sales) || !Array.isArray(products)) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 font-medium">Synchronizing reports data...</p>
      </div>
    );
  }

  const userRole = (shop?.role || '').toLowerCase().trim();
  const isPowerUser = ['admin', 'super_admin', 'manager'].includes(userRole);
  const currentUserName = (userName || '').trim();
  const currentUserEmail = (userEmail || '').trim();

  const getDateRange = () => {
    try {
      const now = new Date();
      let start = new Date();
      let end = new Date();

      if (reportType === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (reportType === 'week') {
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
      } else if (reportType === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      } else if (reportType === 'custom' && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      return { start, end };
    } catch (e) {
      return { start: new Date(), end: new Date() };
    }
  };

  const { start: dateStart, end: dateEnd } = getDateRange();

  const toNum = (v: any) => {
    if (v == null) return 0;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(String(v).replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const saleRevenue = (sale: any) => {
    const explicit = toNum(sale?.total);
    if (explicit > 0) return explicit;
    const items = Array.isArray(sale?.items) ? sale.items : [];
    const itemsSum = items.reduce((sum: number, it: any) => {
      if (!it) return sum;
      const lineTotal = toNum(it.total);
      if (lineTotal > 0) return sum + lineTotal;
      const qty = toNum(it.quantity);
      const price = toNum(it.price);
      return sum + qty * price;
    }, 0);
    const discount = toNum(sale?.discount);
    return Math.max(0, itemsSum - discount);
  };

  const userSales = sales.filter(sale => {
    if (!sale) return false;
    try {
      if (isPowerUser) return true;
      const soldBy = ((sale as any).soldBy || '').trim();
      return soldBy === currentUserName || soldBy === currentUserEmail;
    } catch (e) {
      return false;
    }
  });

  const filteredSales = userSales.filter(sale => {
    try {
      if (!sale?.date) return false;
      const saleDate = new Date(sale.date);
      return !isNaN(saleDate.getTime()) && saleDate >= dateStart && saleDate <= dateEnd;
    } catch (e) {
      return false;
    }
  });

  const salesWithProfit = filteredSales.map(sale => {
    try {
      let totalCost = 0;
      const totalRevenue = saleRevenue(sale);

      (sale?.items || []).forEach(item => {
        if (!item) return;
        const product = products.find(p => p.id === item.productId);
        const costPrice = (product as any)?.costPrice || 0;
        totalCost += costPrice * (item?.quantity || 0);
      });

      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        ...sale,
        revenue: totalRevenue,
        cost: totalCost,
        profit,
        profitMargin
      };
    } catch (e) {
      return { ...sale, revenue: 0, cost: 0, profit: 0, profitMargin: 0 };
    }
  });

  const totalRevenue = salesWithProfit.reduce((sum, s) => sum + (s?.revenue || 0), 0);
  const totalCost = salesWithProfit.reduce((sum, s) => sum + (s?.cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const productProfits = products.map(product => {
    try {
      let totalQtySold = 0;
      let totalRevenue = 0;
      let totalCost = 0;

      filteredSales.forEach(sale => {
        if (!sale) return;
        (sale?.items || []).forEach(item => {
          if (item && item.productId === product.id) {
            totalQtySold += item.quantity || 0;
            totalRevenue += item.total || 0;
            const costPrice = (product as any)?.costPrice || 0;
            totalCost += costPrice * (item.quantity || 0);
          }
        });
      });

      return {
        name: product.name || 'Unknown Product',
        qtySold: totalQtySold,
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalRevenue - totalCost,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
      };
    } catch (e) {
      return { name: product?.name || 'Error', qtySold: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
    }
  }).filter(p => p.qtySold > 0).sort((a, b) => (b.profit || 0) - (a.profit || 0));

  const salespersonProfits = isPowerUser ? (() => {
    try {
      const salespeople = Array.from(new Set(filteredSales.map(s => (s as any).soldBy || 'Admin')));
      return salespeople.map(person => {
        const personSales = salesWithProfit.filter(s => ((s as any).soldBy || 'Admin') === person);
        const revenue = personSales.reduce((sum, s) => sum + (s?.revenue || 0), 0);
        const cost = personSales.reduce((sum, s) => sum + (s?.cost || 0), 0);
        const profit = revenue - cost;

        return {
          name: person,
          salesCount: personSales.length,
          revenue,
          cost,
          profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0
        };
      }).sort((a, b) => (b.profit || 0) - (a.profit || 0));
    } catch (e) {
      return [];
    }
  })() : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} className="text-green-600" />
            Profit Reports & Analytics
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isPowerUser ? 'Business-wide profit analysis' : 'Your performance & earnings'}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold"
        >
          <Download size={16} />
          Export Report
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          {(['today', 'week', 'month', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${reportType === type
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {type === 'today' ? 'Today' : type === 'week' ? 'Last 7 Days' : type === 'month' ? 'This Month' : 'Custom Range'}
            </button>
          ))}
        </div>

        {reportType === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Revenue</p>
              <p className="text-xl font-bold text-gray-800">
                RS.{(totalRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Package className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Cost</p>
              <p className="text-xl font-bold text-gray-800">RS.{(totalCost || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Profit</p>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                RS.{(totalProfit || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Profit Margin</p>
              <p className={`text-xl font-bold ${overallMargin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {(overallMargin || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Sales Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
                {isPowerUser && <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sold By</th>}
                <th className="px-4 py-3 text-right text-xs font-bold text-blue-600 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-orange-600 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-green-600 uppercase">Profit</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {salesWithProfit.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {sale.date ? new Date(sale.date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{sale.customerName}</td>
                  {isPowerUser && <td className="px-4 py-3 text-xs text-gray-600">{(sale as any).soldBy || 'Admin'}</td>}
                  <td className="px-4 py-3 text-xs font-bold text-blue-600 text-right">RS.{(sale.revenue || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-bold text-orange-600 text-right">RS.{(sale.cost || 0).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${(sale.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    RS.{(sale.profit || 0).toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${(sale.profitMargin || 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    {(sale.profitMargin || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {salesWithProfit.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No sales found for selected date range</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Profit by Product</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Qty Sold</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-blue-600 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-orange-600 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-green-600 uppercase">Profit</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productProfits.map(product => (
                <tr key={product.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{product.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-right">{product.qtySold}</td>
                  <td className="px-4 py-3 text-xs font-bold text-blue-600 text-right">RS.{(product.revenue || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-orange-600 text-right">RS.{(product.cost || 0).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${(product.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    RS.{(product.profit || 0).toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-xs font-bold text-right ${(product.margin || 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    {(product.margin || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isPowerUser && salespersonProfits.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Profit by Salesperson</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Salesperson</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Sales Count</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-blue-600 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-orange-600 uppercase">Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-green-600 uppercase">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {salespersonProfits.map(person => (
                  <tr key={person.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{person.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-right">{person.salesCount}</td>
                    <td className="px-4 py-3 text-xs font-bold text-blue-600 text-right">RS.{(person.revenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-orange-600 text-right">RS.{(person.cost || 0).toFixed(2)}</td>
                    <td className={`px-4 py-3 text-xs font-bold text-right ${(person.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      RS.{(person.profit || 0).toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-xs font-bold text-right ${(person.margin || 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      {(person.margin || 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}