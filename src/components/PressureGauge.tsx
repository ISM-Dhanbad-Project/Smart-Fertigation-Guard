import React from 'react';

interface PressureGaugeProps {
  pressure: number; // in kPa or bar
  riskLevel: 'GREEN' | 'AMBER' | 'RED';
}

export function PressureGauge({ pressure, riskLevel }: PressureGaugeProps) {
  // Normalize pressure to an angle between -90 and 90 degrees
  // Let's assume max pressure is 600 kPa
  const MAX_PRESSURE = 600;
  const clamped = Math.max(0, Math.min(pressure, MAX_PRESSURE));
  const angle = (clamped / MAX_PRESSURE) * 180 - 90;

  let needleColor = '#15B79E';
  if (riskLevel === 'AMBER') needleColor = '#DC6803';
  if (riskLevel === 'RED') needleColor = '#D92D20';

  return (
    <div className="relative w-full max-w-xs mx-auto aspect-[2/1] overflow-hidden">
      {/* Gauge Background (Semi-Circle) */}
      <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
        {/* Track */}
        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="#EAE6E1" strokeWidth="20" strokeLinecap="round" />
        {/* Sections */}
        <path d="M 10 100 A 90 90 0 0 1 70 30" fill="none" stroke="#15B79E" strokeWidth="20" strokeLinecap="butt" />
        <path d="M 70 30 A 90 90 0 0 1 130 30" fill="none" stroke="#DC6803" strokeWidth="20" strokeLinecap="butt" />
        <path d="M 130 30 A 90 90 0 0 1 190 100" fill="none" stroke="#D92D20" strokeWidth="20" strokeLinecap="butt" />

        {/* Needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: 'transform 0.5s ease-out' }}>
          <polygon points="96,100 104,100 100,20" fill={needleColor} />
          <circle cx="100" cy="100" r="8" fill={needleColor} />
          <circle cx="100" cy="100" r="4" fill="#1A1A1A" />
        </g>
      </svg>
      <div className="absolute bottom-0 left-0 w-full text-center pb-2">
        <span className="font-display text-4xl font-bold text-ink">{pressure.toFixed(1)}</span>
        <span className="font-display text-lg text-ink/70 ml-1">kPa</span>
      </div>
    </div>
  );
}
