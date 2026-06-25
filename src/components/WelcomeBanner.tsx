import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from './AppContext';

export function WelcomeBanner() {
  const { settings } = useApp();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl px-5 py-4 text-white shadow-sm mb-4 flex items-center gap-4">
      {settings?.logoUrl && (
        <img src={settings.logoUrl} alt="Logo" className="h-9 w-auto object-contain shrink-0 rounded" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {settings?.bakeryName || 'BMS POS'}
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[10px] text-slate-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span> Point of Sale
          </span>
          <span className="text-[10px] text-slate-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span> Inventory
          </span>
          <span className="text-[10px] text-slate-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span> Ledger
          </span>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
