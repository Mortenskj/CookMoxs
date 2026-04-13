import React from 'react';

export function OvenAnimation() {
  return (
    <div className="relative w-16 h-16 mx-auto season-motion-float">
      {/* Oven Body */}
      <div className="absolute inset-0 border-4 border-forest-dark dark:border-white/80 rounded-xl overflow-hidden bg-white/10">
        {/* Oven Door Window */}
        <div className="absolute top-4 left-2 right-2 bottom-2 border-2 border-forest-dark/50 dark:border-white/50 rounded-lg bg-orange-500/20 overflow-hidden">
          {/* Glowing Heat */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-orange-500/60 to-transparent season-motion-glow" />
          {/* Baking Tray */}
          <div className="absolute bottom-2 left-2 right-2 h-1 bg-forest-dark/80 dark:bg-white/80 rounded-full" />
          {/* Steam/Heat waves */}
          <div className="absolute bottom-4 left-1/4 w-1 h-4 bg-orange-400/50 rounded-full season-motion-steam" style={{ animationDelay: '0ms' }} />
          <div className="absolute bottom-4 left-1/2 w-1 h-6 bg-orange-400/50 rounded-full season-motion-steam" style={{ animationDelay: '500ms' }} />
          <div className="absolute bottom-4 right-1/4 w-1 h-3 bg-orange-400/50 rounded-full season-motion-steam" style={{ animationDelay: '1000ms' }} />
        </div>
        {/* Oven Knobs */}
        <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-forest-dark/50 dark:bg-white/50" />
        <div className="absolute top-1 left-5 w-2 h-2 rounded-full bg-forest-dark/50 dark:bg-white/50" />
        <div className="absolute top-1 right-2 w-3 h-1 rounded-full bg-red-500/80" />
      </div>
    </div>
  );
}
