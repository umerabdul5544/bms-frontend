import { useState, useMemo } from "react";
import { useApp } from "./AppContext";
import { Plus, Edit2, Trash2, Landmark, ArrowUpRight, ArrowDownLeft, X, History, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp } from "lucide-react";

const toNum = (v: any) => { if (v == null) return 0; if (typeof v === "number") return v; return Number(String(v).replace(/[^0-9.-]+/g, "")) || 0; };

const PAYMENT_SOURCES = [
  { id: "cash_hand", name: "Cash in Hand", icon: "💵" },
  { id: "easypaisa", name: "EasyPaisa", icon: "📱" },
  { id: "jazzcash", name: "JazzCash", icon: "📲" },
  { id: "bank_transfer", name: "Bank Transfer", icon: "🏦" },
  { id: "cheque", name: "Cheque", icon: "📄" },
  { id: "other", name: "Other", icon: "💼" },
];

const ACCOUNT_TYPES = [
  { id: "bank", label: "Bank", icon: "🏦" },
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "digital", label: "Digital Wallet", icon: "📱" },
];

export default function BanksPage() {
  const { accounts = [], accountTransactions = [], addBank, updateBank, deleteBank, addAccountTransaction, loading, refreshData } = useApp();

  const banks = useMemo(() => {
    return accounts.filter((a: any) => a?.type === "bank" || a?.type === "cash").map(bank => {
      let balance = 0;
      accountTransactions.forEach(tx => {
        if (tx.debitAccountId === bank.id) balance += toNum(tx.amount);
        if (tx.creditAccountId === bank.id) balance -= toNum(tx.amount);
      });
      return { ...bank, calculatedBalance: balance };
    });
  }, [accounts, accountTransactions]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const totalBalance = banks.reduce((s, b) => s + b.calculatedBalance, 0);
  const monthlyIn = accountTransactions.filter(tx => tx.date >= monthStart && banks.some(b => b.id === tx.debitAccountId)).reduce((s, tx) => s + toNum(tx.amount), 0);
  const monthlyOut = accountTransactions.filter(tx => tx.date >= monthStart && banks.some(b => b.id === tx.creditAccountId)).reduce((s, tx) => s + toNum(tx.amount), 0);

  const getBankTransactions = (bankId: string) => accountTransactions.filter(tx => tx.debitAccountId === bankId || tx.creditAccountId === bankId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<"deposit" | "withdraw">("deposit");
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [sourceType, setSourceType] = useState<"account" | "external">("external");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [externalSource, setExternalSource] = useState("cash_hand");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [formData, setFormData] = useState({ name: "", description: "", accountNumber: "", accountType: "bank" });

  const resetForm = () => { setFormData({ name: "", description: "", accountNumber: "", accountType: "bank" }); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = formData.accountNumber ? `${formData.description} | AC: ${formData.accountNumber}` : formData.description;
    if (editingId) { await updateBank(editingId, { name: formData.name, description: desc }); }
    else { await addBank({ name: formData.name, description: desc, type: formData.accountType === "bank" ? "bank" : "cash", balance: 0 }); }
    resetForm();
  };

  const openModal = (bank: any, type: "deposit" | "withdraw") => {
    setSelectedBank(bank); setTransactionType(type); setSourceType("external"); setSourceAccountId(""); setExternalSource("cash_hand"); setAmount(""); setDescription(""); setTransactionDate(new Date().toISOString().split("T")[0]); setShowModal(true);
  };

  const submitTransaction = async () => {
    if (!selectedBank) return;
    const amt = toNum(amount);
    if (amt <= 0) { alert("Enter a valid amount"); return; }
    if (!description.trim()) { alert("Please enter a description"); return; }
    let sourceName = "";
    if (sourceType === "external") { const src = PAYMENT_SOURCES.find(s => s.id === externalSource); sourceName = src ? `${src.icon} ${src.name}` : externalSource; }
    else {
      const srcBank = banks.find(b => b.id === sourceAccountId);
      sourceName = srcBank?.name || "Unknown";
      if (!sourceAccountId) { alert("Select source account"); return; }
      if (transactionType === "deposit" && srcBank && srcBank.calculatedBalance < amt) { alert(`Insufficient balance in ${srcBank.name}`); return; }
      if (transactionType === "withdraw" && selectedBank.calculatedBalance < amt) { alert(`Insufficient balance in ${selectedBank.name}`); return; }
    }
    const fullDesc = `${description} | Via: ${sourceName}`;
    if (sourceType === "external") {
      await addAccountTransaction({ debitAccountId: transactionType === "deposit" ? selectedBank.id : `EXTERNAL_${externalSource.toUpperCase()}`, creditAccountId: transactionType === "deposit" ? `EXTERNAL_${externalSource.toUpperCase()}` : selectedBank.id, amount: amt, date: transactionDate, description: fullDesc });
    } else {
      await addAccountTransaction({ debitAccountId: transactionType === "deposit" ? selectedBank.id : sourceAccountId, creditAccountId: transactionType === "deposit" ? sourceAccountId : selectedBank.id, amount: amt, date: transactionDate, description: fullDesc });
    }
    await refreshData?.();
    setShowModal(false);
  };

  const handleDelete = async (id: string, name: string) => { if (!confirm(`Delete "${name}"?`)) return; await deleteBank(id); };
  const handleEdit = (bank: any) => { setFormData({ name: bank.name, description: bank.description || "", accountNumber: "", accountType: "bank" }); setEditingId(bank.id); setShowForm(true); };

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 bg-gray-100 rounded-xl w-1/3"></div>
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>)}</div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl"></div>)}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Accounts & Balances</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage cash, bank, and digital accounts</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: "", description: "", accountNumber: "", accountType: "bank" }); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          {showForm ? <><X size={15}/> Cancel</> : <><Plus size={15}/> Add Account</>}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0"><Wallet className="text-blue-600" size={18}/></div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Total Balance</p>
            <p className={`text-lg font-bold mt-0.5 ${totalBalance >= 0 ? "text-gray-800 dark:text-white" : "text-red-600"}`}>RS. {totalBalance.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">{banks.length} account{banks.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg shrink-0"><TrendingUp className="text-emerald-600" size={18}/></div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">This Month IN</p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">RS. {monthlyIn.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">Total deposits</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 rounded-lg shrink-0"><TrendingDown className="text-rose-600" size={18}/></div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">This Month OUT</p>
            <p className="text-lg font-bold text-rose-600 mt-0.5">RS. {monthlyOut.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">Total withdrawals</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-4">{editingId ? "Edit Account" : "New Account"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Account Type</label>
              <div className="flex gap-2">
                {ACCOUNT_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setFormData({...formData, accountType: t.id})} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${formData.accountType === t.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"}`}>
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Account Name *</label>
                <input required type="text" placeholder="e.g. HBL Bank, Cash Counter" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Account Number</label>
                <input type="text" placeholder="e.g. 03XX-XXXXXXX" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input type="text" placeholder="e.g. Main business account" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">{editingId ? "Save Changes" : "Create Account"}</button>
              <button type="button" onClick={resetForm} className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Account Cards */}
      {banks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Landmark size={40} className="mx-auto mb-3 opacity-20"/>
          <p className="text-sm font-medium">No accounts yet</p>
          <p className="text-xs mt-1">Click "Add Account" to get started</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map(bank => {
            const txs = getBankTransactions(bank.id);
            const isExpanded = showHistory === bank.id;
            const typeIcon = bank.type === "cash" ? "💵" : "🏦";
            return (
              <div key={bank.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-lg shrink-0">{typeIcon}</div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-800 dark:text-white text-sm truncate">{bank.name}</h3>
                        {bank.description && <p className="text-[11px] text-gray-400 truncate mt-0.5">{bank.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <button onClick={() => handleEdit(bank)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><Edit2 size={13} className="text-gray-400"/></button>
                      <button onClick={() => handleDelete(bank.id, bank.name)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={13} className="text-red-400"/></button>
                    </div>
                  </div>
                </div>

                {/* Balance */}
                <div className="px-4 py-3">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Current Balance</p>
                  <p className={`text-2xl font-bold ${bank.calculatedBalance >= 0 ? "text-gray-800 dark:text-white" : "text-red-600"}`}>
                    RS. {bank.calculatedBalance.toLocaleString()}
                  </p>
                  {bank.calculatedBalance < 0 && <p className="text-[10px] text-red-500 mt-0.5">Negative balance</p>}
                </div>

                {/* Actions */}
                <div className="px-4 pb-3 flex gap-2">
                  <button onClick={() => openModal(bank, "deposit")} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 py-2 rounded-lg text-xs font-semibold transition-colors border border-emerald-200 dark:border-emerald-800">
                    <ArrowDownLeft size={14}/> Deposit
                  </button>
                  <button onClick={() => openModal(bank, "withdraw")} className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 py-2 rounded-lg text-xs font-semibold transition-colors border border-rose-200 dark:border-rose-800">
                    <ArrowUpRight size={14}/> Withdraw
                  </button>
                </div>

                {/* History Toggle */}
                <button onClick={() => setShowHistory(isExpanded ? null : bank.id)} className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 border-t border-gray-100 dark:border-slate-800 transition-colors">
                  <span className="flex items-center gap-1.5"><History size={12}/> Transactions ({txs.length})</span>
                  {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>

                {/* Inline History */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                    {txs.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No transactions yet</p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        {txs.map((tx: any) => {
                          const isIn = tx.debitAccountId === bank.id;
                          return (
                            <div key={tx.id} className="px-4 py-2.5 flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg shrink-0 ${isIn ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}>
                                {isIn ? <ArrowDownLeft size={11} className="text-emerald-600"/> : <ArrowUpRight size={11} className="text-rose-600"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{tx.description || "Transaction"}</p>
                                <p className="text-[10px] text-gray-400">{tx.date}</p>
                              </div>
                              <span className={`text-xs font-bold shrink-0 ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
                                {isIn ? "+" : "-"}RS.{toNum(tx.amount).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Modal */}
      {showModal && selectedBank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className={`px-5 py-4 rounded-t-2xl flex items-center justify-between ${transactionType === "deposit" ? "bg-emerald-500" : "bg-rose-500"}`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  {transactionType === "deposit" ? <ArrowDownLeft className="text-white" size={18}/> : <ArrowUpRight className="text-white" size={18}/>}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{transactionType === "deposit" ? "Deposit Money" : "Withdraw Money"}</h3>
                  <p className="text-white/80 text-xs">{selectedBank.name}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={18} className="text-white"/></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Current Balance */}
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Current Balance</span>
                <span className={`text-base font-bold ${selectedBank.calculatedBalance >= 0 ? "text-gray-800 dark:text-white" : "text-red-600"}`}>RS. {selectedBank.calculatedBalance.toLocaleString()}</span>
              </div>

              {/* Source Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">{transactionType === "deposit" ? "Source" : "Destination"}</label>
                <div className="flex gap-2">
                  <button onClick={() => setSourceType("external")} className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all ${sourceType === "external" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>External</button>
                  <button onClick={() => setSourceType("account")} className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all ${sourceType === "account" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>Account Transfer</button>
                </div>
              </div>

              {sourceType === "external" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_SOURCES.map(src => (
                      <button key={src.id} onClick={() => setExternalSource(src.id)} className={`p-2.5 rounded-xl text-center border-2 transition-all ${externalSource === src.id ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}>
                        <div className="text-lg mb-0.5">{src.icon}</div>
                        <div className="text-[10px] font-medium text-gray-700 leading-tight">{src.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sourceType === "account" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{transactionType === "deposit" ? "Transfer From" : "Transfer To"}</label>
                  <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select account</option>
                    {banks.filter(b => b.id !== selectedBank.id).map(b => <option key={b.id} value={b.id}>{b.name} — RS. {b.calculatedBalance.toLocaleString()}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount (RS.)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2.5 rounded-lg text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" min="1"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Customer payment, shop expense..."/>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={submitTransaction} className={`flex-1 py-2.5 rounded-xl font-medium text-sm text-white transition-colors ${transactionType === "deposit" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>
                  {transactionType === "deposit" ? "Confirm Deposit" : "Confirm Withdrawal"}
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white rounded-xl font-medium text-sm transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
