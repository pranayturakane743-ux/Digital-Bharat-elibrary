import React from 'react';
import { CATEGORIES } from '../data';
import { LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

interface LeftNavCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (name: string) => void;
}

export const LeftNavCategories = ({ selectedCategory, onSelectCategory }: LeftNavCategoriesProps) => {
  return (
    <div className="flex flex-col gap-1 mt-4">
      <div className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#dfbd69]/80 font-bold font-mono">Book Categories</div>
      <button
        onClick={() => onSelectCategory('All')}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer text-left ${
          selectedCategory === 'All'
            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">All Books</span>
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat.name)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer text-left ${
            selectedCategory === cat.name
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider">{cat.name}</span>
        </button>
      ))}
    </div>
  );
};
