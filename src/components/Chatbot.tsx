import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, MessageSquare, Moon, Sun } from 'lucide-react';
import { useApp } from './AppContext';
import { chatbotApi } from '../utils/api';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export const Chatbot: React.FC = React.memo(() => {
  const { settings, updateSettings, products, sales, customers } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { role: 'model', parts: [{ text: "Hello sir/mam how may I help you" }] }
      ]);
    }
  }, [isOpen]);

  // ... (baaqi imports same hain)

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: trimmedInput }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build business context for first message
      const now = new Date();
      const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const todaySales = sales.filter(s => String(s.date).split('T')[0] === todayLocalStr);
      const todayRevenue = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const lowStock = products.filter(p => p.minStock > 0 && p.stock <= p.minStock);

      const businessContext = messages.length === 0
        ? `Shop: ${settings.bakeryName}. Today: ${todaySales.length} sales, RS.${todayRevenue.toLocaleString()} revenue. Total products: ${products.length}. Low stock: ${lowStock.length > 0 ? lowStock.map(p => `${p.name}(${p.stock})`).join(', ') : 'none'}. Total customers: ${customers.length}.`
        : undefined;

      const response = await chatbotApi.query(trimmedInput, messages, businessContext);
      
      // Agar backend se specifically API key ka error aaye
      if (response.error) {
        toast.error("AI Configuration Issue", {
          description: response.error,
          duration: 5000
        });
        setMessages(prev => [...prev, { 
          role: 'model', 
          parts: [{ text: "⚠️ System setup incomplete. Please ensure the backend .env has a valid GEMINI_API_KEY." }] 
        }]);
      } else {
        const botMessage: Message = { role: 'model', parts: [{ text: response.text }] };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error: any) {
      // Agar backend hi off ho ya network issue ho
      toast.error("Connection failed", {
        description: "Please check if your Node.js server is running on port 5000."
      });
      console.error("Frontend Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

// ... (baaqi UI code same hai)

  const toggleTheme = () => {
    const newTheme = settings.themeMode === 'light' ? 'dark' : 'light';
    updateSettings({ themeMode: newTheme });
    if (newTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[320px] sm:w-[380px] h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto">
          {/* Header - Fixed Blue/Green Gradient */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white m-0">Assistant</h3>
                <div className="flex items-center gap-1.5 leading-none mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-green-100 font-semibold uppercase tracking-widest">Active</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Container */}
          <div 
            ref={scrollRef}
            className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50/30 scrollbar-thin scrollbar-thumb-gray-200"
          >
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in zoom-in-95 duration-200`}
              >
                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`mt-auto p-1.5 rounded-lg shrink-0 h-fit ${msg.role === 'user' ? 'bg-blue-50' : 'bg-green-50'}`}>
                    {msg.role === 'user' ? <User size={12} className="text-blue-600" /> : <Bot size={12} className="text-green-600" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-green-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                  }`}>
                    {msg.parts[0].text}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-green-600" />
                  <span className="text-xs text-gray-500 font-medium italic">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="relative group flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="How can I help you?"
                className="flex-grow px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 transition-all placeholder:text-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 transition-all active:scale-95 shadow-md shadow-green-200"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
              <Sparkles size={10} className="text-yellow-500" /> AI Assistant for BMS
            </p>
          </div>
        </div>
      )}

      {/* FAB and Theme Toggle Group */}
      <div className="flex flex-col gap-3 items-center pointer-events-auto">
        {/* Toggle Theme Button */}
        <button
          onClick={toggleTheme}
          className={`p-3 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center border ${
            settings.themeMode === 'dark' 
              ? 'bg-gray-800 text-yellow-400 border-gray-700 hover:bg-gray-700' 
              : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
          }`}
          title={settings.themeMode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {settings.themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group p-4 rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center relative overflow-hidden ${
            isOpen 
              ? 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-100 -rotate-90' 
              : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 active:scale-95'
          }`}
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <div className="flex items-center gap-2">
              <MessageSquare size={24} />
              {messages.length === 0 && (
                 <span className="text-sm font-bold pr-1 hidden sm:inline">Ask AI</span>
              )}
              {/* Notification Dot */}
              {!isOpen && messages.length === 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  );
});

