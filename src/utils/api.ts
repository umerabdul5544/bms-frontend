const BASE_URL = 'http://localhost:5000/api';

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

const headers = () => ({
  'Content-Type': 'application/json',
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

// ✅ Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  register: async (data: any) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 🆕 Naya function OTP verify karne ke liye
  verifyOtp: async (email: string, otp: string) => {
    const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    return res.json();
  },

  getSession: async () => {
    const res = await fetch(`${BASE_URL}/auth/session`, {
      headers: headers(),
    });
    return res.json();
  },

  signout: async () => {
    return Promise.resolve();
  },
};

// Products API
// Products API
export const productsAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/products`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to add product');
    return json;
  },
  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update product');
    return json;
  },
  delete: async (id: string) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete product');
    return json;
  },

  // 🔥🔥🔥 UPDATED SCAN FUNCTION 🔥🔥🔥
  scanByCode: async (code: string) => {
    try {
      const res = await fetch(
        `${BASE_URL}/products/scan/${encodeURIComponent(code)}`,
        { headers: headers() }
      );

      const data = await res.json();

      // ✅ Safe response handling
      if (!res.ok) {
        return { product: null };
      }

      return data;
    } catch (error) {
      console.error('Scan API error:', error);
      return { product: null };
    }
  },
};

// ✅ Customers API
export const customerApi = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/customers`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/customers`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/customers/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`${BASE_URL}/customers/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    return res.json();
  },
};

// ✅ Sales API
export const salesApi = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/sales`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/sales`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  search: async (q: string) => {
    const res = await fetch(`${BASE_URL}/sales/search?q=${encodeURIComponent(q)}`, { headers: headers() });
    return res.json();
  },
  returnSale: async (id: string) => {
    const res = await fetch(`${BASE_URL}/sales/${id}/return`, {
      method: 'POST', headers: headers(),
    });
    return res.json();
  },
};

// ✅ Ledger API
export const ledgerApi = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/ledger`, { headers: headers() });
    return res.json();
  },
  addEntry: async (data: any) => {
    const res = await fetch(`${BASE_URL}/ledger`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  paymentMethod: async (customerId: string, amount: number, description: string) => {
    const res = await fetch(`${BASE_URL}/ledger/payment`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ customerId, amount, description }),
    });
    return res.json();
  },
  supplierPayment: async (supplierId: string, amount: number, description: string) => {
    const res = await fetch(`${BASE_URL}/ledger/supplier-payment`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ supplierId, amount, description }),
    });
    return res.json();
  },
};

// ✅ Suppliers API
export const suppliersApi = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/suppliers`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/suppliers/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`${BASE_URL}/suppliers/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    return res.json();
  },
};

// ✅ Purchases API
export const purchasesApi = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/purchases`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  search: async (q: string) => {
    const res = await fetch(`${BASE_URL}/purchases/search?q=${encodeURIComponent(q)}`, { headers: headers() });
    return res.json();
  },
  returnPurchase: async (id: string) => {
    const res = await fetch(`${BASE_URL}/purchases/${id}/return`, {
      method: 'POST', headers: headers(),
    });
    return res.json();
  },
};

// ✅ Accounts API
export const accountsAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/accounts`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/accounts`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/accounts/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`${BASE_URL}/accounts/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    return res.json();
  },
};

// ✅ Account Transactions API
export const accountTransactionsAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/account-transactions`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/account-transactions`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`${BASE_URL}/account-transactions/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    return res.json();
  },
};

// ✅ Banks API
export const banksApi = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/banks`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/banks`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/banks/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`${BASE_URL}/banks/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    return res.json();
  },
  deposit: async (id: string, amount: number, description?: string) => {
    const res = await fetch(`${BASE_URL}/banks/${id}/deposit`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ amount, description }),
    });
    return res.json();
  },
  withdraw: async (id: string, amount: number, description?: string) => {
    const res = await fetch(`${BASE_URL}/banks/${id}/withdraw`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ amount, description }),
    });
    return res.json();
  },
};

// ✅ Trial Balance API
export const trialBalanceAPI = {
  get: async () => {
    const res = await fetch(`${BASE_URL}/trial-balance`, { headers: headers() });
    return res.json();
  },
};

// ✅ Admin API
export const adminApi = {
  getPendingApprovals: async () => {
    const res = await fetch(`${BASE_URL}/admin/pending`, { headers: headers() });
    const data = await res.json();
    return { pendingRequests: data.pending || [] };
  },

  getApprovedShops: async () => {
    const res = await fetch(`${BASE_URL}/admin/approved`, { headers: headers() });
    const data = await res.json();
    return { approvedShops: data.shops || [] };
  },

  approveShop: async (id: string, approved: boolean) => {
    const res = await fetch(`${BASE_URL}/admin/shops/${id}/approve`, {
      method: 'PUT', headers: headers(),
    });
    return res.json();
  },

  rejectShop: async (id: string, reason: string) => {
    const res = await fetch(`${BASE_URL}/admin/shops/${id}/reject`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  updateShopStatus: async (id: string, status: string) => {
    const res = await fetch(`${BASE_URL}/admin/shops/${id}/status`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  extendSubscription: async (id: string, days: number) => {
    const res = await fetch(`${BASE_URL}/admin/shops/${id}/extend`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ days }),
    });
    return res.json();
  },

  getAll: async () => {
    const res = await fetch(`${BASE_URL}/admin`, { headers: headers() });
    return res.json();
  },

  getStats: async () => {
    const res = await fetch(`${BASE_URL}/admin/stats`, { headers: headers() });
    return res.json();
  },

  updateShop: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/admin/shops/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteShop: async (id: string) => {
    const res = await fetch(`${BASE_URL}/admin/shops/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    return res.json();
  },
};

// ✅ User API
export const userApi = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/users`, { headers: headers() });
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'DELETE', headers: headers(),
    });
    return res.json();
  },
};

// ✅ Chatbot API
export const chatbotApi = {
  query: async (prompt: string, history: any[] = [], businessContext?: string) => {
    const res = await fetch(`${BASE_URL}/chatbot/query`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ prompt, history, businessContext }),
    });
    return res.json();
  },
};