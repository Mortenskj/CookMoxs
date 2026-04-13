import React from 'react';

export function getTimerAnimationType(description: string): 'simmer' | 'fry' | 'oven' | 'rest' | 'generic' {
  const d = description.toLowerCase();
  if (d.includes('simr') || d.includes('kog') || d.includes('blend') || d.includes('gryde')) return 'simmer';
  if (d.includes('steg') || d.includes('brun') || d.includes('pand') || d.includes('saut')) return 'fry';
  if (d.includes('bag') || d.includes('ovn') || d.includes('rist') || d.includes('grat')) return 'oven';
  if (d.includes('hvil') || d.includes('hæv') || d.includes('køl') || d.includes('træk')) return 'rest';
  return 'generic';
}

export function TimerAnimationIcon({ type, size = 32, className = '' }: { type: 'simmer' | 'fry' | 'oven' | 'rest' | 'generic'; size?: number; className?: string }) {
  const s = size;
  if (type === 'simmer') {
    return (
      <svg viewBox="0 0 48 48" width={s} height={s} className={`cm-cook-timer-anim ${className}`}>
        <ellipse cx="24" cy="36" rx="14" ry="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <path d="M10 36 V24 Q10 18 24 18 Q38 18 38 24 V36" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="28" r="1.5" fill="currentColor" className="cm-cook-bubble cm-cook-bubble--1" />
        <circle cx="24" cy="30" r="2" fill="currentColor" className="cm-cook-bubble cm-cook-bubble--2" />
        <circle cx="30" cy="27" r="1.5" fill="currentColor" className="cm-cook-bubble cm-cook-bubble--3" />
        <path d="M18 14 Q18 10 20 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cm-cook-steam cm-cook-steam--1" opacity="0.5" />
        <path d="M24 13 Q24 9 26 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cm-cook-steam cm-cook-steam--2" opacity="0.5" />
        <path d="M30 14 Q30 10 32 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cm-cook-steam cm-cook-steam--3" opacity="0.5" />
      </svg>
    );
  }
  if (type === 'fry') {
    return (
      <svg viewBox="0 0 48 48" width={s} height={s} className={`cm-cook-timer-anim ${className}`}>
        <ellipse cx="22" cy="32" rx="12" ry="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <path d="M10 32 Q10 26 22 26 Q34 26 34 32" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M34 30 Q38 28 42 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="30" r="1" fill="currentColor" className="cm-cook-sizzle cm-cook-sizzle--1" />
        <circle cx="22" cy="29" r="1" fill="currentColor" className="cm-cook-sizzle cm-cook-sizzle--2" />
        <circle cx="28" cy="30" r="1" fill="currentColor" className="cm-cook-sizzle cm-cook-sizzle--3" />
        <path d="M18 22 Q17 18 19 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cm-cook-steam cm-cook-steam--1" opacity="0.4" />
        <path d="M26 21 Q25 17 27 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cm-cook-steam cm-cook-steam--2" opacity="0.4" />
      </svg>
    );
  }
  if (type === 'oven') {
    return (
      <svg viewBox="0 0 48 48" width={s} height={s} className={`cm-cook-timer-anim ${className}`}>
        <rect x="8" y="12" width="32" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="12" y="18" width="24" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <line x1="14" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <line x1="22" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <circle cx="24" cy="26" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" className="cm-cook-oven-glow" />
        <path d="M20 10 Q20 6 22 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cm-cook-steam cm-cook-steam--1" opacity="0.4" />
        <path d="M28 10 Q28 6 30 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cm-cook-steam cm-cook-steam--2" opacity="0.4" />
      </svg>
    );
  }
  if (type === 'rest') {
    return (
      <svg viewBox="0 0 48 48" width={s} height={s} className={`cm-cook-timer-anim ${className}`}>
        <ellipse cx="24" cy="34" rx="14" ry="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <path d="M10 34 V28 Q10 22 24 22 Q38 22 38 28 V34" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M14 22 L14 18 Q14 16 16 16 L32 16 Q34 16 34 18 L34 22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <text x="24" y="31" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold" opacity="0.5">z z</text>
      </svg>
    );
  }
  // generic
  return (
    <svg viewBox="0 0 48 48" width={s} height={s} className={`cm-cook-timer-anim ${className}`}>
      <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="24" y1="14" x2="24" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="cm-cook-clock-hand" />
      <line x1="24" y1="24" x2="30" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2" fill="currentColor" />
    </svg>
  );
}
