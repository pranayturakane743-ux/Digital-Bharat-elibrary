import React, { useState, useEffect } from 'react';
import { Search, Mic, MicOff, SlidersHorizontal, X, ArrowUpRight, Sparkles, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../data';
import { Book } from '../types';

interface SmartSearchBarProps {
  onSearch: (query: string, filters: SearchFilters, selectedCategory: string) => void;
  trendingTerms: string[];
  assistantPromptSelected: (prompt: string) => void;
  value?: string;
  books: Book[];
  onViewDetails: (book: Book) => void;
}

export interface SearchFilters {
  field: 'all' | 'title' | 'author' | 'isbn';
  genre: string;
  minRating: number;
}

export function SmartSearchBar({ onSearch, trendingTerms, assistantPromptSelected, value = '', books, onViewDetails }: SmartSearchBarProps) {
  const [query, setQuery] = useState(value);
  const [showFilters, setShowFilters] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [results, setResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      setIsLoading(true);
      setTimeout(() => {
        setResults(books.filter(b => b.title.toLowerCase().includes(query.toLowerCase()) || b.author.toLowerCase().includes(query.toLowerCase())).slice(0, 5));
        setIsLoading(false);
      }, 300);
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [query, books]);
  
  // State for search filters
  const [filterField, setFilterField] = useState<'all' | 'title' | 'author' | 'isbn'>('all');
  const [filterMinRating, setFilterMinRating] = useState<number>(0);

  // Sync external value changes with internal state
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Trigger search whenever query, filters, or category change
  useEffect(() => {
    onSearch(query, {
      field: filterField,
      genre: 'all',
      minRating: filterMinRating
    }, selectedCategory);
  }, [query, filterField, filterMinRating, selectedCategory]);

  const toggleVoiceSearch = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsRecording(true);
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setQuery(text);
        setIsRecording(false);
      };

      rec.onerror = () => {
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      try {
        rec.start();
      } catch (err) {
        setIsRecording(false);
      }
    } else {
      setIsRecording(true);
      const demoPrompts = [
        "Quantum Computer Compilers design",
        "Astro-engineering with Dark Matter",
        "Advanced Hyper-Neural networks textbook"
      ];
      const randomPrompt = demoPrompts[Math.floor(Math.random() * demoPrompts.length)];
      
      let index = 0;
      setQuery('');
      const interval = setInterval(() => {
        if (index < randomPrompt.length) {
          setQuery(prev => prev + randomPrompt.charAt(index));
          index++;
        } else {
          clearInterval(interval);
          setIsRecording(false);
        }
      }, 70);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="text-amber-400 font-bold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="w-full relative py-2 font-sans select-none z-10 space-y-4">
      
      {/* Search Input Box */}
      <div className="relative w-full">
        <div className="radiant-input-wrapper relative flex items-center bg-stone-900/90 rounded-2xl p-1.5 px-3.5 transition-all duration-300 shadow shadow-amber-500/5">
          <div className="radiant-input-border rounded-xl" />
          <Search className="relative w-5 h-5 text-stone-500 shrink-0 z-10" />
          
          <input
            id="smart-search-input"
            type="text"
            placeholder="Search virtual records (Title, Author, ISBN or concept prompts)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full relative z-10 bg-transparent border-none text-sm text-stone-200 px-3 focus:outline-none placeholder-stone-500 font-sans h-10 font-medium"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="relative p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors mr-1 z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleVoiceSearch}
            className={`relative p-2 rounded-xl transition-all duration-300 mr-1 cursor-pointer z-10 ${
              isRecording 
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-stone-950 border border-stone-800 text-amber-500 hover:text-amber-400 hover:bg-stone-800'
            }`}
             title="Start AI Voice Scan"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            id="filters-toggle-btn"
            onClick={() => setShowFilters(prev => !prev)}
            className={`p-2 rounded-xl border transition-all duration-300 cursor-pointer z-10 ${
              showFilters 
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Results Dropdown */}
        {query && (isLoading || results.length > 0) && (
          <div className="absolute w-full mt-2 bg-stone-950 border border-stone-800 rounded-2xl p-2 space-y-1 z-50">
            {isLoading ? (
              <div className="p-4 space-y-2">
                <div className="h-10 bg-stone-900 rounded-xl animate-pulse" />
                <div className="h-10 bg-stone-900 rounded-xl animate-pulse" />
              </div>
            ) : (
              results.map(b => (
                <button key={b.id} onClick={() => onViewDetails(b)} className="w-full flex items-center gap-3 p-2 hover:bg-stone-800 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                  <div className="w-10 h-10 rounded bg-stone-800 overflow-hidden shrink-0">
                    {b.coverImage && <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-xs font-bold text-stone-200">{highlightMatch(b.title, query)}</div>
                    <div className="text-[10px] text-stone-400">{highlightMatch(b.author, query)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium border whitespace-nowrap transition-all ${
            selectedCategory === 'All'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
              : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium border whitespace-nowrap transition-all ${
              selectedCategory === cat.name
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Expandable Advanced Smart Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-stone-950/95 border border-stone-800 shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-3xl z-20 text-stone-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Field filter */}
              <div>
                <span className="text-[11px] font-mono tracking-widest text-[#dfbd69] uppercase font-bold">Search Filter Field</span>
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {(['all', 'title', 'author', 'isbn'] as const).map((field) => (
                    <button
                      type="button"
                      key={field}
                      onClick={() => setFilterField(field)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border uppercase transition-all cursor-pointer ${
                        filterField === field
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800'
                      }`}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min rating filter */}
              <div>
                <span className="text-[11px] font-mono tracking-widest text-[#dfbd69] uppercase font-bold">Minimum Scholar Rating</span>
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {[0, 3, 4, 4.5, 4.8].map((score) => (
                    <button
                      type="button"
                      key={score}
                      onClick={() => setFilterMinRating(score)}
                      className={`py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                        filterMinRating === score
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800'
                      }`}
                    >
                      {score === 0 ? 'All' : `★ ${score}+`}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Clear Filters footer action */}
            <div className="flex justify-end mt-4 pt-3 border-t border-stone-800/80">
              <button
                type="button"
                onClick={() => {
                  setFilterField('all');
                  setFilterMinRating(0);
                  setShowFilters(false);
                }}
                className="text-xs font-mono text-stone-500 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating suggestion prompts */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs items-center pl-1.5">
        <span className="text-stone-400 font-mono flex items-center gap-1 shrink-0 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Try AI prompts:
        </span>
        {trendingTerms.map((term, i) => (
          <button
            key={i}
            onClick={() => assistantPromptSelected(term)}
            className="text-stone-450 hover:text-amber-400 font-sans font-medium transition-colors cursor-pointer flex items-center gap-0.5 hover:underline"
          >
            "{term}" <ArrowUpRight className="w-3 h-3 text-stone-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
