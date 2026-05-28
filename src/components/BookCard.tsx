import React, { useState } from 'react';
import { Book, Review } from '../types';
import { Star, Shield, HelpCircle, Heart, Check, X, Calendar, User, Eye, Plus, Send, BookOpen, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookCardProps {
  key?: string;
  book: Book;
  onIssue: (bookId: string) => void;
  onAddToWishlist: (book: Book) => void;
  isWishlisted: boolean;
  onViewDetails: (book: Book) => void;
  onSubmitReview: (bookId: string, author: string, rating: number, comment: string) => void;
  userName: string;
}

export function BookCard({
  book,
  onIssue,
  onAddToWishlist,
  isWishlisted,
  onViewDetails,
  onSubmitReview,
  userName,
}: BookCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [imageError, setImageError] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const renderBookQrMatrix = (bookId: string) => {
    const hash = bookId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rows = 12;
    const cols = 12;
    const cells = [];
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Draw corner visual indicators for real-like barcode scanner alignment
        const isCornerMarker = 
          (r < 4 && c < 4) || 
          (r < 4 && c >= cols - 4) || 
          (r >= rows - 4 && c < 4);
        
        const filled = isCornerMarker 
          ? (r === 0 || r === 3 || c === 0 || c === 3 || (r === 2 && c === 2) || (r === 1 && c === 1)) 
          : (hash * (r + 1) * (c + 2)) % 3 === 0 || (hash + r + c) % 5 === 0;

        cells.push(
          <div
            key={`${r}-${c}`}
            className={`w-2.5 h-2.5 rounded-[1px] transition-all duration-300 ${
              filled ? 'bg-amber-500 shadow-[0_1px_4px_rgba(245,158,11,0.4)]' : 'bg-transparent'
            }`}
          />
        );
      }
    }

    return (
      <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex flex-col items-center gap-2 mx-auto w-max my-3 select-none">
        <div className="grid grid-cols-12 gap-[1px] bg-white p-2.5 rounded-lg border border-amber-500/20 shadow-sm">
          {cells}
        </div>
        <span className="text-[9px] font-mono tracking-widest text-[#dfbd69] uppercase mt-1 font-extrabold text-center">
          BOOK_QR_{bookId.toUpperCase()}
        </span>
      </div>
    );
  };

  // Mouse tilt tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    
    // Limit rotation to 18 degrees max
    setRotateX(-y / (box.height / 36));
    setRotateY(x / (box.width / 36));
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const submitReviewLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onSubmitReview(book.id, userName || 'Student Scholar', rating, comment);
    setComment('');
    setShowReviewInput(false);
  };

  return (
    <div className="perspective-[1000px] w-full min-h-[460px] relative font-sans select-none">
      <motion.div
        id={`card-${book.id}`}
        className="w-full h-full duration-500 transform-style-3d relative cursor-pointer"
        style={{
          transform: isFlipped 
            ? 'rotateY(180deg)' 
            : `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* --- FRONT OF THE CARD --- */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-stone-800 bg-stone-900/60 backdrop-blur-xl p-4 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(245,158,11,0.22)] hover:border-amber-500/35 transition-all duration-300 text-stone-100">
          
          {/* Futuristic Ribbon & Actions */}
          <div className="flex justify-between items-center mb-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono tracking-wider font-semibold uppercase ${
              book.available 
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.05)]' 
                : 'bg-stone-800/80 text-stone-500 border border-stone-700/50'
            }`}>
              {book.available ? `AVAILABLE: ${book.count}` : 'OUT OF STOCK'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                id={`wishlist-${book.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToWishlist(book);
                }}
                className={`p-2 rounded-lg border transition-all duration-200 ${
                  isWishlisted 
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-500 hover:bg-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
                title={isWishlisted ? "Remove from Quantum Wishlist" : "Pin to Quantum Wishlist"}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(true);
                }}
                className="p-2 rounded-lg bg-stone-900 border-stone-800 text-amber-450 hover:text-amber-400 hover:bg-stone-800 transition-all duration-200"
                title="Reviews & Critique Spine"
              >
                <Star className="w-4 h-4 fill-amber-500/10 text-amber-500" />
              </button>
            </div>
          </div>

          {/* Hologram Book Cover Block - Prominent Display */}
          <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4 group/cover border border-blue-500/30 shadow-inner">
            {book.coverImage && !imageError ? (
              <img
                src={book.coverImage}
                alt={book.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-105"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-tr ${book.coverGradient} opacity-90 transition-transform duration-500 group-hover/cover:scale-110 flex items-center justify-center`}>
                <BookOpen className="w-12 h-12 text-white/40" />
              </div>
            )}
            
            {/* Cyber Grid Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.1),rgba(0,0,0,0.6))] mix-blend-overlay" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            {/* Title printed on Spine Cover */}
            <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
              <span className="text-[10px] uppercase font-mono tracking-widest text-yellow-200 opacity-90">{book.category}</span>
              <h3 className="text-base font-bold font-sans line-clamp-2 leading-tight drop-shadow-md text-white/95 mt-1">{book.title}</h3>
              <p className="text-xs font-mono text-white/70 mt-1">by {book.author}</p>
            </div>

            {/* Glowing Scan Bar Loop */}
            <div className="absolute left-0 right-0 h-0.5 bg-[#dfbd69] shadow-[0_0_10px_#dfbd69] opacity-0 group-hover/cover:opacity-100 top-0 group-hover/cover:animate-bounce pointer-events-none" style={{ animationDuration: '3s' }} />
          </div>

          {/* Book Ratings & Context Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-semibold font-mono text-stone-200">{book.rating}</span>
                <span className="text-[11px] text-stone-400 font-mono">({book.reviews?.length || 0} reviews)</span>
              </div>
              <p className="text-xs text-stone-300 line-clamp-3 leading-relaxed mt-1 font-sans">
                {book.description}
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono mt-3 border-t border-stone-800/60 pt-2">
              <span>EST. YEAR: {book.year}</span>
              <span>•</span>
              <span>{book.pages} PGS</span>
            </div>
          </div>

          {/* Dynamic Bottom Controls */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
            <button
              id={`details-${book.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(book);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/25 hover:border-amber-500/40 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Details
            </button>

            {book.available ? (
              <button
                id={`issue-${book.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onIssue(book.id);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-stone-950 bg-gradient-to-r from-[#dfbd69] via-[#d4af37] to-[#aa7c11] hover:shadow-[0_0_15px_rgba(212,175,55,0.45)] hover:brightness-105 border border-transparent transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Issue Book
              </button>
            ) : (
              <button
                disabled
                className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-500 bg-stone-900 border border-stone-800 cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Checked Out
              </button>
            )}
          </div>
        </div>        {/* --- BACK OF THE CARD (REVIEWS PORT, RATING, & SPINE QR) --- */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotateY-180 rounded-2xl border border-stone-800 bg-stone-950/95 backdrop-blur-xl p-4 flex flex-col justify-between shadow-2xl text-stone-200">
          <div className="flex justify-between items-center border-b border-stone-850 pb-2">
            <h4 className="text-xs font-bold font-mono tracking-wider text-amber-400 uppercase">Spine Diagnostics</h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
              }}
              className="text-xs font-mono text-stone-400 hover:text-amber-300 transition-colors duration-150 px-2 py-0.5 rounded-lg hover:bg-stone-900"
            >
              Back to Cover
            </button>
          </div>

          {/* Tab Submenu */}
          <div className="flex gap-2.5 my-2 border-b border-stone-900 pb-1.5 shrink-0 select-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQrCode(false);
              }}
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors cursor-pointer ${
                !showQrCode 
                  ? 'bg-amber-500/15 border border-amber-500/35 text-amber-400 font-bold' 
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Reviews ({book.reviews?.length || 0})
            </button>
            <button
              id={`book-qr-tab-${book.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQrCode(true);
              }}
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors cursor-pointer ${
                showQrCode 
                  ? 'bg-amber-500/15 border border-amber-500/35 text-amber-400 font-bold' 
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Spine QR code
            </button>
          </div>

          {!showQrCode ? (
            <>
              {/* Scrollable Reviews List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-amber-500/10 scrollbar-track-transparent">
                {(!book.reviews || book.reviews.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 py-6">
                    <HelpCircle className="w-6 h-6 text-stone-600 mb-2" />
                    <p className="text-xs font-mono">No telemetry feedback submitted yet.</p>
                    <p className="text-[10px] text-stone-500 mt-1">Be the first critic below.</p>
                  </div>
                ) : (
                  book.reviews.map((rev) => (
                    <div key={rev.id} className="p-2 rounded-lg bg-stone-900 border border-stone-800/80">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-semibold text-stone-300 flex items-center gap-1">
                          <User className="w-3 h-3 text-amber-500" /> {rev.userName}
                        </span>
                        <span className="text-[9px] text-stone-500 font-mono">{rev.date}</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2.5 h-2.5 ${i < rev.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-700'}`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-stone-300 leading-normal font-sans italic">"{rev.comment}"</p>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Review Input Toggle form */}
              <div className="border-t border-stone-800/80 pt-2 mt-2 shrink-0">
                {!showReviewInput ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReviewInput(true);
                    }}
                    className="w-full py-1.5 rounded-lg text-[10px] font-mono tracking-widest bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 uppercase transition-all duration-150 cursor-pointer"
                  >
                    + Write Scholar Feedback
                  </button>
                ) : (
                  <form onSubmit={submitReviewLocal} onClick={(e) => e.stopPropagation()} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-stone-400">Score Out of 5:</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setRating(val)}
                            className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition-all duration-150 cursor-pointer ${
                              rating === val 
                                ? 'bg-amber-500 text-stone-950 shadow-[0_2px_6px_rgba(245,158,11,0.35)]' 
                                : 'bg-stone-900 border border-stone-800 text-stone-400 hover:bg-stone-800'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter review logic..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full text-xs bg-stone-900 border border-stone-800 px-2.5 py-1.5 pr-8 rounded-lg text-stone-200 font-sans focus:outline-none focus:border-amber-500"
                        maxLength={160}
                        required
                      />
                      <button
                        type="submit"
                        className="absolute right-1 top-1 p-1 rounded-md text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowReviewInput(false)}
                      className="w-full py-1 text-[9px] text-stone-500 font-mono hover:text-stone-300"
                    >
                      Cancel Edit
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center py-2 text-center select-none" onClick={(e) => e.stopPropagation()}>
              <p className="text-[11px] font-mono text-stone-400 uppercase tracking-widest mb-1 font-bold">Desk Verification Passport</p>
              <p className="text-[9px] font-mono text-amber-500/70 uppercase mb-3">Barcode scan active inside admin terminal</p>
              {renderBookQrMatrix(book.id)}
              <div className="text-[10px] text-stone-505 font-mono max-w-xs mt-3 leading-relaxed">
                Present this virtual ticket to any e-Library supervisor desk barcode scanner to settle returns or register audits.
              </div>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
