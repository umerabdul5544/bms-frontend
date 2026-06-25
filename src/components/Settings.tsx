import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Settings as SettingsIcon, Store, DollarSign, Palette, Save, Camera, X, Smartphone } from 'lucide-react';

const ONLINE_PLATFORMS = [
  { id: 'easypaisa', label: 'EasyPaisa', icon: '📱', placeholder: '03XX-XXXXXXX', hint: 'EasyPaisa mobile account number' },
  { id: 'jazzcash', label: 'JazzCash', icon: '📲', placeholder: '03XX-XXXXXXX', hint: 'JazzCash mobile account number' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', placeholder: 'IBAN / Account No.', hint: 'Bank account or IBAN number' },
  { id: 'sadapay', label: 'SadaPay', icon: '💳', placeholder: '03XX-XXXXXXX', hint: 'SadaPay account number' },
  { id: 'nayapay', label: 'NayaPay', icon: '💳', placeholder: '03XX-XXXXXXX', hint: 'NayaPay account number' },
  { id: 'payoneer', label: 'Payoneer', icon: '🌐', placeholder: 'email@example.com', hint: 'Payoneer email or account ID' },
];

export function Settings() {
  const { settings, updateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'ui' | 'payments'>('general');
  const [formData, setFormData] = useState(() => ({
    ...settings,
    onlinePayments: {
      easypaisa: settings.onlinePayments?.easypaisa || '',
      jazzcash: settings.onlinePayments?.jazzcash || '',
      bank_transfer: settings.onlinePayments?.bank_transfer || '',
      sadapay: settings.onlinePayments?.sadapay || '',
      nayapay: settings.onlinePayments?.nayapay || '',
      payoneer: settings.onlinePayments?.payoneer || '',
      easypaisa_qr: (settings.onlinePayments as any)?.easypaisa_qr || '',
      jazzcash_qr: (settings.onlinePayments as any)?.jazzcash_qr || '',
      bank_transfer_qr: (settings.onlinePayments as any)?.bank_transfer_qr || '',
      sadapay_qr: (settings.onlinePayments as any)?.sadapay_qr || '',
      nayapay_qr: (settings.onlinePayments as any)?.nayapay_qr || '',
      payoneer_qr: (settings.onlinePayments as any)?.payoneer_qr || '',
    },
  }));
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateSettings(formData);
    if (formData.themeMode === 'dark') {
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert("Logo file is too large. Please select an image under 1MB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => { setFormData(prev => ({ ...prev, logoUrl: reader.result as string })); };
      reader.readAsDataURL(file);
    }
  };

  const handleQrUpload = (platformId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("QR image too large. Max 2MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        onlinePayments: { ...prev.onlinePayments, [`${platformId}_qr`]: reader.result as string }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleThemeModeChange = (mode: 'light' | 'dark') => {
    setFormData(prev => ({ ...prev, themeMode: mode }));
    updateSettings({ themeMode: mode });
  };

  useEffect(() => {
    const shortcutSaveListener = () => {
      handleSave();
    };
    window.addEventListener('shortcut-save', shortcutSaveListener);
    return () => window.removeEventListener('shortcut-save', shortcutSaveListener);
  }, [formData]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0F172A] rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg"><SettingsIcon size={18} /></div>
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure your business profile and preferences</p>
          </div>
        </div>
        <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all ${isSaved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          <Save size={15} />
          {isSaved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row h-full overflow-hidden">
        <div className="w-full lg:w-52 border-r border-gray-100 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/20 p-3 space-y-1">
          <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
            <Store size={16} /> Global Profile
          </button>
          <button onClick={() => setActiveTab('pricing')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'pricing' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
            <DollarSign size={16} /> Finance & Stock
          </button>
          <button onClick={() => setActiveTab('payments')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'payments' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
            <Smartphone size={16} /> Online Payments
          </button>
          <button onClick={() => setActiveTab('ui')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'ui' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
            <Palette size={16} /> Visual Identity
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">

          {activeTab === 'general' && (
            <div className="max-w-2xl space-y-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">Business Profile</h3>
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-700 border-2 border-dashed border-blue-200 dark:border-blue-800 flex items-center justify-center overflow-hidden">
                    {formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" /> : <Camera size={20} className="text-blue-300" />}
                  </div>
                  {formData.logoUrl && (
                    <button onClick={() => setFormData({ ...formData, logoUrl: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"><X size={10} /></button>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Logo</p>
                  <p className="text-xs text-gray-400 mb-2">Shown on sidebar, dashboard and receipts</p>
                  <label className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg cursor-pointer transition-all">
                    Upload Logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Business Name</label>
                  <input type="text" value={formData.bakeryName} onChange={e => setFormData({ ...formData, bakeryName: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-white text-sm transition-all" placeholder="e.g. Dream Bakery & Sweets" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contact Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-white text-sm transition-all" placeholder="+92 3XX XXXXXXX" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Business Address</label>
                  <textarea rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-white text-sm transition-all resize-none" placeholder="Shop / warehouse address" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Currency</label>
                  <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-white text-sm transition-all">
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="max-w-2xl space-y-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">Pricing & Revenue</h3>
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Default Sales Tax (%)</label>
                <div className="relative">
                  <input type="number" min="0" value={formData.defaultTax} onChange={e => setFormData({ ...formData, defaultTax: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:text-white text-sm transition-all pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Applied to all new POS transactions by default</p>
              </div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2 pt-2">Stock & Expiry</h3>
              <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${formData.enableExpiryDate ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' : 'bg-gray-50 border-gray-200 dark:bg-slate-800/30 dark:border-slate-700'}`}>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={!!formData.enableExpiryDate} onChange={e => {
                    const updated = { ...formData, enableExpiryDate: e.target.checked };
                    setFormData(updated);
                    updateSettings({ enableExpiryDate: e.target.checked });
                  }} />
                  <div className="w-10 h-5 bg-gray-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Track Expiry Dates</p>
                  <p className="text-xs text-gray-400 mt-0.5">Dashboard will alert you when products are near expiry, with serial numbers shown</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">Online Payment Accounts</h3>
                <p className="text-xs text-gray-400 mt-2">Add your account numbers and optional QR codes. These will be shown to cashiers when a customer selects online payment in POS.</p>
              </div>

              <div className="space-y-4">
                {ONLINE_PLATFORMS.map(platform => {
                  const accountVal = (formData.onlinePayments as any)?.[platform.id] || '';
                  const qrKey = `${platform.id}_qr`;
                  const qrVal = (formData.onlinePayments as any)?.[qrKey] || '';

                  return (
                    <div key={platform.id} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{platform.icon}</span>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{platform.label}</p>
                        {accountVal && (
                          <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Configured</span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Account Number / ID</label>
                          <input
                            type="text"
                            value={accountVal}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              onlinePayments: { ...prev.onlinePayments, [platform.id]: e.target.value }
                            }))}
                            placeholder={platform.placeholder}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-white text-sm transition-all"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">{platform.hint}</p>
                        </div>

                        <div className="shrink-0">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            QR Code <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                              {qrVal ? (
                                <img src={qrVal} alt="QR" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl opacity-40">📷</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="inline-block px-2.5 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-[10px] font-medium rounded-lg cursor-pointer transition-all text-center">
                                {qrVal ? 'Change' : 'Upload QR'}
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleQrUpload(platform.id, e)} />
                              </label>
                              {qrVal && (
                                <button
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    onlinePayments: { ...prev.onlinePayments, [qrKey]: '' }
                                  }))}
                                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-medium rounded-lg transition-all"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 When a cashier selects a platform in POS, the account number and QR code will appear in a payment info box for the customer to scan or note down.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ui' && (
            <div className="max-w-2xl space-y-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">Theme</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Display Mode</label>
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg w-fit">
                  <button onClick={() => handleThemeModeChange('light')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.themeMode === 'light' ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Palette size={14} /> Light
                  </button>
                  <button onClick={() => handleThemeModeChange('dark')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.themeMode === 'dark' ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Palette size={14} /> Dark
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Dark mode is easier on the eyes during long shifts</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
