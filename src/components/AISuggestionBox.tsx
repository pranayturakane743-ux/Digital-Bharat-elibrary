import React, { useState, useEffect } from 'react';
import { Book, AISuggestion } from '../types';
import { Sparkles, BrainCircuit, CornerDownRight, RefreshCw, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AISuggestionBoxProps {
  books: Book[];
  activeBookIds: string[];
  preferredCategory: string;
  onSelectRecommendedBook: (bookId: string) => void;
  customAIQuery: string;
}

export function AISuggestionBox({
  books,
  activeBookIds,
  preferredCategory,
  onSelectRecommendedBook,
  customAIQuery,
}: AISuggestionBoxProps) {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (customQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: customQuery || null,
          activeHistoryIds: activeBookIds,
          preferredCategory: preferredCategory,
        }),
      });

      if (!response.ok) throw new Error('API latency timeout.');
      const data = await response.json();
      setSuggestion(data);
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to online AI core. Activating local literary ledger.');
      // Local client fallback so the AI Co-Scholar works anyway!
      const fallbackRecommendations = books
        .filter(b => b.category === preferredCategory || preferredCategory === "All" || !preferredCategory)
        .slice(0, 3)
        .map(b => b.id);
      const finalFallbacks = fallbackRecommendations.length > 0 ? fallbackRecommendations : books.slice(0, 3).map(b => b.id);
      setSuggestion({
        reasons: [
          `AI Co-Scholar local synthesis index is active (offline backup mode).`,
          `Synthesizing reading patterns for chosen genre block: "${preferredCategory || 'all genres'}".`,
          `Identified ${finalFallbacks.length} Indian literary masterpieces matching your scholar record.`
        ],
        recommendedBookIds: finalFallbacks
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger when customized queries get chosen from recommendations tags
  useEffect(() => {
    if (customAIQuery) {
      setCustomPrompt(customAIQuery);
      fetchRecommendations(customAIQuery);
    } else {
      fetchRecommendations();
    }
  }, [customAIQuery, preferredCategory]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    fetchRecommendations(customPrompt);
  };

  return (
    <div className="w-full rounded-3xl border border-stone-800/80 bg-stone-900/40 p-5 mt-6 shadow-xl relative overflow-hidden font-sans select-none text-stone-200 backdrop-blur-xl">
      
      {/* Decorative subtle gold line at top */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#dfbd69]/60 to-transparent" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header section */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse text-[#dfbd69]" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold font-mono tracking-widest text-[#dfbd69] uppercase">AI Co-Scholar</h3>
            <h2 className="text-sm font-bold text-stone-200 tracking-tight mt-0.5">Personalized Literary Recommendation Stream</h2>
          </div>
        </div>
        
        <button
          onClick={() => fetchRecommendations(customPrompt)}
          disabled={loading}
          className="p-1 px-2.5 text-[10px] font-mono rounded-lg bg-stone-950 border border-stone-800 text-stone-400 hover:text-[#dfbd69] hover:border-[#dfbd69]/40 flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Sync Analysis
        </button>
      </div>

      {/* Error state fallback feedback (clean subtle strip if there is one, but we still render backup suggestions) */}
      {error && (
        <div className="mb-3 p-2 px-3 rounded-xl bg-amber-950/15 border border-amber-500/15 text-[10px] font-mono text-[#dfbd69] flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-bounce" />
          <span>{error}</span>
        </div>
      )}

      {/* Main AI Body */}
      {loading ? (
        <div className="h-44 flex flex-col items-center justify-center text-center text-stone-400 py-6">
          <div className="w-8 h-8 rounded-full border-2 border-[#dfbd69] border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-mono tracking-wider text-amber-200/95">Synthesizing fine-grid Indian literature recommendations...</p>
          <p className="text-[10px] text-stone-500 mt-1 font-serif italic">Calling Gemini-3.5-Flash co-scholar node</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* List of custom bullet recommendations reasonings */}
          {suggestion && (
            <div className="space-y-3.5">
              <div className="flex flex-col gap-2 bg-amber-950/10 p-4 rounded-2xl border border-amber-500/10">
                <span className="text-[9px] font-mono tracking-widest text-[#dfbd69] uppercase font-black">CURATOR INSIGHTS & THEMATIC CONNECTIONS:</span>
                <div className="space-y-2 mt-1">
                  {suggestion.reasons.map((reason, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed text-stone-300">
                      <CornerDownRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p>{reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid representation of newly highlighted books */}
              <div>
                <span className="text-[9px] font-mono tracking-widest text-[#dfbd69]/65 uppercase font-black font-semibold">CURATED PATHWAY RECOMMENDATIONS:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-2.5">
                  {books
                    .filter(b => suggestion.recommendedBookIds.includes(b.id))
                    .map((b) => (
                      <div
                        key={b.id}
                        onClick={() => onSelectRecommendedBook(b.id)}
                        className={`p-3 rounded-2xl border flex items-center gap-3 bg-[#0d0c0a] cursor-pointer border-stone-800/80 hover:border-[#dfbd69]/40 hover:bg-[#14120f] hover:shadow-[0_4px_16px_rgba(223,189,105,0.08)] transition-all duration-300`}
                      >
                        {/* Cover image or Gradient spine */}
                        {b.coverImage ? (
                          <img src={b.coverImage} className="w-9 h-12 rounded shadow-[0_4px_12px_rgba(0,0,0,0.4)] shrink-0 object-cover" />
                        ) : (
                          <div className={`w-9 h-12 rounded bg-gradient-to-tr ${b.coverGradient} shadow-[0_4px_12px_rgba(0,0,0,0.4)] shrink-0`} />
                        )}
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-stone-100 leading-tight truncate hover:text-[#dfbd69] transition-colors">{b.title}</h4>
                          <span className="text-[10px] text-stone-400 font-mono mt-0.5 block truncate">by {b.author}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono inline-block mt-1 font-semibold scale-90 origin-left">
                            {b.category}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* AI prompt conversational input forms */}
          <form onSubmit={handleCustomSubmit} className="mt-4 pt-3 border-t border-stone-800/80">
            <div className="radiant-input-wrapper relative flex items-center bg-stone-900/90 rounded-2xl p-1.5 pl-3 transition-all duration-300 shadow shadow-amber-500/5 group hover:shadow-lg hover:shadow-amber-500/10">
              <div className="radiant-input-border rounded-2xl" />
              <input
                type="text"
                placeholder="Ask Co-Scholar..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full relative z-10 text-xs bg-transparent border-none px-2 py-1.5 text-stone-200 font-sans focus:outline-none font-medium placeholder-stone-500"
              />
              <button
                type="submit"
                disabled={!customPrompt.trim() || loading}
                className="relative z-10 flex items-center justify-center shrink-0 w-8 h-8 rounded-xl text-xs font-bold bg-[#dfbd69] hover:bg-[#d4af37] text-stone-950 hover:shadow-[0_2px_10px_rgba(223,189,105,0.25)] transition-all duration-300 cursor-pointer font-mono uppercase disabled:opacity-50 disabled:cursor-not-allowed ml-2"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </form>

        </div>
      )}

    </div>
  );
}
