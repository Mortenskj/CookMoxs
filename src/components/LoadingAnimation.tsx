import React, { useState, useEffect } from 'react';

export function LoadingAnimation() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Slow down as it gets closer to 99
        const increment = prev < 50 ? 5 : prev < 80 ? 2 : prev < 95 ? 1 : 0.2;
        const next = prev + increment;
        return next > 99 ? 99 : next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="relative w-32 h-32">
        {/* Pot */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-16 bg-forest-dark dark:bg-white/90 rounded-b-3xl rounded-t-lg border-t-4 border-forest-mid dark:border-white/50 shadow-lg overflow-hidden">
          {/* Bubbles */}
          <div className="absolute bottom-2 left-4 w-3 h-3 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="absolute bottom-4 left-10 w-4 h-4 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          <div className="absolute bottom-1 left-16 w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
        </div>
        
        {/* Pot Handles */}
        <div className="absolute bottom-8 left-1 w-4 h-6 border-4 border-forest-dark dark:border-white/90 rounded-l-full" />
        <div className="absolute bottom-8 right-1 w-4 h-6 border-4 border-forest-dark dark:border-white/90 rounded-r-full" />
        
        {/* Spoon */}
        <div className="absolute top-4 left-1/2 w-2 h-20 bg-wood-mid dark:bg-wood-light rounded-full origin-bottom animate-[spin_2s_linear_infinite]" style={{ transformOrigin: '50% 80%' }}>
          <div className="absolute -bottom-2 -left-2 w-6 h-8 bg-wood-mid dark:bg-wood-light rounded-full" />
        </div>

        {/* Steam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-4">
          <div className="w-1 h-8 bg-forest-mid/20 dark:bg-white/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-10 bg-forest-mid/20 dark:bg-white/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '500ms' }} />
          <div className="w-1 h-6 bg-forest-mid/20 dark:bg-white/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1000ms' }} />
        </div>
      </div>

      <div className="flex flex-col items-center">
        <p className="text-forest-dark dark:text-white font-serif italic text-lg mb-2">
          Analyserer opskrift...
        </p>
        <div className="text-2xl font-mono font-bold text-forest-mid dark:text-white/70">
          {Math.floor(progress)}%
        </div>
      </div>
    </div>
  );
}
