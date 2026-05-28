import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function TemporalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  
  const isNight = hours >= 18 || hours < 6;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  // Simple greeting logic
  let greeting = 'Good Evening';
  if (hours >= 5 && hours < 12) greeting = 'Good Morning';
  else if (hours >= 12 && hours < 18) greeting = 'Good Afternoon';

  return (
    <div className="flex items-center gap-4 bg-stone-900/60 p-2 pr-5 rounded-2xl border border-stone-800/80 shadow-lg relative overflow-hidden group">
      {/* Dynamic background glow based on time of day */}
      <div 
        className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-700 blur-xl ${
          isNight ? 'bg-indigo-500' : 'bg-amber-500'
        }`}
      />
      
      <div className="relative z-10 w-10 h-10 rounded-full bg-stone-950 flex items-center justify-center border border-stone-800/80 shadow-inner">
        {isNight ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
        
        {/* Animated seconds ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke={isNight ? 'rgba(99, 102, 241, 0.8)' : 'rgba(245, 158, 11, 0.8)'}
            strokeWidth="2"
            strokeDasharray="113"
            strokeDashoffset={113 - (113 * seconds) / 60}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear shadow-lg"
            style={{
              filter: `drop-shadow(0 0 4px ${isNight ? 'rgba(99, 102, 241, 0.5)' : 'rgba(245, 158, 11, 0.5)'})`
            }}
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col justify-center">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black font-mono tracking-tight text-white/90 drop-shadow-md">
            {displayHours.toString().padStart(2, '0')}
            <span className="animate-[pulse_1s_ease-in-out_infinite] opacity-60 mx-0.5 text-amber-500">:</span>
            {minutes.toString().padStart(2, '0')}
          </span>
          <span className="text-[10px] font-black font-mono text-amber-500/80">{period}</span>
          <span className="ml-1 text-[9px] font-bold text-stone-400/80 hidden lg:inline tracking-wider">
            | {greeting}
          </span>
        </div>
        <div className="text-[9px] font-mono tracking-[0.2em] text-[#dfbd69] uppercase font-bold mt-0.5">
          {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}
