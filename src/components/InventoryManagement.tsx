import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useApp, Product } from './AppContext';
import { Plus, Edit2, Trash2, Package, TrendingUp, DollarSign, BarChart2, Search, Camera, X } from 'lucide-react';

interface ProductFormData extends Omit<Product, 'id'> {
  costPrice: number;
  serialNumber: string;
  imageUrl: string;
  expiryDate: string;
}

export function InventoryManagement() {
  const { products, addProduct, updateProduct, deleteProduct, settings } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scanSerial, setScanSerial] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '', category: '', unit: 'kg',
    price: 0, costPrice: 0, stock: 0, minStock: 0,
    serialNumber: '', imageUrl: '', expiryDate: '',
  });

  // Handle scanner input — serial number, barcode, or product name
  const handleScan = () => {
    if (!scanSerial.trim()) return;
    const query = scanSerial.trim().toLowerCase();
    const found = products.find(p =>
      (p.serialNumber && p.serialNumber.toLowerCase() === query) ||
      (p.barcode && String(p.barcode).toLowerCase() === query) ||
      p.name.toLowerCase().includes(query)
    );
    setScannedProduct(found || null);
    if (!found) alert(`No product found for "${scanSerial}"`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure unit has a default if empty
      const finalUnit = formData.unit || 'kg';
      const dataToSave = { ...formData, unit: finalUnit };
      if (editingId) {
        await updateProduct(editingId, dataToSave);
        setEditingId(null);
      } else {
        await addProduct(dataToSave);
      }
      setFormData({ name: '', category: '', unit: 'kg', price: 0, costPrice: 0, stock: 0, minStock: 0, serialNumber: '', imageUrl: '', expiryDate: '' });
      setShowForm(false);
      setScanSerial('');
      setScannedProduct(null);
    } catch (error: any) {
      alert(error?.message || 'Failed to save product. Please try again.');
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      costPrice: product.costPrice || 0,
      stock: product.stock,
      minStock: product.minStock,
      serialNumber: product.serialNumber || '',
      imageUrl: product.imageUrl || '',
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Summary calculations
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalCostValue = products.reduce((sum, p) => sum + (((p as any).costPrice || 0) * p.stock), 0);
  const totalProfit = totalStockValue - totalCostValue;
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const hasCostData = products.some(p => (p as any).costPrice > 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 px-5 py-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Inventory</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {totalProducts} products · {lowStockCount > 0 && <span className="text-red-500 font-medium">{lowStockCount} low stock</span>}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500/30 transition-all">
            <Search className="text-gray-400 shrink-0" size={15} />
            <input
              type="text"
              placeholder="Scan barcode / serial..."
              value={scanSerial}
              onChange={(e) => setScanSerial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              className="bg-transparent text-sm outline-none dark:text-white w-full sm:w-44 placeholder:text-gray-400"
            />
            <button onClick={handleScan} className="text-xs font-semibold text-green-600 hover:text-green-700 px-1">Find</button>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ name: '', category: '', unit: 'kg', price: 0, costPrice: 0, stock: 0, minStock: 0, serialNumber: '', imageUrl: '', expiryDate: '' });
            }}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium shadow-sm"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Scanned Product Banner */}
      {scannedProduct && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <div className="bg-blue-100 p-1.5 rounded-lg shrink-0">
            {scannedProduct.imageUrl ? (
              <img src={scannedProduct.imageUrl} alt="product" className="w-8 h-8 object-cover rounded" />
            ) : (
              <Package size={18} className="text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800 truncate">{scannedProduct.name}</p>
            <p className="text-xs text-blue-500">SN: {scannedProduct.serialNumber} · Stock: {scannedProduct.stock} {scannedProduct.unit}</p>
          </div>
          <button onClick={() => setScannedProduct(null)} className="p-1 hover:bg-blue-100 rounded-lg transition-colors shrink-0">
            <X size={16} className="text-blue-400" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
              <Package className="text-blue-600 dark:text-blue-400" size={16} />
            </div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Total SKU</span>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalProducts}</p>
          {lowStockCount > 0 && (
            <p className="text-[10px] text-red-500 font-medium mt-1">⚠ {lowStockCount} low stock</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg">
              <BarChart2 className="text-green-600 dark:text-green-400" size={16} />
            </div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Store Value</span>
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">RS. {totalStockValue.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 mt-1">At selling price</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg">
              <DollarSign className="text-orange-600 dark:text-orange-400" size={16} />
            </div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Cost Invested</span>
          </div>
          {hasCostData ? (
            <>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">RS. {totalCostValue.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 mt-1">Total purchase value</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-300 dark:text-slate-700">—</p>
              <p className="text-[10px] text-gray-400 mt-1 italic">No cost data</p>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg">
              <TrendingUp className="text-purple-600 dark:text-purple-400" size={16} />
            </div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Gross Profit</span>
          </div>
          {hasCostData ? (
            <>
              <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600'}`}>
                RS. {totalProfit.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {totalCostValue > 0 ? `${((totalProfit / totalCostValue) * 100).toFixed(1)}% margin` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-300 dark:text-slate-700">—</p>
              <p className="text-[10px] text-gray-400 mt-1 italic">Awaiting cost data</p>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Form (Modal) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 text-white rounded-lg">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                    {editingId ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <p className="text-xs text-gray-400">Fields marked with * are required</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Image Upload */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-700 border-2 border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={24} className="text-gray-300" />
                      )}
                    </div>
                    {formData.imageUrl && (
                      <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="inline-block px-3 py-1.5 bg-gray-800 dark:bg-slate-700 hover:bg-black text-white text-xs font-medium rounded-lg cursor-pointer transition-all">
                      Upload Photo
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, WEBP · Max 2MB</p>
                  </div>
                </div>

                {/* Product Details */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Product Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product Name *</label>
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:text-white text-sm transition-all"
                        placeholder="e.g. Premium Wheat Flour 5kg" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Serial / Barcode</label>
                      <input type="text" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:text-white text-sm transition-all"
                        placeholder="Scan or type barcode" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
                      <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:text-white text-sm transition-all"
                        placeholder="e.g. Grocery / Dairy" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unit</label>
                      <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:text-white text-sm transition-all">
                        <optgroup label="Weight">
                          <option value="kg">KG — Kilograms</option>
                          <option value="g">G — Grams</option>
                          <option value="mg">MG — Milligrams</option>
                          <option value="ton">TON — Tonnes</option>
                        </optgroup>
                        <optgroup label="Volume">
                          <option value="ltr">LTR — Litres</option>
                          <option value="ml">ML — Millilitres</option>
                        </optgroup>
                        <optgroup label="Count">
                          <option value="pcs">PCS — Pieces</option>
                          <option value="pck">PCK — Packs</option>
                          <option value="box">BOX — Boxes</option>
                          <option value="doz">DOZ — Dozen</option>
                          <option value="pair">PAIR — Pairs</option>
                          <option value="set">SET — Sets</option>
                          <option value="roll">ROLL — Rolls</option>
                          <option value="bag">BAG — Bags</option>
                          <option value="bottle">BTL — Bottles</option>
                          <option value="can">CAN — Cans</option>
                          <option value="tray">TRAY — Trays</option>
                        </optgroup>
                        <optgroup label="Length">
                          <option value="m">M — Meters</option>
                          <option value="cm">CM — Centimeters</option>
                          <option value="ft">FT — Feet</option>
                          <option value="yard">YD — Yards</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="unit">UNIT — Unit</option>
                          <option value="service">SVC — Service</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pricing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-orange-600 mb-1">Cost Price (RS.) *</label>
                      <input type="number" required min="0" step="0.01" value={formData.costPrice || ''} onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/40 rounded-lg outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 dark:text-white text-sm font-medium transition-all"
                        placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-green-600 mb-1">Selling Price (RS.) *</label>
                      <input type="number" required min="0" step="0.01" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-lg outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 dark:text-white text-sm font-medium transition-all"
                        placeholder="0.00" />
                    </div>
                    {formData.costPrice > 0 && formData.price > 0 && (
                      <div className="sm:col-span-2 flex items-center justify-between bg-gray-800 dark:bg-slate-900 px-4 py-3 rounded-lg">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Profit per unit</p>
                          <p className="text-sm font-semibold text-white">RS. {(formData.price - formData.costPrice).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Margin</p>
                          <p className="text-lg font-bold text-green-400">{((formData.price - formData.costPrice) / formData.costPrice * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stock</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Opening Stock *</label>
                      <input type="number" required min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:text-white text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Min Stock Alert *</label>
                      <input type="number" required min="0" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 dark:text-white text-sm transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                        Expiry Date
                        <span className="text-gray-400 font-normal">(optional)</span>
                        {!settings?.enableExpiryDate && (
                          <span className="text-[10px] text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-200">
                            Enable in Settings → Finance & Stock
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        disabled={!settings?.enableExpiryDate}
                        className={`w-full px-3 py-2 border rounded-lg outline-none text-sm transition-all dark:text-white ${
                          settings?.enableExpiryDate
                            ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400'
                            : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400 cursor-not-allowed opacity-60'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
                  <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                    className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                    Cancel
                  </button>
                  <button type="submit"
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all">
                    {editingId ? 'Save Changes' : 'Add Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Products Table (added Serial # & Image columns) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Serial #</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-green-500 uppercase">Sell Price</th>
                {hasCostData && <th className="px-6 py-3 text-left text-[10px] font-bold text-orange-400 uppercase">Cost Price</th>}
                {hasCostData && <th className="px-6 py-3 text-left text-[10px] font-bold text-purple-400 uppercase">Profit/Unit</th>}
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Total Value</th>
                {hasCostData && <th className="px-6 py-3 text-left text-[10px] font-bold text-purple-400 uppercase">Total Profit</th>}
                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => {
                const costPrice = product.costPrice || 0;
                const profitPerUnit = product.price - costPrice;
                const totalValue = product.price * product.stock;
                const totalCostForProduct = costPrice * product.stock;
                const totalProfitForProduct = totalValue - totalCostForProduct;

                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} className="w-10 h-10 object-cover rounded" alt={product.name} />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No img</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">{product.serialNumber || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-50 p-2 rounded hidden sm:block">
                          <Package className="text-green-600" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{product.category || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                        RS.{product.price.toLocaleString()}
                      </span>
                    </td>
                    {hasCostData && (
                      <td className="px-6 py-4">
                        {costPrice > 0 ? (
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            RS.{costPrice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {hasCostData && (
                      <td className="px-6 py-4">
                        {costPrice > 0 ? (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            profitPerUnit >= 0 ? 'text-purple-700 bg-purple-50' : 'text-red-600 bg-red-50'
                          }`}>
                            RS.{profitPerUnit.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-xs font-medium text-gray-600">
                      {product.stock} <span className="text-[10px] text-gray-400">{product.unit}</span>
                    </td>
                    <td className="px-6 py-4">
                      {product.stock <= product.minStock ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-red-50 text-red-600 rounded-full border border-red-100 uppercase">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-green-50 text-green-600 rounded-full border border-green-100 uppercase">In Stock</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-800">RS.{totalValue.toLocaleString()}</span>
                    </td>
                    {hasCostData && (
                      <td className="px-6 py-4">
                        {costPrice > 0 ? (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            totalProfitForProduct >= 0 ? 'text-purple-700 bg-purple-50' : 'text-red-600 bg-red-50'
                          }`}>
                            RS.{totalProfitForProduct.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {products.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-600">
                    Totals — {products.length} products
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-green-700">RS.{totalStockValue.toLocaleString()}</span>
                    <p className="text-[10px] text-gray-400">Sell value</p>
                  </td>
                  {hasCostData && (
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-orange-600">RS.{totalCostValue.toLocaleString()}</span>
                      <p className="text-[10px] text-gray-400">Cost</p>
                    </td>
                  )}
                  {hasCostData && (
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${totalProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                        {totalCostValue > 0 ? `${((totalProfit / totalCostValue) * 100).toFixed(1)}%` : '—'}
                      </span>
                      <p className="text-[10px] text-gray-400">Avg margin</p>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-gray-700">
                      {products.reduce((sum, p) => sum + p.stock, 0).toLocaleString()} units
                    </span>
                    <p className="text-[10px] text-gray-400">Total stock</p>
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  {hasCostData && (
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${totalProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                        RS.{totalProfit.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-gray-400">Total profit</p>
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="sm:hidden bg-gray-50 px-4 py-2 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-medium">Swipe left/right to view full table</p>
        </div>
      </div>
    </div>
  );
}