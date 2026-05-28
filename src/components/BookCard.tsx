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

  React.useEffect(() => {
    setImageError(false);
  }, [book.id, book.coverImage]);

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
    <div className="relative group w-full h-full flex flex-col items-center">
      <motion.div
        id={`card-${book.id}`}
        className="relative w-full aspect-[2/3] max-w-[260px] rounded-[18px] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.4)] group-hover:shadow-[0_25px_45px_-10px_rgba(0,0,0,0.6)] group-hover:-translate-y-2 transition-all duration-500 ease-out cursor-pointer overflow-hidden transform-style-3d border border-white/10"
        style={{
          transform: isFlipped 
            ? 'rotateY(180deg)' 
            : `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        }}
        onClick={() => onViewDetails(book)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* --- FRONT: THE ACTUAL BOOK COVER --- */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-stone-900 overflow-hidden">
          {book.coverImage && !imageError ? (
            <img
              src={book.coverImage}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover rounded-none transition-transform duration-700 ease-in-out group-hover:scale-105"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-tr ${book.coverGradient} flex flex-col p-6 shadow-inner`}>
                <span className="text-[10px] uppercase font-mono tracking-widest text-yellow-200 opacity-90">{book.category}</span>
                <h3 className="text-xl font-bold font-serif line-clamp-3 leading-tight drop-shadow-md text-white/95 mt-2">{book.title}</h3>
                <div className="flex-1" />
                <p className="text-sm font-mono text-white/80">by {book.author}</p>
            </div>
          )}

          {/* Book Spine Shadow and Lighting */}
          <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/60 via-white/10 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-b from-white/10 via-transparent to-black/60 pointer-events-none" />

          {/* Glowing Scan Bar Loop - Active on Hover */}
          <div className="absolute left-0 right-0 h-[2px] bg-[#dfbd69] shadow-[0_0_15px_#dfbd69] opacity-0 group-hover:opacity-100 top-0 group-hover:animate-bounce pointer-events-none" style={{ animationDuration: '3s' }} />

          {/* Overlay Quick Actions (Visible on Hover) */}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex gap-2 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out z-10">
            {book.available ? (
              <button
                id={`issue-${book.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onIssue(book.id);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-stone-950 bg-gradient-to-r from-[#dfbd69] via-[#d4af37] to-[#aa7c11] hover:brightness-110 shadow-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Issue
              </button>
            ) : (
               <button
                disabled
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white/60 bg-stone-900/80 border border-white/10 backdrop-blur-md cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" /> Unavailable
              </button>
            )}
            
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 setIsFlipped(true);
               }}
               className="px-3 py-2.5 rounded-xl bg-stone-900/80 backdrop-blur-md border border-white/10 text-amber-400 hover:text-amber-300 transition-all flex items-center justify-center shadow-lg"
               title="Flip to details"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          
          <button
            id={`wishlist-${book.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddToWishlist(book);
            }}
            className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all duration-200 z-10 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 ${
              isWishlisted 
                ? 'bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-black/40 hover:bg-black/60'
            }`}
            title={isWishlisted ? "Remove from Quantum Wishlist" : "Pin to Quantum Wishlist"}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
          </button>
        </div>

        {/* --- BACK OF THE CARD (REVIEWS, RATING & SPINE) --- */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotateY-180 rounded-[18px] border border-stone-800 bg-stone-950/95 backdrop-blur-xl p-4 flex flex-col justify-between shadow-2xl text-stone-200 overflow-hidden"
             onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center border-b border-stone-800 pb-2">
            <h4 className="text-xs font-bold font-mono text-amber-400 uppercase">Back Cover</h4>
            <button
              onClick={() => setIsFlipped(false)}
              className="text-[10px] font-mono text-stone-400 hover:text-white transition-colors bg-stone-800 px-2 py-1 rounded"
            >
              Flip Back
            </button>
          </div>

          {!showQrCode ? (
            <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-3 scrollbar-hide">
              <div className="text-[11px] text-stone-300 leading-relaxed font-sans mt-1">
                {book.description}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/10 pt-2 text-stone-400">
                <span>YEAR: {book.year}</span>
                <span>PAGES: {book.pages}</span>
                <span>RATING: {book.rating}/5.0</span>
                <span>REVIEWS: {book.reviews?.length || 0}</span>
              </div>
              
              <div className="border-t border-white/10 mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQrCode(true)}
                  className="w-full py-2 bg-stone-900 border border-stone-800 rounded-lg text-[10px] uppercase tracking-wider hover:bg-stone-800 text-white transition"
                >
                   Show Physical Barcode
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center py-2 text-center select-none pt-4">
              <p className="text-[9px] font-mono text-amber-500/70 uppercase mb-3">Barcode scan active inside admin terminal</p>
              {renderBookQrMatrix(book.id)}
              <div className="text-[9px] text-stone-500 font-mono mt-3 leading-relaxed">
                Present this virtual ticket to any e-Library supervisor desk.
              </div>
              <button
                type="button"
                onClick={() => setShowQrCode(false)}
                className="mt-4 text-[10px] text-stone-400 hover:text-white font-mono underline"
              >
                Back to info
              </button>
            </div>
          )}
        </div>
      </motion.div>
      
      {/* --- TITLE TEXT BELOW CARD --- */}
      <div className="mt-4 text-center w-full max-w-[240px] px-2 flex flex-col items-center">
        <h3 className="text-sm font-semibold font-sans text-stone-100 line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
          {book.title}
        </h3>
        <p className="text-[11px] font-mono text-stone-500 mt-1 uppercase tracking-wider">
          {book.author}
        </p>
        <div className="flex items-center gap-1 mt-1.5 opacity-80">
           {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-2.5 h-2.5 ${i < Math.floor(book.rating) ? 'text-amber-500 fill-amber-500' : 'text-stone-700'}`}
              />
           ))}
        </div>
      </div>
    </div>
  );
}
