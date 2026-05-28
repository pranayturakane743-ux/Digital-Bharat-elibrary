import React, { useRef } from 'react';
import { CATEGORIES } from '../data';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';

interface CategoriesSliderProps {
  selectedCategory: string;
  onSelectCategory: (name: string) => void;
}

export function CategoriesSlider({ selectedCategory, onSelectCategory }: CategoriesSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to resolve string to dynamic Lucide component safely
  const renderIcon = (iconName: string) => {
    // Falls back to BookOpen if any typo
    const IconComponent = (Icons as any)[iconName] || Icons.BookOpen;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="w-full relative py-6 select-none font-sans">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-[11px] font-bold font-mono tracking-widest text-[#dfbd69] uppercase bg-amber-950/20 px-2 py-0.5 rounded w-max">EXPLORE ARCHIVE</h3>
          <h2 className="text-2xl font-bold text-stone-100 tracking-tight mt-2 font-sans">Browse Vault Sectors</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              if (containerRef.current) {
                containerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
              }
            }}
            className="p-1 px-2.5 rounded-lg border border-stone-800 bg-stone-900/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors shadow-sm cursor-pointer"
          >
            ←
          </button>
          <button
            onClick={() => {
              if (containerRef.current) {
                containerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
              }
            }}
            className="p-1 px-2.5 rounded-lg border border-stone-800 bg-stone-900/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors shadow-sm cursor-pointer"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        id="categories-slider"
        className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-amber-500/10 scrollbar-track-transparent scroll-smooth mask-linear"
      >
        {/* --- DYNAMIC ALL CATEGORY TICKET --- */}
        <div className="snap-start shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            id="category-all"
            onClick={() => onSelectCategory('All')}
            className={`cursor-pointer px-5 py-4 rounded-xl border flex flex-col justify-between items-start w-36 h-28 text-left transition-all duration-300 relative overflow-hidden ${
              selectedCategory === 'All'
                ? 'bg-gradient-to-br from-amber-500/15 to-yellow-500/20 border-amber-500/80 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-stone-950/80 border-stone-800 text-stone-450 hover:text-stone-200 hover:border-stone-700 hover:bg-stone-900/50'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <Icons.Grid className={`w-5 h-5 ${selectedCategory === 'All' ? 'text-amber-500' : 'text-stone-500'}`} />
              <span className="text-[10px] font-mono opacity-60">CAT</span>
            </div>
            <div>
              <span className="text-xs font-mono block leading-none">ALL</span>
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">Catalog Feed</span>
            </div>
            {selectedCategory === 'All' && (
              <div className="absolute right-0 bottom-0 w-8 h-8 bg-amber-500/15 rounded-tl-full blur-sm" />
            )}
          </motion.button>
        </div>

        {/* --- GRID MAPPINGS --- */}
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <div key={cat.id} className="snap-start shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                id={`category-${cat.id}`}
                onClick={() => onSelectCategory(cat.name)}
                className={`cursor-pointer px-5 py-4 rounded-xl border flex flex-col justify-between items-start w-36 h-28 text-left transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? `bg-gradient-to-br from-amber-500/15 to-yellow-500/20 border-amber-500/80 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]`
                    : 'bg-stone-950/80 border-stone-800 text-stone-450 hover:text-stone-200 hover:border-stone-700 hover:bg-stone-900/50'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <div className={`${isActive ? 'text-amber-500' : 'text-stone-500'}`}>
                    {renderIcon(cat.iconName)}
                  </div>
                  <span className="text-[10px] font-mono opacity-60">QTY: {cat.count}</span>
                </div>
                <div>
                  <span className="text-xs font-mono block leading-none truncate w-full">{cat.name}</span>
                  <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">Portal Sector</span>
                </div>
                {isActive && (
                  <div className="absolute right-0 bottom-0 w-8 h-8 bg-amber-500/15 rounded-tl-full blur-sm" />
                )}
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
