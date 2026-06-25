
import { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { salesApi } from '../utils/api';
import { Search, Plus, Minus, Trash2, ShoppingCart, User as UserIcon, AlertTriangle, X, RotateCcw, CheckCircle, Printer, Tag } from 'lucide-react';

export function POSInterface() {
  const { products, customers, accounts, addAccountTransaction, getLiveBalance, refreshData, sales, returnSale, settings } = useApp();
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'online'>('cash');
  const [onlineMethod, setOnlineMethod] = useState<string>('easypaisa');
  const [amountPaid, setAmountPaid] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt modal state
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
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
    (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.barcode && String(p.barcode).includes(searchTerm)) ||
    (p.serialNumber && String(p.serialNumber).includes(searchTerm))
  );

  // Barcode scanner listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Ignore if typing in input/textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      // Reset buffer if too much time passed (not a scanner)
      if (currentTime - lastKeyTime > 100) buffer = '';

      if (e.key === 'Enter') {
        if (buffer.trim()) {
          const code = buffer.trim();
          // Find product by serial number or barcode
          const product = products.find(p =>
            (p.serialNumber && String(p.serialNumber) === code) ||
            (p.barcode && String(p.barcode) === code)
          );
          if (product) {
            addToCart(product.id);
          } else {
            alert(`No product found with code: ${code}`);
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  useEffect(() => {
    const handleShortcutPrint = () => {
      if (!lastSale) return;
      if (!showReceipt) {
        setShowReceipt(true);
        setTimeout(() => window.print(), 250);
        return;
      }
      window.print();
    };
    window.addEventListener('shortcut-print', handleShortcutPrint);
    return () => window.removeEventListener('shortcut-print', handleShortcutPrint);
  }, [lastSale, showReceipt]);

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) { alert(`${product.name} is out of stock!`); return; }

    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      if (existingItem.quantity + 1 > product.stock) {
        alert(`Only ${product.stock} available. Cart already has ${existingItem.quantity}.`);
        return;
      }
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        costPrice: (product as any).costPrice || 0,
        total: product.price,
        unit: product.unit
      }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return item;
        if (newQuantity > product.stock) { alert(`Only ${product.stock} available.`); return item; }
        return { ...item, quantity: newQuantity, total: newQuantity * item.price };
      }
      return item;
    }));
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        return { ...item, price: newPrice, total: item.quantity * newPrice };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    if (paymentMethod === 'credit' && !selectedCustomer) return alert('Please select a customer for Credit sales');
    const customerName = selectedCustomerData?.name || 'Walk-in Customer';
    const customerId = selectedCustomerData?.id || null;
    const paidAmount = paymentMethod === 'cash' ? total : amountPaid;
    const balance = total - paidAmount;

    const selectedAccountId = selectedAccount || (paymentMethod === 'cash' ? defaultCashAccountId : '');

    // For sales, funds are incoming. No pre-existing account balance is required for cash or online receipts.
    if (paymentMethod !== 'cash' && paymentMethod !== 'online' && selectedAccountId && paidAmount > 0) {
      const accountBalance = getLiveBalance(selectedAccountId, 'account');
      if (accountBalance < paidAmount) {
        alert(`Insufficient balance!\n\nAvailable: RS. ${accountBalance.toLocaleString()}\nRequired: RS. ${paidAmount.toLocaleString()}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await salesApi.create({
        customerId,
        customerName,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        subtotal,
        discount,
        total,
        paymentMethod,
        onlineMethod: paymentMethod === 'online' ? onlineMethod : '',
        amountPaid: paidAmount,
        balance: Math.max(0, balance),
      });

      // Record cash receipt as asset increase and revenue recognition
      const selectedAccountId = selectedAccount || (paymentMethod === 'cash' ? defaultCashAccountId : '');
      if (selectedAccountId && paidAmount > 0) {
        await addAccountTransaction({
          debitAccountId: selectedAccountId, // Cash/bank increases on receipt
          creditAccountId: 'SALES_REVENUE', // Revenue is recognized on the credit side
          amount: paidAmount,
          description: `Sale to ${customerName}`,
          date: new Date().toISOString().split('T')[0],
          reference: customerId || 'walk-in',
        });
      }

      const billNumber = result?.sale?.billNumber || `BILL-${Date.now().toString().slice(-8)}`;
      setLastSale({
        customerName,
        items: [...cart],
        subtotal,
        discount,
        total,
        paymentMethod,
        onlineMethod: paymentMethod === 'online' ? onlineMethod : '',
        amountPaid: paidAmount,
        balance: Math.max(0, balance),
        date: new Date().toLocaleString(),
        billNumber,
      });

      setCart([]);
      setSelectedCustomer('');
      setSelectedAccount('');
      setDiscount(0);
      setAmountPaid(0);
      setPaymentMethod('cash');
      setOnlineMethod('easypaisa');
      await refreshData();
      setShowReceipt(true);
    } catch (error: any) {
      alert(error.message || 'Failed to complete sale');
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
      const data = await salesApi.search(refundSearch.trim());
      setRefundResults(data.sales || []);
    } catch {
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleProcessRefund = async (id: string) => {
    if (!confirm('Are you sure you want to refund this sale? Stock will be restored.')) return;
    setIsRefunding(true);
    try {
      await returnSale(id);
      setRefundSuccess('Sale refunded successfully! Stock has been restored.');
      const data = await salesApi.search(refundSearch.trim());
      setRefundResults(data.sales || []);
    } catch (error: any) {
      alert(error.message || 'Refund failed.');
    } finally {
      setIsRefunding(false);
    }
  };


  return (
    <>
    {/* Receipt Modal */}
    {showReceipt && lastSale && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
              <Printer size={20} className="text-green-600" /> Sale Receipt
            </h3>
            <button onClick={() => setShowReceipt(false)} className="p-2 hover:bg-gray-100 rounded-xl">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <div id="receipt-print" className="p-4 font-mono text-sm">
            <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-3">
              <h2 className="text-lg font-black uppercase tracking-wide">🏪 {settings?.bakeryName || 'BMS POS'}</h2>
              <p className="text-xs text-gray-500">{lastSale.date}</p>
              <p className="text-xs font-bold text-gray-600">Bill #: {lastSale.billNumber}</p>
            </div>
            <div className="mb-3 text-xs">
              <p><b>Customer:</b> {lastSale.customerName}</p>
              <p><b>Payment:</b> {lastSale.paymentMethod === 'cash' ? '💵 Cash' : lastSale.paymentMethod === 'online' ? `📱 Online (${lastSale.onlineMethod || 'Digital'})` : '📋 Credit'}</p>
              {lastSale.paymentMethod === 'online' && lastSale.onlineMethod && (() => {
                const accountNum = (settings.onlinePayments as any)?.[lastSale.onlineMethod] || '';
                const qrImg = (settings.onlinePayments as any)?.[`${lastSale.onlineMethod}_qr`] || '';
                if (!accountNum && !qrImg) return null;
                return (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    {accountNum && <p className="text-[10px] font-bold text-gray-700">Account: <span className="font-mono">{accountNum}</span></p>}
                    {qrImg && <img src={qrImg} alt="QR" className="w-16 h-16 object-contain mt-1 mx-auto border rounded" />}
                  </div>
                );
              })()}
            </div>
            <div className="border-t border-dashed border-gray-300 pt-2 mb-3">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-1">
                <span>Item</span><span>Qty</span><span>Total</span>
              </div>
              {lastSale.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-100">
                  <span className="flex-1 truncate max-w-25">{item.productName}</span>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <span className="w-16 text-right font-bold">RS.{item.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-dashed border-gray-300 pt-2 space-y-1">
              <div className="flex justify-between text-xs"><span>Subtotal:</span><span>RS.{lastSale.subtotal.toFixed(0)}</span></div>
              {lastSale.discount > 0 && (
                <div className="flex justify-between text-xs text-red-600"><span>Discount:</span><span>-RS.{lastSale.discount.toFixed(0)}</span></div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-1">
                <span>TOTAL:</span><span className="text-green-700">RS.{lastSale.total.toFixed(0)}</span>
              </div>
              {lastSale.paymentMethod === 'credit' && lastSale.balance > 0 && (
                <div className="flex justify-between text-xs text-orange-600">
                  <span>Balance Due:</span><span className="font-bold">RS.{lastSale.balance.toFixed(0)}</span>
                </div>
              )}
            </div>
            <div className="text-center mt-4 border-t-2 border-dashed border-gray-300 pt-3">
              <p className="text-xs font-bold text-gray-600">Thank you for your purchase!</p>
            </div>
          </div>
          <div className="flex gap-3 p-4 border-t border-gray-100">
            <button onClick={() => window.print()} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex gap-2 justify-center items-center">
              <Printer size={18} /> Print
            </button>
            <button onClick={() => setShowReceipt(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">Close</button>
          </div>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-2 rounded">
              <ShoppingCart className="text-red-600" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Point of Sale</h2>
              <p className="text-xs text-gray-500">Select products to add to cart</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, category, barcode, or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>
        </div>

        {/* Low stock warning in POS */}
        {products.filter(p => p.minStock > 0 && p.stock <= p.minStock).length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
            <AlertTriangle size={13} className="shrink-0" />
            <span>
              <strong>{products.filter(p => p.minStock > 0 && p.stock <= p.minStock).length} product(s)</strong> at or below minimum stock —{' '}
              {products.filter(p => p.minStock > 0 && p.stock <= p.minStock).slice(0, 2).map(p => p.name).join(', ')}
              {products.filter(p => p.minStock > 0 && p.stock <= p.minStock).length > 2 ? '...' : ''}
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 overflow-y-auto pb-6 custom-scrollbar max-h-[calc(100vh-14rem)]">
          {filteredProducts.map(product => {
            const inCart = cart.find(i => i.productId === product.id);
            return (
              <div
                key={product.id}
                onClick={() => addToCart(product.id)}
                className={`bg-white rounded-xl shadow-sm border-2 cursor-pointer transition-all flex flex-col overflow-hidden ${
                  product.stock <= 0
                    ? 'opacity-40 grayscale pointer-events-none border-gray-200'
                    : inCart
                    ? 'border-red-500 shadow-md'
                    : 'border-gray-200 hover:border-red-400'
                }`}
              >
                {/* Image area */}
                <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-1.5 border-b border-gray-100">
                  <div className="absolute top-1.5 left-1.5 bg-red-600 text-white p-0.5 rounded shadow-sm">
                    <ShoppingCartIcon size={12} />
                  </div>
                  {inCart && (
                    <div className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                      {inCart.quantity}
                    </div>
                  )}
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <PackageIcon className="text-gray-300" size={32} />
                  )}
                </div>

                {/* Info */}
                <div className="bg-white p-1.5 flex flex-col h-full text-center mt-auto">
                  <h3 className="font-semibold text-[11px] text-gray-800 truncate leading-tight mb-0.5" title={product.name}>
                    {product.name}
                  </h3>
                  <div className="flex flex-col gap-0.5 mt-auto">
                    <div className="flex justify-between items-center bg-red-50 px-1 py-0.5 rounded">
                      <span className="text-[8px] text-red-600 font-bold uppercase">Price</span>
                      <span className="font-bold text-[10px] text-red-700">RS.{product.price}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100">
                    <span className="text-[8px] text-gray-400 font-bold">{product.unit || 'PCS'}</span>
                    <div className="flex items-center gap-1">
                      {product.minStock > 0 && product.stock <= product.minStock && product.stock > 0 && (
                        <span className="text-[7px] font-bold bg-orange-500 text-white px-1 py-0.5 rounded">LOW</span>
                      )}
                      <span className={`text-[8px] font-bold ${product.stock === 0 ? 'text-red-600' : product.minStock > 0 && product.stock <= product.minStock ? 'text-orange-500' : 'text-gray-500'}`}>
                        {product.stock}
                      </span>
                    </div>
                  </div>
                </div>

                {product.stock <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/20">
                    <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">Out of Stock</span>
                  </div>
                )}
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400 text-sm">No products found</div>
          )}
        </div>
      </div>

      {/* Cart / Order Section */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-red-600" size={18} />
              <h3 className="font-semibold text-gray-800 text-sm">Sale Order ({cart.length})</h3>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="space-y-2 mb-4 max-h-72 overflow-y-auto custom-scrollbar">
            {cart.map(item => (
              <div key={item.productId} className="border border-gray-100 rounded-lg p-2 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-gray-800 truncate">{item.productName}</p>
                    <p className="text-[10px] text-gray-400">{item.unit || 'PCS'}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="p-1 hover:bg-red-50 rounded text-red-400 shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Editable Selling Price */}
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Sale Price (RS.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-red-200 rounded text-xs font-bold text-red-600 focus:ring-2 focus:ring-red-400 outline-none"
                  />
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1.5 hover:bg-gray-100 rounded-l-lg text-gray-600 transition-colors border-r border-gray-200">
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1) {
                          const product = products.find(p => p.id === item.productId);
                          if (product && val > product.stock) { alert(`Only ${product.stock} available.`); return; }
                          setCart(cart.map(ci =>
                            ci.productId === item.productId
                              ? { ...ci, quantity: val, total: val * ci.price }
                              : ci
                          ));
                        }
                      }}
                      className="w-12 h-full text-center font-black text-[13px] text-red-700 bg-transparent outline-none appearance-none"
                    />
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1.5 hover:bg-gray-100 rounded-r-lg text-gray-600 transition-colors border-l border-gray-200">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-black text-sm text-red-600">RS.{item.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-gray-400 text-center py-10 text-xs">No items in cart</p>
            )}
          </div>

          {/* Billing & Options */}
          <div className="space-y-3 border-t pt-3">
            {/* Customer — optional */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Customer <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded text-xs flex justify-between">
                  <span className="font-bold text-red-700">Outstanding Balance:</span>
                  <span className="font-bold text-red-900">RS. {getLiveBalance(selectedCustomer, 'customer').toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Account — optional */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                💳 Receive Into Account <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
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
            </div>

            {/* Discount */}
            <div>
              <label className="flex text-xs font-bold text-gray-500 uppercase mb-1 items-center gap-1">
                <Tag size={11} /> Discount (RS.) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="0"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
              <div className="flex gap-2">
                {(['cash', 'credit', 'online'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 px-2 py-2 rounded capitalize text-xs font-semibold transition-colors ${
                      paymentMethod === method ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {method === 'cash' ? '💵 Cash' : method === 'credit' ? '📋 Credit' : '📱 Online'}
                  </button>
                ))}
              </div>
            </div>

            {/* Online Payment Method Selector */}
            {paymentMethod === 'online' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'easypaisa', label: 'EasyPaisa', icon: '📱' },
                    { id: 'jazzcash', label: 'JazzCash', icon: '📲' },
                    { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                    { id: 'sadapay', label: 'SadaPay', icon: '💳' },
                    { id: 'nayapay', label: 'NayaPay', icon: '💳' },
                    { id: 'payoneer', label: 'Payoneer', icon: '🌐' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setOnlineMethod(opt.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                        onlineMethod === opt.id
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>

                {/* Payment Info Box — shows account number + QR from settings */}
                {(() => {
                  const accountNum = (settings.onlinePayments as any)?.[onlineMethod] || '';
                  const qrImg = (settings.onlinePayments as any)?.[`${onlineMethod}_qr`] || '';
                  const platformLabel = {
                    easypaisa: 'EasyPaisa', jazzcash: 'JazzCash',
                    bank_transfer: 'Bank Transfer', sadapay: 'SadaPay',
                    nayapay: 'NayaPay', payoneer: 'Payoneer'
                  }[onlineMethod] || onlineMethod;

                  if (!accountNum && !qrImg) {
                    return (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>No account configured for {platformLabel}. Go to <strong>Settings → Online Payments</strong> to add it.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">
                          {{ easypaisa: '📱', jazzcash: '📲', bank_transfer: '🏦', sadapay: '💳', nayapay: '💳', payoneer: '🌐' }[onlineMethod]}
                        </span>
                        <p className="text-xs font-semibold text-green-800">{platformLabel} Payment Details</p>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {accountNum && (
                            <div className="mb-2">
                              <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide mb-0.5">Account Number</p>
                              <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
                                <p className="text-sm font-bold text-gray-800 tracking-wider flex-1">{accountNum}</p>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(accountNum); }}
                                  className="text-[10px] text-green-600 hover:text-green-800 font-medium shrink-0"
                                  title="Copy"
                                >
                                  Copy
                                </button>
                              </div>
                            </div>
                          )}
                          <p className="text-[10px] text-green-600">
                            Ask customer to send <strong>RS.{total.toFixed(0)}</strong> to this account
                          </p>
                        </div>

                        {qrImg && (
                          <div className="shrink-0">
                            <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide mb-1">Scan QR</p>
                            <img
                              src={qrImg}
                              alt="QR Code"
                              className="w-20 h-20 object-contain border border-green-200 rounded-lg bg-white p-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {paymentMethod === 'credit' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount Paid Now (RS.)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1 text-sm bg-gray-50 p-3 rounded border border-gray-200">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-bold">RS.{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600 text-xs">
                  <span>Discount:</span>
                  <span className="font-bold">-RS.{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-1 mt-1">
                <span>Total Bill:</span>
                <span className="text-red-600">RS.{total.toFixed(2)}</span>
              </div>
              {paymentMethod === 'credit' && (
                <div className="flex justify-between text-orange-600 text-xs">
                  <span>Balance Payable:</span>
                  <span className="font-bold">RS.{Math.max(0, total - amountPaid).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <button
              disabled={isSubmitting || cart.length === 0 || (paymentMethod === 'credit' && !selectedCustomer)}
              onClick={handleCompleteSale}
              className={`w-full py-3 rounded-lg font-bold transition-colors text-sm ${
                isSubmitting || cart.length === 0 || (paymentMethod === 'credit' && !selectedCustomer)
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : paymentMethod === 'online' ? `Complete Sale — ${onlineMethod === 'easypaisa' ? 'EasyPaisa' : onlineMethod === 'jazzcash' ? 'JazzCash' : onlineMethod === 'bank_transfer' ? 'Bank Transfer' : onlineMethod}` : 'Complete Sale & Print Receipt'}
            </button>

            {/* Refund Button */}
            <button
              onClick={() => { setShowRefundModal(true); setRefundSuccess(null); setRefundResults([]); setRefundSearch(''); }}
              className="w-full py-2.5 rounded-lg font-bold text-sm border-2 border-orange-400 text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Process Sale Refund
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Refund Modal */}
    {showRefundModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50">
            <div>
              <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <RotateCcw className="text-orange-500" size={20} /> Process Sale Refund
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Search by Bill Number or last 6 digits of ID</p>
            </div>
            <button onClick={() => setShowRefundModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative grow">
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

            {refundSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-bold">
                <CheckCircle size={18} /> {refundSuccess}
              </div>
            )}

            <div className="space-y-3">
              {refundResults.length === 0 && !isSearching && refundSearch && (
                <p className="text-center text-gray-400 text-sm py-6">No sales found for "{refundSearch}"</p>
              )}
              {refundResults.map((record: any) => (
                <div key={record.id} className="p-4 border border-gray-200 rounded-xl hover:border-orange-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="grow min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {record.billNumber || record.id?.toString().slice(-6).toUpperCase()}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          record.status === 'returned' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                        }`}>
                          {record.status === 'returned' ? '↩ Returned' : '✓ Completed'}
                        </span>
                        <span className="text-xs text-gray-400">{record.date}</span>
                      </div>
                      <p className="font-bold text-gray-800">{record.customerName}</p>
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

// SVG helpers
function ShoppingCartIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

function PackageIcon({ className, size }: { className?: string; size: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  );
}
