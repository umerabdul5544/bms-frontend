import { useState } from 'react';
import { useApp } from './AppContext';
import { Plus, Search, Truck, X, Calendar, TrendingUp } from 'lucide-react';

export function LedgerManagement() {
  const { 
    ledgerEntries, 
    customers, 
    suppliers, 
    accounts,
    accountTransactions,
    refreshData, 
    addAccountTransaction, 
    getLiveBalance
  } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeForm, setActiveForm] = useState<'customer_payment' | 'supplier_payment' | 'expense' | null>(null);
  
  const [formData, setFormData] = useState({
    personId: '',
    bankAccountId: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const closeForm = () => {
    setActiveForm(null);
    setFormData({ 
      personId: '', 
      bankAccountId: '', 
      amount: 0, 
      description: '', 
      date: new Date().toISOString().split('T')[0] 
    });
  };

  const liquidAccounts = (accounts || []).filter(acc => 
    acc && (acc.type === 'bank' || acc.type === 'cash')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0 || !formData.bankAccountId) {
      alert("Please fill all required fields");
      return;
    }

    const accountBalance = getLiveBalance(formData.bankAccountId, 'account');

    if ((activeForm === 'supplier_payment' || activeForm === 'expense') && accountBalance < formData.amount) {
      alert(`Insufficient balance. Available: RS. ${accountBalance.toLocaleString()}, Trying to withdraw: RS. ${formData.amount.toLocaleString()}`);
      return;
    }

    try {
      if (activeForm === 'customer_payment') {
        // ✅ ONE transaction only — no duplicate
        const customerName = (customers || []).find(c => c.id === formData.personId)?.name || '';
        await addAccountTransaction({
          debitAccountId: formData.bankAccountId, 
          creditAccountId: 'CUSTOMER_LEDGER',
          amount: formData.amount,
          description: formData.description || `Payment from Customer - ${customerName}`,
          date: formData.date,
          reference: formData.personId,
          customerName,
        });

      } else if (activeForm === 'supplier_payment') {
        // ✅ ONE transaction only — no duplicate
        const supplierName = (suppliers || []).find(s => s.id === formData.personId)?.name || '';
        await addAccountTransaction({
          debitAccountId: 'SUPPLIER_LEDGER', 
          creditAccountId: formData.bankAccountId,
          amount: formData.amount,
          description: formData.description || `Payment to Supplier - ${supplierName}`,
          date: formData.date,
          reference: formData.personId,
          supplierName,
        });

      } else if (activeForm === 'expense') {
        const expenseAccount = (accounts || []).find(acc => 
          acc.type === 'expense' && (
            acc.name.toLowerCase() === 'shop expense' || 
            acc.name.toLowerCase().includes('expense')
          )
        );

        if (!expenseAccount) {
          alert('Shop Expense account not found. Please create one in Accounts.');
          return;
        }

        await addAccountTransaction({
          debitAccountId: expenseAccount.id,
          creditAccountId: formData.bankAccountId,
          amount: formData.amount,
          description: formData.description || 'Shop Expense',
          date: formData.date
        });
      }
      
      if (refreshData) await refreshData();
      closeForm();
    } catch (error) {
      console.error(error);
      alert('Transaction failed.');
    }
  };

  const getEntityName = (id: string) => {
    const account = (accounts || []).find(a => a.id === id);
    if (account) return { name: account.name, type: 'account' };
    const customer = (customers || []).find(c => c.id === id);
    if (customer) return { name: customer.name, type: 'customer' };
    const supplier = (suppliers || []).find(s => s.id === id);
    if (supplier) return { name: supplier.name, type: 'supplier' };
    return { name: 'Unknown', type: 'unknown' };
  };

  // ✅ Merge ledger entries + account transactions
  const allTransactions = [
    // ✅ Ledger entries from sales/purchases
    ...(ledgerEntries || []).map(entry => ({
      id: entry.id,
      date: entry.date,
      createdAt: (entry as any).createdAt || entry.date,
      description: entry.description,
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      balance: entry.balance || 0,
      customerName: entry.customerName || null,
      supplierName: entry.supplierName || null,
      accountName: entry.accountName || null,
      type: entry.type,
    })),

    // ✅ Account transactions (payments, expenses)
    ...(accountTransactions || []).map((tx: any) => {
      const debitEntity = getEntityName(tx.debitAccountId);
      const creditEntity = getEntityName(tx.creditAccountId);

      const isMoneyIn =
        tx.creditAccountId === 'SALES_REVENUE' ||
        tx.creditAccountId === 'CUSTOMER_LEDGER' ||
        creditEntity.type === 'customer';

      const isMoneyOut =
        tx.debitAccountId === 'SUPPLIER_LEDGER' ||
        tx.debitAccountId === 'PURCHASE_EXPENSE' ||
        debitEntity.name?.toLowerCase().includes('expense');

      // ✅ Resolve customer name from reference field
      const resolvedCustomerName =
        tx.customerName ||
        (tx.creditAccountId === 'CUSTOMER_LEDGER' && tx.reference
          ? (customers || []).find((c: any) => c.id === tx.reference)?.name || null
          : null) ||
        (creditEntity.type === 'customer' ? creditEntity.name : null) ||
        (debitEntity.type === 'customer' ? debitEntity.name : null);

      // ✅ Resolve supplier name from reference field
      const resolvedSupplierName =
        tx.supplierName ||
        (tx.debitAccountId === 'SUPPLIER_LEDGER' && tx.reference
          ? (suppliers || []).find((s: any) => s.id === tx.reference)?.name || null
          : null) ||
        (creditEntity.type === 'supplier' ? creditEntity.name : null) ||
        (debitEntity.type === 'supplier' ? debitEntity.name : null);

      // ✅ Resolve account name
      const resolvedAccountName =
        creditEntity.type === 'account' && tx.creditAccountId !== 'CUSTOMER_LEDGER' && tx.creditAccountId !== 'SALES_REVENUE'
          ? creditEntity.name
          : debitEntity.type === 'account' && tx.debitAccountId !== 'SUPPLIER_LEDGER'
          ? debitEntity.name
          : null;

      return {
        id: `tx-${tx.id}`,
        date: tx.date,
        createdAt: tx.createdAt || tx.date,
        description: tx.description || 'Account Transaction',
        debit: isMoneyOut ? tx.amount : 0,
        credit: isMoneyIn ? tx.amount : 0,
        balance: 0,
        accountName: resolvedAccountName,
        customerName: resolvedCustomerName,
        supplierName: resolvedSupplierName,
        type: 'account_transaction',
      };
    }),
  ].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date).getTime();
    const dateB = new Date(b.createdAt || b.date).getTime();
    return dateB - dateA;
  });

  const filteredEntries = allTransactions.filter((entry: any) => {
    const matchesSearch = searchTerm.trim() === '' || 
      (entry.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.accountName?.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDate = true;
    if (startDate || endDate) {
      const entryDate = new Date(entry.date);
      if (startDate && entryDate < new Date(startDate)) matchesDate = false;
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (entryDate > endDateTime) matchesDate = false;
      }
    }
    return matchesSearch && matchesDate;
  });

  // ✅ Totals
  const totalIn = allTransactions.reduce((sum, e) => sum + (e.credit || 0), 0);
  const totalOut = allTransactions.reduce((sum, e) => sum + (e.debit || 0), 0);
  const globalBalance = totalIn - totalOut;

  // ✅ Running balance for filtered entries
  const entriesWithBalance = [...filteredEntries]
    .reverse()
    .reduce((acc, entry, index) => {
      const previousBalance = index === 0 ? 0 : acc[index - 1].runningBalance;
      const runningBalance = previousBalance + (entry.credit || 0) - (entry.debit || 0);
      acc.push({ ...entry, runningBalance });
      return acc;
    }, [] as any[])
    .reverse();

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 tracking-tight">Ledger Management</h2>
          <p className="text-xs text-gray-500 font-normal">Manage cash flow and business payments</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100 text-center">
            <p className="text-[10px] text-green-400 uppercase font-semibold tracking-widest">Total In</p>
            <p className="text-lg font-semibold text-green-600">RS. {totalIn.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-center">
            <p className="text-[10px] text-red-400 uppercase font-semibold tracking-widest">Total Out</p>
            <p className="text-lg font-semibold text-red-600">RS. {totalOut.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 text-center">
            <p className="text-[10px] text-blue-400 uppercase font-semibold tracking-widest">Balance</p>
            <p className={`text-lg font-semibold ${globalBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              RS. {globalBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
        <button onClick={() => setActiveForm('customer_payment')} className="bg-green-600 text-white py-2.5 px-4 rounded-lg text-xs font-semibold hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
          <TrendingUp size={16}/> Customer Payment
        </button>
        <button onClick={() => setActiveForm('supplier_payment')} className="bg-blue-600 text-white py-2.5 px-4 rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
          <Truck size={16}/> Supplier Payment
        </button>
        <button onClick={() => setActiveForm('expense')} className="bg-red-600 text-white py-2.5 px-4 rounded-lg text-xs font-semibold hover:bg-red-700 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
          <Plus size={16}/> Shop Expense
        </button>
      </div>

      {/* Form */}
      {activeForm && (
        <div className="bg-white p-5 rounded-xl border-2 border-blue-100 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase">
              {activeForm === 'customer_payment' ? 'Customer Payment' : 
               activeForm === 'supplier_payment' ? 'Supplier Payment' : 'Shop Expense'}
            </h3>
            <button onClick={closeForm} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
              <X size={20}/>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeForm !== 'expense' && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Select {activeForm === 'customer_payment' ? 'Customer' : 'Supplier'}
                </label>
                <select 
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.personId}
                  onChange={(e) => setFormData({...formData, personId: e.target.value})}
                  required
                >
                  <option value="">Choose...</option>
                  {activeForm === 'customer_payment' 
                    ? (customers || []).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Balance: RS. {getLiveBalance(c.id, 'customer').toLocaleString()})
                        </option>
                      ))
                    : (suppliers || []).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Balance: RS. {getLiveBalance(s.id, 'supplier').toLocaleString()})
                        </option>
                      ))
                  }
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-blue-600 uppercase block mb-1">
                {activeForm === 'customer_payment' ? 'Deposit To' : 'Pay From'}
              </label>
              <div className="flex flex-col gap-2">
                <select 
                  className="w-full p-2.5 border border-blue-200 bg-blue-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.bankAccountId}
                  onChange={(e) => setFormData({...formData, bankAccountId: e.target.value})}
                  required
                >
                  <option value="">Select Bank/Cash Account</option>
                  {liquidAccounts.length > 0 ? (
                    liquidAccounts.map(acc => {
                      const liveBalance = getLiveBalance(acc.id, 'account');
                      return (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (RS. {liveBalance.toLocaleString()})
                        </option>
                      );
                    })
                  ) : (
                    <option value="" disabled>No bank/cash accounts found</option>
                  )}
                </select>
                {formData.bankAccountId && (
                  <div className="text-xs font-semibold text-blue-600 bg-blue-100 p-2 rounded">
                    Balance: RS. {getLiveBalance(formData.bankAccountId, 'account').toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Amount</label>
              <input 
                type="number" 
                placeholder="RS. 0"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold"
                value={formData.amount || ''}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})} 
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" 
              />
            </div>

            <div className="lg:col-span-3">
              <input 
                type="text" 
                placeholder="Note (e.g. Invoice #123 or Month Rent)" 
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <button 
              type="submit"
              className="bg-blue-600 text-white p-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
            >
              Update Balances
            </button>
          </form>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-175">
            <thead className="bg-gray-50 text-gray-400 border-b border-gray-200">
              <tr className="text-[10px] font-semibold uppercase tracking-widest">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right text-red-500">Out (-)</th>
                <th className="px-6 py-4 text-right text-green-500">In (+)</th>
                <th className="px-6 py-4 text-right bg-blue-50/50">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entriesWithBalance.length > 0 ? (
                entriesWithBalance.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-gray-500">{entry.date}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">{entry.description}</div>
                      <div className="text-[10px] font-bold uppercase mt-1 flex flex-wrap gap-1">
                        {entry.customerName && (
                          <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            CUST: {entry.customerName}
                          </span>
                        )}
                        {entry.supplierName && (
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            SUPP: {entry.supplierName}
                          </span>
                        )}
                        {entry.accountName && (
                          <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            ACCT: {entry.accountName}
                          </span>
                        )}
                        {!entry.customerName && !entry.supplierName && !entry.accountName && (
                          <span className="text-gray-400">GENERAL</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entry.debit > 0 ? (
                        <span className="text-red-600 font-bold text-sm bg-red-50 px-2 py-1 rounded">
                          -{entry.debit.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entry.credit > 0 ? (
                        <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded">
                          +{entry.credit.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right bg-blue-50/10">
                      <span className={`font-black text-sm ${entry.runningBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        RS. {entry.runningBalance.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
            {entriesWithBalance.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={2} className="px-6 py-3 text-xs font-bold text-gray-600 uppercase">
                    Total ({filteredEntries.length} transactions)
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-red-600 font-bold text-sm">
                      -{filteredEntries.reduce((sum, e) => sum + (e.debit || 0), 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-green-600 font-bold text-sm">
                      +{filteredEntries.reduce((sum, e) => sum + (e.credit || 0), 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`font-black text-sm ${globalBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      RS. {globalBalance.toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default LedgerManagement;