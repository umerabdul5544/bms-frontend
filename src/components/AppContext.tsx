import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { 
  productsAPI, customerApi, salesApi, ledgerApi, authApi, 
  suppliersApi, purchasesApi, accountsAPI, accountTransactionsAPI, 
  trialBalanceAPI, banksApi 
} from "../utils/api";

// --- Interfaces ---
export interface Product { id: string; name: string; category: string; unit: string; price: number; stock: number; minStock: number; costPrice?: number; imageUrl?: string; serialNumber?: string; barcode?: string; expiryDate?: string; }
export interface GlobalSettings {
  bakeryName: string;
  logoUrl: string;
  address: string;
  phone: string;
  currency: string;
  timezone: string;
  defaultTax: number;
  enableExpiryDate: boolean;
  themeMode: 'light' | 'dark';
  onlinePayments: {
    easypaisa: string;
    jazzcash: string;
    bank_transfer: string;
    sadapay: string;
    nayapay: string;
    payoneer: string;
    easypaisa_qr?: string;
    jazzcash_qr?: string;
    bank_transfer_qr?: string;
    sadapay_qr?: string;
    nayapay_qr?: string;
    payoneer_qr?: string;
  };
}
export interface Supplier { id: string; name: string; contact: string; phone: string; address: string; balance: number; createdAt: string; }
export interface Customer { id: string; name: string; phone: string; address: string; balance: number; }
export interface Account { id: string; name: string; type: "bank" | "receivable" | "payable" | "cash" | "expense" | "other"; category: "Assets" | "Liabilities" | "Expenses" | "Equity"; balance: number; description?: string; createdAt: string; }
export interface AccountTransaction { id: string; date: string; description: string; debitAccountId: string; creditAccountId: string; amount: number; reference?: string; createdAt: string; createdBy: string; }
export interface Sale { id: string; date: string; customerId: string; customerName: string; items: any[]; subtotal: number; discount: number; total: number; paymentMethod: "cash" | "credit" | "online"; amountPaid: number; balance: number; soldBy?: string; status?: string; billNumber?: string; onlineMethod?: string; }
export interface Purchase { id: string; supplierId: string; supplierName: string; items: any[]; subtotal: number; discount: number; total: number; paymentMethod: "cash" | "credit"; amountPaid: number; balance: number; date: string; }
export interface LedgerEntry { id: string; date: string; type: string; description: string; debit: number; credit: number; balance: number; customerName?: string; supplierName?: string; accountName?: string; }
export interface Shop { id: string; shopName: string; ownerName: string; email: string; phone: string; address: string; role?: string; createdAt: string; }

interface AppContextType {
  shop: Shop | null; userName: string; userEmail: string; products: Product[]; customers: Customer[]; sales: Sale[]; ledgerEntries: LedgerEntry[]; suppliers: Supplier[]; purchases: Purchase[]; accounts: Account[]; accountTransactions: AccountTransaction[]; loading: boolean;
  getLiveBalance: (entityId: string, type: 'customer' | 'supplier' | 'account') => number;
  settings: GlobalSettings;
  updateSettings: (newSettings: Partial<GlobalSettings>) => void;
  returnSale: (id: string) => Promise<void>;
  returnPurchase: (id: string) => Promise<void>;
  addProduct: (p: any) => Promise<void>; updateProduct: (id: string, p: any) => Promise<void>; deleteProduct: (id: string) => Promise<void>; addCustomer: (c: any) => Promise<void>; updateCustomer: (id: string, c: any) => Promise<void>; deleteCustomer: (id: string) => Promise<void>; addSale: (s: any) => Promise<void>; addLedgerEntry: (e: any) => Promise<void>; addPayment: (cId: string, amt: number, desc: string) => Promise<void>; addSupplier: (s: any) => Promise<void>; updateSupplier: (id: string, s: any) => Promise<void>; deleteSupplier: (id: string) => Promise<void>; addPurchase: (p: any) => Promise<void>; addSupplierPayment: (sId: string, amt: number, desc: string) => Promise<void>; addAccount: (a: any) => Promise<void>; updateAccount: (id: string, u: any) => Promise<void>; deleteAccount: (id: string) => Promise<void>; addAccountTransaction: (t: any) => Promise<void>; deleteAccountTransaction: (id: string) => Promise<void>; addBank: (bank: any) => Promise<any>; updateBank: (id: string, updates: any) => Promise<any>; deleteBank: (id: string) => Promise<void>; depositToBank: (bankId: string, amount: number, description?: string) => Promise<void>; withdrawFromBank: (bankId: string, amount: number, description?: string) => Promise<void>; getTrialBalance: () => Promise<any>; refreshData: () => Promise<void>; signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const toNum = (v: any) => (v == null ? 0 : typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]+/g, "")) || 0);

// ✅ Helper to map MongoDB _id to id (always force string)
const mapId = (item: any): any => {
  if (!item) return item;
  if (Array.isArray(item)) return item.map(mapId).filter(i => i != null);
  if (typeof item !== 'object') return item;
  const id = item.id || item._id || item.id;
  return { ...item, id: id ? String(id) : undefined };
};

export function AppProvider({ children, initialShop, userName, userEmail, onSignOut }: { children: ReactNode; initialShop: Shop | null; userName: string; userEmail: string; onSignOut: () => void }) {
  const [shop] = useState<Shop | null>(initialShop);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings State mapped to Local Storage
  const [settings, setSettingsState] = useState<GlobalSettings>(() => {
    try {
      const saved = localStorage.getItem('bms_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            bakeryName: parsed.bakeryName || 'My Bakery POS',
            logoUrl: parsed.logoUrl || '',
            address: parsed.address || '',
            phone: parsed.phone || '',
            currency: parsed.currency || 'PKR',
            timezone: parsed.timezone || 'Asia/Karachi',
            defaultTax: parsed.defaultTax || 0,
            enableExpiryDate: !!parsed.enableExpiryDate,
            themeMode: parsed.themeMode || 'light',
            onlinePayments: {
              easypaisa: parsed.onlinePayments?.easypaisa || '',
              jazzcash: parsed.onlinePayments?.jazzcash || '',
              bank_transfer: parsed.onlinePayments?.bank_transfer || '',
              sadapay: parsed.onlinePayments?.sadapay || '',
              nayapay: parsed.onlinePayments?.nayapay || '',
              payoneer: parsed.onlinePayments?.payoneer || '',
              easypaisa_qr: parsed.onlinePayments?.easypaisa_qr || '',
              jazzcash_qr: parsed.onlinePayments?.jazzcash_qr || '',
              bank_transfer_qr: parsed.onlinePayments?.bank_transfer_qr || '',
              sadapay_qr: parsed.onlinePayments?.sadapay_qr || '',
              nayapay_qr: parsed.onlinePayments?.nayapay_qr || '',
              payoneer_qr: parsed.onlinePayments?.payoneer_qr || '',
            },
          };
        }
      }
    } catch (e) {
      console.error("Settings parse error:", e);
    }
    return {
      bakeryName: 'My Bakery POS',
      logoUrl: '',
      address: '',
      phone: '',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      defaultTax: 0,
      enableExpiryDate: false,
      themeMode: 'light',
      onlinePayments: {
        easypaisa: '',
        jazzcash: '',
        bank_transfer: '',
        sadapay: '',
        nayapay: '',
        payoneer: '',
        easypaisa_qr: '',
        jazzcash_qr: '',
        bank_transfer_qr: '',
        sadapay_qr: '',
        nayapay_qr: '',
        payoneer_qr: '',
      },
    };
  });
  const updateSettings = useCallback((newSettings: Partial<GlobalSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('bms_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        productsAPI.getAll(), customerApi.getAll(), salesApi.getAll(), ledgerApi.getAll(),
        suppliersApi.getAll(), purchasesApi.getAll(), accountsAPI.getAll(), banksApi.getAll(),
        accountTransactionsAPI.getAll(),
      ]);

      const getData = (index: number, key: string) => {
        const res = results[index];
        if (res && res.status === "fulfilled" && res.value) {
          const val = res.value;
          const data = val[key] || (val.data && val.data[key]) || (Array.isArray(val) ? val : []);
          return Array.isArray(data) ? mapId(data) : [];
        }
        return [];
      };

      const fetchedAccounts = getData(6, 'accounts');
      const fetchedBanksRaw = results[7] && results[7].status === 'fulfilled' ? results[7].value : [];
      let fetchedBanks = Array.isArray(fetchedBanksRaw) ? fetchedBanksRaw : (fetchedBanksRaw?.banks || fetchedBanksRaw?.data?.banks || []);
      fetchedBanks = mapId(fetchedBanks);
      
      const accountsMap = new Map<string, Account>();
      (Array.isArray(fetchedAccounts) ? fetchedAccounts : []).forEach((a: any) => { if (a?.id) accountsMap.set(a.id, a); });
      (Array.isArray(fetchedBanks) ? fetchedBanks : []).forEach((b: any) => { if (b?.id) accountsMap.set(b.id, { ...b, type: 'bank', category: 'Assets' }); });

      setProducts(getData(0, 'products'));
      setCustomers(getData(1, 'customers'));
      // Ensure numeric fields are properly typed
      const rawSales = getData(2, 'sales');
      setSales(rawSales.map((s: any) => ({
        ...s,
        total: parseFloat(String(s.total)) || 0,
        subtotal: parseFloat(String(s.subtotal)) || 0,
        amountPaid: parseFloat(String(s.amountPaid)) || 0,
        balance: parseFloat(String(s.balance)) || 0,
        discount: parseFloat(String(s.discount)) || 0,
      })));
      setLedgerEntries(getData(3, 'ledger'));
      setSuppliers(getData(4, 'suppliers'));
      setPurchases(getData(5, 'purchases'));
      setAccounts(Array.from(accountsMap.values()));
      setAccountTransactions(getData(8, 'transactions'));
    } catch (error) { 
      console.error("Sync Error:", error); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getLiveBalance = useCallback((entityId: string, type: 'customer' | 'supplier' | 'account') => {
    let rolling = 0;
    accountTransactions.forEach(at => {
      if (at.debitAccountId === entityId) rolling += toNum(at.amount);
      if (at.creditAccountId === entityId) rolling -= toNum(at.amount);
    });
    if (type === 'customer') {
      sales.filter(s => s.customerId === entityId).forEach(s => {
        rolling += toNum(s.total);
        rolling -= toNum(s.amountPaid);
      });
    }
    if (type === 'supplier') {
      purchases.filter(p => p.supplierId === entityId).forEach(p => {
        rolling += toNum(p.total);
        rolling -= toNum(p.amountPaid);
      });
    }
    return type === 'supplier' ? (rolling * -1) : rolling;
  }, [accountTransactions, sales, purchases]);

  const refreshData = async () => await loadData();

  // ✅ addSale — instantly updates stock in UI then refreshes all data
  const addSale = async (s: any) => {
    const result = await salesApi.create({ ...s, soldBy: userName });
    
    // ✅ Instantly update product stocks in UI without waiting for full refresh
    if (result.updatedProducts && result.updatedProducts.length > 0) {
      const updatedProds = mapId(result.updatedProducts);
      setProducts(prev => prev.map(p => {
        const updated = updatedProds.find(
          (u: any) => u.id.toString() === p.id.toString()
        );
        return updated ? { ...p, stock: updated.stock } : p;
      }));
    }

    // ✅ Add sale to sales list instantly with proper id mapping
    if (result.sale) {
      const mappedSale = mapId(result.sale);
      setSales(prev => [...prev, {
        ...mappedSale,
        total: parseFloat(String(mappedSale.total)) || 0,
        subtotal: parseFloat(String(mappedSale.subtotal)) || 0,
        amountPaid: parseFloat(String(mappedSale.amountPaid)) || 0,
        balance: parseFloat(String(mappedSale.balance)) || 0,
        discount: parseFloat(String(mappedSale.discount)) || 0,
      }]);
    }

    // ✅ Full refresh to sync everything
    await refreshData();
  };

  // ✅ addPurchase — updates stock when new stock is added
  const addPurchase = async (p: any) => {
    const result = await purchasesApi.create(p);
    
    // ✅ If backend returns updated products, update instantly
    if (result.updatedProducts && result.updatedProducts.length > 0) {
      const updatedProds = mapId(result.updatedProducts);
      setProducts(prev => prev.map(prod => {
        const updated = updatedProds.find(
          (u: any) => u.id.toString() === prod.id.toString()
        );
        return updated ? { ...prod, stock: updated.stock } : prod;
      }));
    }

    await refreshData();
  };

  const returnSale = async (id: string) => {
    await salesApi.returnSale(id);
    await refreshData();
  };

  const returnPurchase = async (id: string) => {
    await purchasesApi.returnPurchase(id);
    await refreshData();
  };

  const addBank = async (bank: any) => { const res = await banksApi.create({ ...bank, type: "bank", category: "Assets" }); await refreshData(); return res; };
  const updateBank = async (id: string, updates: any) => { const res = await banksApi.update(id, updates); await refreshData(); return res; };
  const deleteBank = async (id: string) => { await banksApi.delete(id); await refreshData(); };
  const depositToBank = async (id: string, amt: number, desc?: string) => { await banksApi.deposit(id, amt, desc); await refreshData(); };
  const withdrawFromBank = async (id: string, amt: number, desc?: string) => { await banksApi.withdraw(id, amt, desc); await refreshData(); };
  const addAccountTransaction = async (t: any) => { await accountTransactionsAPI.create(t); await refreshData(); };
  const addAccount = async (a: any) => { await accountsAPI.create(a); await refreshData(); };

  const cashAccountCreatedRef = useRef(false);
  useEffect(() => {
    if (cashAccountCreatedRef.current) return;
    const hasCash = accounts.some(acc => acc.type === 'cash' && acc.name?.toLowerCase() === 'cash');
    if (!hasCash) {
      cashAccountCreatedRef.current = true;
      addAccount({
        name: 'Cash',
        type: 'cash',
        category: 'Assets',
        balance: 0,
        description: 'Default cash account for POS sales',
      }).catch(() => {
        cashAccountCreatedRef.current = false;
      });
    } else {
      cashAccountCreatedRef.current = true;
    }
  }, [accounts.length, addAccount]);
  const updateAccount = async (id: string, u: any) => { await accountsAPI.update(id, u); await refreshData(); };
  const deleteAccount = async (id: string) => { await accountsAPI.delete(id); await refreshData(); };
  const deleteAccountTransaction = async (id: string) => { await accountTransactionsAPI.delete(id); await refreshData(); };
  const getTrialBalance = async () => await trialBalanceAPI.get();
  const addPayment = async (cId: string, amt: number, desc: string) => { await ledgerApi.paymentMethod(cId, amt, desc); await refreshData(); };
  const addSupplierPayment = async (sId: string, amt: number, desc: string) => { await ledgerApi.supplierPayment(sId, amt, desc); await refreshData(); };
  const addProduct = async (p: any) => { await productsAPI.create(p); await refreshData(); };
  const updateProduct = async (id: string, p: any) => { await productsAPI.update(id, p); await refreshData(); };
  const deleteProduct = async (id: string) => { await productsAPI.delete(id); await refreshData(); };
  const addCustomer = async (c: any) => { await customerApi.create(c); await refreshData(); };
  const updateCustomer = async (id: string, c: any) => { await customerApi.update(id, c); await refreshData(); };
  const deleteCustomer = async (id: string) => { await customerApi.delete(id); await refreshData(); };
  const addSupplier = async (s: any) => { await suppliersApi.create(s); await refreshData(); };
  const updateSupplier = async (id: string, s: any) => { await suppliersApi.update(id, s); await refreshData(); };
  const deleteSupplier = async (id: string) => { await suppliersApi.delete(id); await refreshData(); };
  const signOut = async () => { try { await authApi.signout(); onSignOut(); } catch (e) { onSignOut(); } };

  return (
    <AppContext.Provider value={{
      shop, userName, userEmail, products, customers, sales, ledgerEntries, 
      suppliers, purchases, accounts, accountTransactions, loading, getLiveBalance,
      settings, updateSettings,
      returnSale,
      returnPurchase,
      addProduct, updateProduct, deleteProduct, 
      addCustomer, updateCustomer, deleteCustomer, 
      addSale,
      addLedgerEntry: async (e: any) => { await ledgerApi.addEntry(e); await refreshData(); },
      addPayment, addSupplier, updateSupplier, deleteSupplier, 
      addPurchase, addSupplierPayment, addAccount, updateAccount, deleteAccount, 
      addAccountTransaction, deleteAccountTransaction, 
      addBank, updateBank, deleteBank, depositToBank, withdrawFromBank, 
      getTrialBalance, refreshData, signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};