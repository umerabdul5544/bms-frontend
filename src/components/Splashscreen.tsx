import React, { useEffect, useState } from 'react';
import { Store } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const intervalTime = 20;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      setProgress((currentStep / steps) * 100);

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(onFinish, 200);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 flex flex-col items-center justify-center z-[100]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-750"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 mb-8 shadow-2xl">
          <Store className="text-white w-20 h-20" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">System Initialization</h1>
        <p className="text-blue-200 font-medium tracking-wide text-sm mb-12 uppercase">BMS Management Software v2.0</p>
        
        <div className="w-64 max-w-xs relative">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="absolute -bottom-6 w-full text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300/80">
              {progress < 30 ? 'Loading core modules...' : progress < 70 ? 'Syncing local database...' : 'Almost ready...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
