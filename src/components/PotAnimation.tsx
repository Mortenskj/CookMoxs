import React from 'react';

export function PotAnimation() {
  return (
    <div className="relative w-16 h-16 mx-auto">
      {/* Pot */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-8 bg-forest-dark dark:bg-white/90 rounded-b-xl rounded-t border-t-2 border-forest-mid dark:border-white/50 shadow-lg overflow-hidden">
        {/* Bubbles */}
        <div className="absolute bottom-1 left-2 w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="absolute bottom-2 left-5 w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        <div className="absolute bottom-0.5 left-8 w-1 h-1 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
      </div>
      
      {/* Pot Handles */}
      <div className="absolute bottom-4 left-0.5 w-2 h-3 border-2 border-forest-dark dark:border-white/90 rounded-l-full" />
      <div className="absolute bottom-4 right-0.5 w-2 h-3 border-2 border-forest-dark dark:border-white/90 rounded-r-full" />
      
      {/* Spoon */}
      <div className="absolute top-2 left-1/2 w-1 h-10 bg-wood-mid dark:bg-wood-light rounded-full origin-bottom animate-[spin_2s_linear_infinite]" style={{ transformOrigin: '50% 80%' }}>
        <div className="absolute -bottom-1 -left-1 w-3 h-4 bg-wood-mid dark:bg-wood-light rounded-full" />
      </div>

      {/* Steam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-2">
        <div className="w-0.5 h-4 bg-forest-mid/20 dark:bg-white/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0ms' }} />
        <div className="w-0.5 h-5 bg-forest-mid/20 dark:bg-white/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '500ms' }} />
        <div className="w-0.5 h-3 bg-forest-mid/20 dark:bg-white/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1000ms' }} />
      </div>
    </div>
  );
}
