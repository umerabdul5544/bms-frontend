import { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { purchasesApi, salesApi } from '../utils/api';
import { Search, Plus, Minus, Trash2, ShoppingBag, Truck, AlertTriangle, X, RotateCcw, CheckCircle } from 'lucide-react';

export function PurchaseManagement() {
  const { products, suppliers, accounts, addAccountTransaction, getLiveBalance, refreshData, purchases, returnPurchase, sales, returnSale } = useApp();
  const [cart, setCart] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundType, setRefundType] = useState<'sale' | 'purchase'>('sale');
  const [refundSearch, setRefundSearch] = useState('');
  const [refundResults, setRefundResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const liquidAccounts = (accounts || []).filter(acc => 
    acc && (acc.type === 'bank' || acc.type === 'cash')
  );

  const cashAccount = liquidAccounts.find(acc => acc.type === 'cash' && acc.name?.toLowerCase() === 'cash');
  const defaultCashAccountId = cashAccount?.id || '';

  useEffect(() => {
    if (paymentMethod === 'cash' && !selectedAccount && defaultCashAccountId) {
      setSelectedAccount(defaultCashAccountId);
    }
  }, [paymentMethod, selectedAccount, defaultCashAccountId]);

  const filteredProducts = products.filter(p =>
    (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.costPrice }
          : item
      ));
    } else {
      // Use current cost price or default to selling price if no cost price set
      const costPrice = (product as any).costPrice || product.price;
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        costPrice: costPrice, // Buying price (editable)
        sellingPrice: product.price, // Selling price (for reference)
        total: costPrice,
        unit: product.unit
      }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return item;
        return { ...item, quantity: newQuantity, total: newQuantity * item.costPrice };
      }
      return item;
    }));
  };

  const updateCostPrice = (productId: string, newCostPrice: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        return { ...item, costPrice: newCostPrice, total: item.quantity * newCostPrice };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal; 

  const handleCompletePurchase = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    if (paymentMethod === 'credit' && !selectedSupplier) return alert('Please select a supplier for Credit purchases');

    const supplier = suppliers.find(s => s.id === selectedSupplier) || { id: '', name: 'Walk-in Supplier' };
    const paidAmount = paymentMethod === 'cash' ? total : amountPaid;
    const balance = total - paidAmount;
    const selectedAccountId = selectedAccount || (paymentMethod === 'cash' ? defaultCashAccountId : '');

    // Only check balance if an account is selected or default cash is being used
    if (selectedAccountId && paidAmount > 0) {
      const accountBalance = getLiveBalance(selectedAccountId, 'account');
      if (accountBalance < paidAmount) {
        alert(`Insufficient balance!\n\nAvailable: RS. ${accountBalance.toLocaleString()}\nRequired: RS. ${paidAmount.toLocaleString()}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await purchasesApi.create({
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.costPrice,
          total: item.total
        })),
        subtotal,
        discount: 0,
        total,
        paymentMethod,
        amountPaid: paidAmount,
        balance: Math.max(0, balance),
      });

      const selectedAccountId = selectedAccount || (paymentMethod === 'cash' ? defaultCashAccountId : '');
      if (selectedAccountId && paidAmount > 0) {
        await addAccountTransaction({
          debitAccountId: 'PURCHASE_EXPENSE',
          creditAccountId: selectedAccountId,
          amount: paidAmount,
          description: `Purchase from ${supplier.name}`,
          date: new Date().toISOString().split('T')[0],
          reference: supplier.id || 'walk-in',
        });
      }

      setCart([]);
      setSelectedSupplier('');
      setSelectedAccount('');
      setAmountPaid(0);
      setPaymentMethod('cash');
      await refreshData();
      alert('Purchase recorded and stock updated!');
    } catch (error: any) {
      alert(error.message || 'Failed to complete purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refund search handler
  const handleRefundSearch = async () => {
    if (!refundSearch.trim()) return;
    setIsSearching(true);
    setRefundResults([]);
    try {
      if (refundType === 'sale') {
        const data = await salesApi.search(refundSearch.trim());
        setRefundResults(data.sales || []);
      } else {
        const data = await purchasesApi.search(refundSearch.trim());
        setRefundResults(data.purchases || []);
      }
    } catch {
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleProcessRefund = async (id: string) => {
    if (!confirm(`Are you sure you want to process this refund? Stock will be ${refundType === 'sale' ? 'restored' : 'reduced'}.`)) return;
    setIsRefunding(true);
    try {
      if (refundType === 'sale') {
        await returnSale(id);
        setRefundSuccess('Sale refunded successfully! Stock has been restored.');
      } else {
        await returnPurchase(id);
        setRefundSuccess('Purchase returned successfully! Stock has been reduced.');
      }
      // Refresh results
      const data = refundType === 'sale'
        ? await salesApi.search(refundSearch.trim())
        : await purchasesApi.search(refundSearch.trim());
      setRefundResults((refundType === 'sale' ? data.sales : data.purchases) || []);
    } catch (error: any) {
      alert(error.message || 'Refund failed.');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded">
              <Truck className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Add Stock / Purchase Order</h2>
              <p className="text-xs text-gray-500">Select products to restock from supplier</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search products to restock..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 overflow-y-auto pb-6 custom-scrollbar max-h-[calc(100vh-14rem)]">
          {filteredProducts.map(product => {
            const costPrice = product.costPrice || 0;
            const sellingPrice = product.price;
            const profitMargin = costPrice > 0 ? ((sellingPrice - costPrice) / costPrice * 100) : 0;
            const productImage = product.imageUrl;

            return (
              <div
                key={product.id}
                onClick={() => addToCart(product.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:border-blue-800 transition-colors flex flex-col overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-1.5 border-b border-gray-100">
                  <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white p-0.5 rounded shadow-sm">
                     <Package size={12} />
                  </div>
                  {productImage ? (
                    <img src={productImage} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="text-gray-300" size={32} />
                  )}
                </div>
                
                <div className="bg-white p-1.5 flex flex-col h-full text-center mt-auto">
                   <h3 className="font-semibold text-[11px] text-gray-800 truncate leading-tight mb-0.5" title={product.name}>{product.name}</h3>
                   <div className="flex flex-col gap-0.5 mt-auto">
                     <div className="flex justify-between items-center bg-blue-50 px-1 py-0.5 rounded">
                       <span className="text-[8px] text-blue-600 font-bold uppercase">Cost</span>
                       <span className="font-bold text-[10px] text-blue-700">RS.{costPrice}</span>
                     </div>
                     <div className="flex justify-between items-center bg-green-50 px-1 py-0.5 rounded">
                       <span className="text-[8px] text-green-600 font-bold uppercase">Sell</span>
                       <span className="font-bold text-[10px] text-green-700">RS.{sellingPrice}</span>
                     </div>
                   </div>
                   <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100">
                     <span className="text-[8px] text-purple-600 font-bold">{profitMargin > 0 ? `${profitMargin.toFixed(0)}% margin` : ''}</span>
                     <span className="text-[8px] text-gray-500 font-bold">Stock:{product.stock}</span>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Section */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="text-blue-600" size={18} />
            <h3 className="font-semibold text-gray-800 text-sm">Purchase Order ({cart.length})</h3>
          </div>

          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {cart.map(item => (
              <div key={item.productId} className="border border-gray-100 rounded p-2 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-xs text-gray-800">{item.productName}</p>
                    <p className="text-[10px] text-gray-400">Sell: RS.{item.sellingPrice}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)} 
                    className="p-1 hover:bg-red-50 rounded text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Editable Cost Price */}
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">
                    Cost Price (RS.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.costPrice}
                    onChange={(e) => updateCostPrice(item.productId, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-blue-200 rounded text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                    <button 
                      onClick={() => updateQuantity(item.productId, -1)} 
                      className="p-1.5 hover:bg-gray-100 rounded-l-lg text-gray-600 transition-colors border-r border-gray-200"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseInt(e.target.value);
                        if (val !== '' && !isNaN(val)) {
                          setCart(cart.map(cartItem => 
                            cartItem.productId === item.productId
                              ? { ...cartItem, quantity: val, total: val * cartItem.costPrice }
                              : cartItem
                          ));
                        }
                      }}
                      className="w-12 h-full text-center font-black text-[13px] text-blue-800 bg-transparent outline-none appearance-none"
                    />
                    <button 
                      onClick={() => updateQuantity(item.productId, 1)} 
                      className="p-1.5 hover:bg-gray-100 rounded-r-lg text-gray-600 transition-colors border-l border-gray-200"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-black text-sm text-blue-700">RS.{item.total.toLocaleString()}</span>
                </div>

              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-gray-400 text-center py-12 text-xs">No items in purchase order</p>
            )}
          </div>

          <div className="space-y-3 border-t pt-3">
            {/* Supplier — optional */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Supplier <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Walk-in / No Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Account — optional */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                💳 Pay From Account <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No Account / Record Only --</option>
                {liquidAccounts.map(acc => {
                  const balance = getLiveBalance(acc.id, 'account');
                  return (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Bal: RS. {balance.toLocaleString()})
                    </option>
                  );
                })}
              </select>
              {selectedAccount && (
                <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded text-xs flex justify-between">
                  <span className="font-bold text-blue-700">Available:</span>
                  <span className="font-bold text-blue-900">RS. {getLiveBalance(selectedAccount, 'account').toLocaleString()}</span>
                </div>
              )}
              {selectedAccount && getLiveBalance(selectedAccount, 'account') < (paymentMethod === 'cash' ? total : amountPaid) && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Insufficient funds in selected account
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
              <div className="flex gap-2">
                {(['cash', 'credit'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 px-3 py-2 rounded capitalize text-xs font-semibold ${
                      paymentMethod === method ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'credit' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount Paid Now (RS.)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="space-y-1 text-sm bg-gray-50 p-3 rounded border border-gray-200">
              <div className="flex justify-between text-base font-bold">
                <span>Total Bill:</span>
                <span className="text-blue-700">RS.{total.toFixed(2)}</span>
              </div>
              {paymentMethod === 'credit' && (
                <div className="flex justify-between text-orange-600 text-xs">
                  <span>Balance Payable:</span>
                  <span className="font-bold">RS.{(total - amountPaid).toFixed(2)}</span>
                </div>
              )}
            </div>

            <button
              disabled={isSubmitting || cart.length === 0 || (paymentMethod === 'credit' && !selectedSupplier)}
              onClick={handleCompletePurchase}
              className={`w-full py-3 rounded-lg font-bold transition-colors text-sm ${
                isSubmitting || cart.length === 0 || (paymentMethod === 'credit' && !selectedSupplier)
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : 'Complete Purchase & Update Stock'}
            </button>

            {/* Refund / Return Button */}
            <button
              onClick={() => { setShowRefundModal(true); setRefundSuccess(null); setRefundResults([]); setRefundSearch(''); }}
              className="w-full py-2.5 rounded-lg font-bold text-sm border-2 border-orange-400 text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Process Refund / Return
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ↩️ Refund Modal */}
    {showRefundModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50">
            <div>
              <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <RotateCcw className="text-orange-500" size={20} /> Process Refund / Return
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Search by Bill Number or last 6 digits of ID</p>
            </div>
            <button onClick={() => setShowRefundModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Type Toggle */}
            <div className="flex gap-2">
              {(['sale', 'purchase'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setRefundType(t); setRefundResults([]); setRefundSearch(''); setRefundSuccess(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${
                    refundType === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'sale' ? '🛒 Sale Refund' : '📦 Purchase Return'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Enter Bill No. (e.g. BILL-12345678 or last 6 digits)..."
                  value={refundSearch}
                  onChange={(e) => setRefundSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefundSearch()}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button
                onClick={handleRefundSearch}
                disabled={isSearching || !refundSearch.trim()}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </div>

            {/* Success message */}
            {refundSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-bold">
                <CheckCircle size={18} /> {refundSuccess}
              </div>
            )}

            {/* Results */}
            <div className="space-y-3">
              {refundResults.length === 0 && !isSearching && refundSearch && (
                <p className="text-center text-gray-400 text-sm py-6">No {refundType}s found for "{refundSearch}"</p>
              )}
              {refundResults.map((record: any) => (
                <div key={record.id} className="p-4 border border-gray-200 rounded-xl hover:border-orange-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {record.billNumber || record.id?.toString().slice(-6).toUpperCase()}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          record.status === 'returned'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {record.status === 'returned' ? '↩ Returned' : '✓ Completed'}
                        </span>
                        <span className="text-xs text-gray-400">{record.date}</span>
                      </div>
                      <p className="font-bold text-gray-800">
                        {refundType === 'sale' ? record.customerName : record.supplierName}
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        {record.items?.length} item(s) · RS.{record.total?.toLocaleString()} · {record.paymentMethod}
                      </p>
                      <div className="space-y-0.5">
                        {record.items?.map((item: any, i: number) => (
                          <p key={i} className="text-[11px] text-gray-500">
                            • {item.productName} × {item.quantity} = RS.{item.total?.toLocaleString()}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {record.status === 'returned' ? (
                        <span className="text-xs text-gray-400 font-bold">Already Returned</span>
                      ) : (
                        <button
                          disabled={isRefunding}
                          onClick={() => handleProcessRefund(record.id)}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-black transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <RotateCcw size={13} />
                          {isRefunding ? 'Processing...' : 'Refund'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

// Local Package SVG helper
function Package({ className, size }: { className?: string; size: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}
