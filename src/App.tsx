import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThreeCanvas } from './components/ThreeCanvas';
import { BookCard } from './components/BookCard';
import { SmartSearchBar, SearchFilters } from './components/SmartSearchBar';
import { CategoriesSlider } from './components/CategoriesSlider';
import { LeftNavCategories } from './components/LeftNavCategories';


import { IssueReturnPanel } from './components/IssueReturnPanel';
import { AdminPanel } from './components/AdminPanel';
import { Book, IssueTransaction, UserProfile } from './types';
import { BookOpen, Sparkles, Plus, Check, Heart, HelpCircle, X, Shield, Settings, Info, Star, LayoutGrid, LogOut, User, Mail, Lock, ShieldCheck, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { getFirebase, OperationType, handleFirestoreError } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';

const { db, auth } = getFirebase();

import { CardSwap, Card } from './components/CardSwap';
import { TubesBackground } from './components/TubesBackground';
import { TemporalClock } from './components/TemporalClock';

export default function App() {
  // Navigation Routing States
  const [activeTab, setActiveTab] = useState<'library' | 'my-books' | 'admin'>('library');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Data State
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<IssueTransaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('BHARAT_ELIB_USER');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Wishlist list
  const [wishlist, setWishlist] = useState<Book[]>([]);
  
  // Dialog / Overlay states
  const [detailedBook, setDetailedBook] = useState<Book | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'critique' | 'neutral' } | null>(null);
  const [loading, setLoading] = useState(true);

  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ field: 'all', genre: 'all', minRating: 0 });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [aiPromotedPrompt, setAiPromotedPrompt] = useState('');

  // 1. Initial Data Fetch on boot
  
  const loadData = async () => {
    try {
      setLoading(true);
      const booksSnap = await getDocs(collection(db, 'books'));
      const booksData = booksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Book));
      
      setBooks(booksData);
      setFilteredBooks(booksData);
      
      if (auth.currentUser) {
        const txsSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', auth.currentUser.uid)));
        setTransactions(txsSnap.docs.map(d => ({ id: d.id, ...d.data() } as IssueTransaction)));
        
        try {
          const profileSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (profileSnap.exists()) {
            setUserProfile({ ...profileSnap.data(), email: auth.currentUser.email, name: auth.currentUser.displayName || "Unknown" } as UserProfile);
          } else {
             // Let's create it if missing for simplicity
             const newProfile = { email: auth.currentUser.email, name: auth.currentUser.displayName, role: 'student', balance: 0 };
             try{
               await setDoc(doc(db, 'users', auth.currentUser.uid), newProfile);
               setUserProfile({ ...newProfile, badges: [] } as UserProfile);
             } catch(e) {
               console.log("Could not create user profile.");
             }
          }
        } catch (e) {
           console.log("Error loading profile");
        }
      }
      
      // Restore wishlist
      const savedWishlist = localStorage.getItem('LIBR_WISHLIST');
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch (err) {
      console.error(err);
      triggerToast("Error launching catalog interfaces.", "critique");
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      if(user) {
         loadData();
      } else {
         setLoading(false);
      }
      // Set to normal UI when loaded so we don't block
    });
    return () => unsub();
  }, []);

  // 2. Client-side Search and Filtering algorithm
  useEffect(() => {
    let result = [...books];

    // Filter by Category
    if (selectedCategory && selectedCategory !== 'All') {
      const selectedLower = selectedCategory.toLowerCase().replace('-', ' ');
      result = result.filter(b => {
        const bookCategoryLower = b.category.toLowerCase().replace('-', ' ');
        
        if (selectedLower === 'fiction') {
          return (
            (bookCategoryLower.includes('fiction') && !bookCategoryLower.includes('mythological')) ||
            bookCategoryLower === 'magical realism' ||
            bookCategoryLower === 'contemporary'
          );
        }
        if (selectedLower === 'non fiction' || selectedLower === 'non-fiction') {
          return (
            bookCategoryLower.includes('non fiction') ||
            bookCategoryLower.includes('non-fiction') ||
            bookCategoryLower.includes('memoir') ||
            bookCategoryLower.includes('biography') ||
            bookCategoryLower.includes('history')
          );
        }
        if (selectedLower === 'mythology') {
          return (
            bookCategoryLower.includes('mythology') ||
            bookCategoryLower.includes('mythological') ||
            bookCategoryLower.includes('legend') ||
            bookCategoryLower.includes('spirituality')
          );
        }
        if (selectedLower === 'self help' || selectedLower === 'self-help') {
          return (
            bookCategoryLower.includes('self help') ||
            bookCategoryLower.includes('self-help') ||
            bookCategoryLower.includes('personal development')
          );
        }
        if (selectedLower === 'poetry' || selectedLower === 'peotry') {
          return (
            bookCategoryLower.includes('poetry') ||
            bookCategoryLower.includes('poem') ||
            bookCategoryLower.includes('peotry')
          );
        }
        return bookCategoryLower.includes(selectedLower) || selectedLower.includes(bookCategoryLower);
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(book => {
        if (searchFilters.field === 'title') {
          return book.title.toLowerCase().includes(q);
        } else if (searchFilters.field === 'author') {
          return book.author.toLowerCase().includes(q);
        } else if (searchFilters.field === 'isbn') {
          return book.isbn.toLowerCase().includes(q);
        } else {
          return (
            book.title.toLowerCase().includes(q) ||
            book.author.toLowerCase().includes(q) ||
            book.description.toLowerCase().includes(q) ||
            book.isbn.toLowerCase().includes(q)
          );
        }
      });
    }

    // Filter by Min Rating Score
    if (searchFilters.minRating > 0) {
      result = result.filter(b => b.rating >= searchFilters.minRating);
    }

    setFilteredBooks(result);
  }, [books, searchQuery, searchFilters, selectedCategory]);

  // Notifications system
  const triggerToast = (message: string, type: 'success' | 'critique' | 'neutral' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Transaction events handlers (Issue / Return / Pay / etc)
  
  const handleIssueBook = async (bookId: string) => {
    if (!auth.currentUser) return;
    try {
      const book = books.find(b => b.id === bookId);
      if (!book) throw new Error("Not found");
      
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const newTxId = `tx_${Date.now()}`;
      
      const txData = {
        bookId,
        bookTitle: book.title,
        userName: auth.currentUser.displayName || "Scholar",
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        issueDate,
        dueDate,
        status: 'issued',
        fineAmount: 0,
        finePaid: false,
        qrCodeData: `LIBR_${Date.now()}_${bookId}`
      };
      
      await setDoc(doc(db, 'transactions', newTxId), txData);
      
      triggerToast(`Issued "${book.title}" successfully! Due date registered.`, "success");
      loadData();
    } catch (err) {
      console.error(err);
      triggerToast("System error cataloging checkout cycles.", "critique");
    }
  };

  
  const handleReturnBook = async (transactionId: string): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser) return { success: false, error: "Not authed" };
    try {
      const tx = transactions.find(t => t.id === transactionId);
      if (!tx) return { success: false, error: "Not found" };
      if (tx.fineAmount > 0 && !tx.finePaid) return { success: false, error: "Outstanding overdue fines" };
      
      await updateDoc(doc(db, 'transactions', transactionId), {
        status: 'returned',
        returnDate: new Date().toISOString().split('T')[0],
        finePaid: tx.finePaid,
        fineAmount: tx.fineAmount
      });
      triggerToast(`Returned successfully!`, "success");
      loadData();
      return { success: true };
    } catch (err) {
      return { success: false, error: "Return telemetry link broken." };
    }
  };

  const handleRenewBook = async (transactionId: string) => {
    // Standard renewal simulation: extend due date by 7 days
    const txIndex = transactions.findIndex(t => t.id === transactionId);
    if (txIndex === -1) return;

    const tx = transactions[txIndex];
    const prevDue = new Date(tx.dueDate);
    const newDue = new Date(prevDue.getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];

    tx.dueDate = newDue;
    triggerToast(`Checkout renewed successfully! Expanded due line to: ${newDue}`, "neutral");
    setTransactions([...transactions]);
  };

  
  const handlePayFine = async (transactionId: string, amount: number) => {
    if(!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'transactions', transactionId), {
        finePaid: true,
        fineAmount: 0,
        status: 'returned',
        returnDate: new Date().toISOString().split('T')[0],
      });
      triggerToast(`Fines of ₹${amount} settled successfully via Razorpay interface!`, "success");
      loadData();
    } catch (err) {
      triggerToast("Simulated fine ledger error.", "critique");
    }
  };

  
  const handleRechargeWallet = async (amount: number) => {
    triggerToast("Digital gateway is restricted to Admins currently in true database mode.", "neutral");
  };

  const handleAddBookAdmin = (newBook: Book) => {
    // Add dynamically to local inventory
    setBooks(prev => [newBook, ...prev]);
  };

  const toggleWishlist = (book: Book) => {
    const exists = wishlist.some(b => b.id === book.id);
    let updated;
    if (exists) {
      updated = wishlist.filter(b => b.id !== book.id);
      triggerToast(`Removed "${book.title}" from wishlist.`, "neutral");
    } else {
      updated = [book, ...wishlist];
      triggerToast(`Added "${book.title}" to wishlist!`, "success");
    }
    setWishlist(updated);
    localStorage.setItem('LIBR_WISHLIST', JSON.stringify(updated));
  };

  
  const handleSubmitReview = async (bookId: string, userName: string, rating: number, comment: string) => {
    if (!auth.currentUser) return;
    try {
      const newReview = {
        userName: auth.currentUser.displayName || "Scholar",
        userId: auth.currentUser.uid,
        rating: Number(rating) || 5,
        comment: comment || "",
        date: new Date().toISOString().split('T')[0]
      };
      await setDoc(doc(db, `books/${bookId}/reviews/rev_${Date.now()}`), newReview);
      triggerToast(`Thank you for submitting critical score: ★ ${rating}!`, "success");
      loadData();
    } catch (err) {
      triggerToast("Review transmission lost.", "critique");
    }
  };

  const handleRoleSet = (role: 'student' | 'librarian' | 'admin') => {
    if (!userProfile) return;
    const updated = { ...userProfile, role };
    setUserProfile(updated);
    localStorage.setItem('BHARAT_ELIB_USER', JSON.stringify(updated));
    triggerToast(`Simulation mode changed to role: "${role.toUpperCase()}"`, "neutral");
  };

  
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      triggerToast(`Welcome to Bharat eLibrary!`, "success");
    } catch (e) {
      triggerToast("Login failed.", "critique");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setUserProfile(null);
    setTransactions([]);
    triggerToast("Logged out successfully.", "neutral");
  };

  if (!isLoggedIn) {
    return (
      <TubesBackground className="fixed inset-0 select-none">
        <div className="flex w-full h-full min-h-screen items-center justify-center p-4 md:p-8 bg-transparent transition-all duration-700">
          {/* Main Card */}
          <div className="w-full max-w-md bg-stone-950/90 border border-stone-800 rounded-3xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative overflow-hidden group pointer-events-auto">
            
            {/* Elegant Indian Tricolor Ribbon Indicator at the Top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex flex-row">
              <div className="flex-1 bg-[#FF9933] h-full" />
              <div className="flex-1 bg-white h-full" />
              <div className="flex-1 bg-[#128807] h-full" />
            </div>

            {/* Subtle Amber Glow at top */}
            <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Content Container */}
            <div className="relative space-y-6">
              
              {/* Header Icon / Logo */}
              <div className="text-center space-y-2 pt-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-emerald-500/25 border border-amber-500/35 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.15)] mb-1">
                  <BookOpen className="w-7 h-7 text-amber-500" />
                </div>
                
                <h1 className="text-2xl font-black text-stone-100 tracking-tight flex items-center justify-center gap-2">
                  <span>Bharat eLibrary</span>
                  <span className="text-xl">🇮🇳</span>
                </h1>
                
                <p className="text-stone-300 text-xs max-w-xs mx-auto font-medium">
                  National Digital Repository for Indological Chronicles, Scientific Journals & Literature
                </p>
              </div>

              {/* Form Input fields */}
              <button onClick={handleLogin} className="w-full py-3 bg-amber-500 rounded-xl text-black font-bold">Sign In Using Google</button>

              {/* Footer instruction */}
              <div className="text-center space-y-1">
                <p className="text-[10px] text-stone-500 font-mono font-medium">
                  Tip: Move cursor to swirl tubes • Click background to randomize 3D neon light colors
                </p>
                <div className="text-[9px] text-[#FF9933]/70 font-mono flex items-center justify-center gap-1.5 mt-2">
                  <span>Digital India Initiative</span>
                  <span className="w-1 h-1 bg-stone-500 rounded-full" />
                  <span className="text-[#128807]/80">Knowledge Repository</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </TubesBackground>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#02040a] text-slate-200 font-sans overflow-hidden flex flex-col">
      
      {/* 1. ATMOSPHERIC LIGHT SHADERS & 3D BACKGROUND PARALLAX */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[40%] bg-blue-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[50%] bg-purple-600/10 rounded-full blur-[110px]" />
        <div 
          className="absolute inset-0 opacity-15" 
          style={{ 
            backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", 
            backgroundSize: "40px 40px" 
          }} 
        />
      </div>
      
      {/* Canvas floats inside the background */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <ThreeCanvas />
      </div>

      {/* 2. TWO-PANE LAYOUT: SIDEBAR + MAIN NEXUS CONTENT */}
      <div className="flex flex-1 relative z-10 overflow-hidden">
        
        {/* LEFT NAV SIDEBAR */}
        <aside className="w-64 border-r border-white/5 bg-[#08090d]/60 backdrop-blur-xl flex flex-col z-10 shrink-0">
          <div className="p-8">
            <div 
              className="flex items-center gap-2.5 cursor-pointer group" 
              onClick={() => { setActiveTab('library'); setSelectedCategory('All'); setSearchQuery(''); }}
            >
              <div className="w-9 h-9 bg-stone-950 border border-stone-800 hover:border-amber-500/50 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(255,153,51,0.2)] transition-all group-hover:scale-105 p-[3px] overflow-hidden shrink-0">
                <div className="flex flex-col gap-[1px] w-full h-full rounded-[2px] overflow-hidden border border-white/5 shadow-md">
                  <div className="bg-[#FF9933] flex-1 w-full" />
                  <div className="bg-white flex-1 w-full flex items-center justify-center relative">
                    <div className="w-2 h-2 rounded-full border-[0.6px] border-blue-900 flex items-center justify-center relative animate-spin [animation-duration:15s] scale-90">
                      <div className="w-[1px] h-[1px] rounded-full bg-blue-900" />
                      <div className="absolute inset-x-0 h-[0.2px] bg-blue-900/40 rotate-[0deg]" />
                      <div className="absolute inset-x-0 h-[0.2px] bg-blue-900/40 rotate-[45deg]" />
                      <div className="absolute inset-x-0 h-[0.2px] bg-blue-900/40 rotate-[90deg]" />
                      <div className="absolute inset-x-0 h-[0.2px] bg-blue-900/40 rotate-[135deg]" />
                    </div>
                  </div>
                  <div className="bg-[#128807] flex-1 w-full" />
                </div>
              </div>
              <span className="font-bold tracking-tight text-base bg-clip-text text-transparent bg-gradient-to-r from-stone-100 to-slate-400 font-sans flex items-center gap-1.5">
                Bharat eLibrary <span className="text-sm select-none">🇮🇳</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-8 pb-3 -mt-2">
            <div className="flex items-center gap-2 bg-gradient-to-r from-stone-900/40 via-stone-850/20 to-transparent border border-white/5 px-3 py-1.5 rounded-xl select-none">
              <div className="flex flex-col gap-[1px] w-4.5 h-3 my-auto shrink-0 overflow-hidden shadow-sm rounded-[1px]">
                <div className="bg-[#FF9933] h-[3.2px] w-full" />
                <div className="bg-white h-[3.2px] w-full flex items-center justify-center">
                  <div className="w-[1.2px] h-[1.2px] rounded-full bg-blue-900" />
                </div>
                <div className="bg-[#128807] h-[3.2px] w-full" />
              </div>
              <span className="text-[9px] font-mono font-bold text-stone-400 tracking-wider">BHARAT REPOSITORY</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 flex flex-col select-none overflow-y-auto">
            <div className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#dfbd69]/80 font-bold font-mono">Operations</div>
            
            <button
              id="library-tab"
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                activeTab === 'library'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <LayoutGrid className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Dashboard</span>
            </button>

            {/* Impression side-nav removed */}
            
            {/* Category Sidebar Navigation removed */}

            <button
              id="my-books-tab"
              onClick={() => setActiveTab('my-books')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                activeTab === 'my-books'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <BookOpen className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">My Books</span>
            </button>

            <button
              id="admin-tab"
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                activeTab === 'admin'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Shield className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Admin Desk</span>
            </button>

            <LeftNavCategories selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

            {/* Logout Link */}
            <button
              onClick={handleLogout}
              className="mt-8 gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left text-rose-455 hover:text-rose-400 hover:bg-rose-500/5 flex items-center border border-transparent hover:border-rose-500/10"
            >
              <LogOut className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Log Out</span>
            </button>
          </nav>

          {/* Active Status Card */}
          <div className="p-6">
            <div className="bg-gradient-to-b from-stone-800/40 to-transparent border border-white/5 p-4 rounded-xl">
              <div className="text-[9px] text-[#dfbd69] font-bold uppercase mb-1 tracking-widest font-mono">System Status</div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] md:text-xs text-stone-300 font-mono font-medium">Synchronized</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT SIDE CONTENT VIEWPORT */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black/10">
          
          {/* HEADER BAR */}
          <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 shrink-0 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-4 hidden lg:flex">
              <div className="flex items-center gap-2.5 font-mono text-[10px] font-bold text-amber-500 tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block mr-1" />
                National Literature Repository
              </div>
            </div>

            <TemporalClock />
 
            <div className="flex items-center gap-6">
              {userProfile && (
                <div className="flex items-center gap-3 select-none">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-white tracking-tight">{userProfile.name}</div>
                    <div className="text-[9px] text-[#dfbd69]/90 uppercase font-mono tracking-widest mt-0.5">Verified Scholar</div>
                  </div>
                  
                  {/* Dynamic clean gradient avatar matching theme */}
                  <div className="w-10 h-10 rounded-full border border-amber-500/30 p-0.5 bg-gradient-to-tr from-[#FF9933] to-[#128807] flex items-center justify-center text-xs font-black text-white shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    {userProfile.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* CENTRAL WORKSPACE PANEL WITH IMMERSIVE CONTENT */}
          <ErrorBoundary>
            <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-8">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
                <span className="text-xs font-mono tracking-widest text-cyan-400 uppercase">Synchronizing with deep library grids...</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                
                {/* TAB: COMMAND DECK (LIBRARY DIRECTORY SYSTEM) */}
                {activeTab === 'library' && (
                  <motion.div
                    key="library"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-8"
                  >
                    {/* Hero Showcase Frame & Side Manifest Stream */}
                    <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                      
                      {/* Left: Interactive 3D Card Shuffling Perspective Animation */}
                      <div className="xl:col-span-2 relative min-h-[480px] md:min-h-[520px] rounded-[4.5rem] overflow-hidden border bg-gradient-to-br from-stone-900/40 via-stone-950/65 to-black/55 backdrop-blur-xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14 transition-all duration-500 animate-neon-breath">
                        {/* Interactive Left Side text */}
                        <div className="flex-1 space-y-6 text-left z-10 select-none">
                          <span className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-mono tracking-[0.15em] font-black uppercase rounded-full inline-block">
                            National literary exhibition 🇮🇳
                          </span>
                          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase font-sans leading-tight">
                            Discover India's Classics
                          </h2>
                          <p className="text-stone-300 text-xs leading-relaxed max-w-sm">
                            Hover and deck-shuffle through hand-picked historical epics, modern treatises, and scientific papers curated in high fidelity.
                          </p>
                          <div className="flex items-center gap-2.5 text-[10px] font-mono text-[#128807] pt-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#128807] animate-pulse shadow-[0_0_8px_rgba(18,136,7,0.5)]" />
                            <span className="font-bold uppercase tracking-wider">Swipe active • Click cover to view doc</span>
                          </div>
                        </div>

                        {/* Card Swap visualizer component */}
                        <div className="w-full md:w-[280px] lg:w-[320px] h-[340px] flex items-center justify-center relative select-none z-20">
                          {books.length > 0 && (
                            <CardSwap 
                              width={210}
                              height={280}
                              delay={3500}
                              onCardClick={(idx) => {
                                const activeBooks = books.filter(b => b.coverImage).slice(0, 5);
                                const selected = activeBooks[idx];
                                if (selected) setDetailedBook(selected);
                              }}
                            >
                              {books.filter(b => b.coverImage).slice(0, 5).map((b) => (
                                <Card 
                                  key={b.id} 
                                  className="w-full h-full p-0 overflow-hidden cursor-pointer group bg-stone-950 border border-stone-800 rounded-2xl flex flex-col justify-between"
                                >
                                  {/* Beautiful authentic Book Cover Page configuration */}
                                  <div className="h-full w-full p-5 flex flex-col justify-between relative bg-stone-950 overflow-hidden">
                                    {b.coverImage ? (
                                      <img
                                        src={b.coverImage}
                                        alt={b.title}
                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className={`absolute inset-0 bg-gradient-to-br ${b.coverGradient || "from-amber-600 to-amber-900"} opacity-90 transition-transform duration-500`} />
                                    )}
                                    
                                    {/* Real Book Spine crease shadow and bindings simulation */}
                                    <div className="absolute inset-y-0 left-0 w-3 bg-black/35 shadow-[inset_-3px_0_8px_rgba(0,0,0,0.6)] z-20" />
                                    <div className="absolute inset-y-0 left-3 w-[0.5px] bg-white/20 z-20 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
                                    
                                    {/* Centered Book Cover Title Plate */}
                                    <div className="absolute inset-0 p-5 flex flex-col justify-end text-white bg-gradient-to-t from-black/80 to-transparent z-20">
                                      <h3 className="text-lg font-bold font-sans line-clamp-2 leading-tight drop-shadow-md text-white/95">
                                        {b.title}
                                      </h3>
                                      <p className="text-xs font-mono text-white/70 mt-1">by {b.author}</p>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </CardSwap>
                          )}
                        </div>
                      </div>
                      
                      {/* Right: Immersive Shelf Stats pane */}
                      <div className="xl:col-span-1 flex flex-col gap-6 select-none shrink-0 text-stone-200">
                        <div className="bg-stone-900/50 border border-stone-800/80 p-5 rounded-3xl shadow-lg">
                          <h3 className="text-[10px] font-bold text-[#dfbd69] uppercase tracking-widest mb-4 font-mono">Your Reading Account</h3>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between items-center mb-1.5 text-xs font-semibold text-stone-300">
                                <span>Borrowed Literature</span>
                                <span className="text-amber-500 font-mono font-bold">
                                  {transactions.filter(t => (t.status === 'issued' || t.status === 'overdue') && t.userEmail === userProfile?.email).length} / 08
                                </span>
                              </div>
                              <div className="w-full bg-stone-950 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full shadow-[0_1px_4px_rgba(245,158,11,0.2)] transition-all duration-300" 
                                  style={{ width: `${Math.min((transactions.filter(t => (t.status === 'issued' || t.status === 'overdue') && t.userEmail === userProfile?.email).length / 8) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-stone-450 font-medium">Digital Wallet Wallet Balance</span>
                              <span className="text-[#128807] font-mono font-bold">₹{userProfile?.balance || 0}.00 INR</span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-stone-450 font-medium">Overdue Penalties</span>
                              <span className={`font-mono font-bold ${transactions.filter(t => t.userEmail === userProfile?.email).reduce((acc, t) => acc + t.fineAmount, 0) > 0 ? "text-rose-500" : "text-stone-400"}`}>
                                ₹{transactions.filter(t => t.userEmail === userProfile?.email).reduce((acc, t) => acc + t.fineAmount, 0)}.00 INR
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expiring records checklist */}
                        <div className="flex-1 bg-stone-900/50 border border-stone-800/80 p-5 rounded-3xl flex flex-col min-h-[175px] shadow-lg">
                          <h3 className="text-[10px] font-bold text-[#dfbd69] uppercase tracking-widest mb-4 font-mono">Immediate Due Dates</h3>
                          <div className="flex-1 space-y-3 overflow-y-auto max-h-[160px] pr-1">
                            {transactions.filter(t => (t.status === 'issued' || t.status === 'overdue') && t.userEmail === userProfile?.email).length === 0 ? (
                              <div className="p-4 rounded-xl border border-dashed border-stone-800 text-center text-stone-500 text-xs italic font-medium">
                                No books active. Explore the classical catalog below to read.
                              </div>
                            ) : (
                              transactions.filter(t => (t.status === 'issued' || t.status === 'overdue') && t.userEmail === userProfile?.email).map(t => {
                                const isOverdue = t.status === 'overdue';
                                return (
                                  <div key={t.id} className={`p-3 bg-stone-950/50 rounded-2xl border-l-2 ${isOverdue ? 'border-rose-500/80' : 'border-[#dfbd69]'} flex justify-between items-center gap-2`}>
                                    <div className="truncate flex-1 select-none">
                                      <div className="text-xs font-bold text-stone-200 truncate">{t.bookTitle}</div>
                                      <div className="text-[9px] text-stone-400 font-mono mt-0.5">
                                        {isOverdue ? 'OVERDUE FINE ACCRUING' : `Return by ${t.dueDate}`}
                                      </div>
                                    </div>
                                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-extrabold ${isOverdue ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-500'}`}>
                                      {isOverdue ? 'Fine' : 'Checked Out'}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>
                    </section>



                    {/* Search & Categories Section */}
                    <div className="mb-12 space-y-6">
                      <div className="max-w-2xl mx-auto w-full">
                        <SmartSearchBar
                            value={searchQuery}
                            books={books}
                            onViewDetails={setDetailedBook}
                            onSearch={(q, filt, cat) => {
                              setSearchQuery(q);
                              setSearchFilters(filt);
                              setSelectedCategory(cat);
                            }}
                            trendingTerms={['Chetan Bhagat', 'Arundhati Roy', 'Midnight\'s Children']}
                            assistantPromptSelected={(prompt) => {
                                setSearchQuery(prompt);
                                setAiPromotedPrompt(prompt);
                            }}
                        />
                      </div>
                      <CategoriesSlider
                        selectedCategory={selectedCategory}
                        onSelectCategory={(name) => {
                          setSelectedCategory(name);
                          setAiPromotedPrompt('');
                        }}
                      />
                    </div>

                      {filteredBooks.length === 0 ? (
                        <div className="p-16 border border-stone-800 rounded-3xl bg-stone-900/30 text-center text-stone-400 py-20 flex flex-col items-center select-none shadow-sm">
                          <HelpCircle className="w-10 h-10 text-stone-300 mb-3" />
                          <p className="text-xs font-mono font-bold text-stone-700">No classical works matched your search parameters.</p>
                          <button
                            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                            className="mt-3 text-xs font-mono text-[#aa7c11] font-bold hover:underline cursor-pointer"
                          >
                            Reset stacked parameters
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {filteredBooks.map((book) => (
                            <BookCard
                              key={book.id}
                              book={book}
                              onIssue={handleIssueBook}
                              onAddToWishlist={toggleWishlist}
                              isWishlisted={wishlist.some(b => b.id === book.id)}
                              onViewDetails={(b) => setDetailedBook(b)}
                              onSubmitReview={handleSubmitReview}
                              userName={userProfile ? userProfile.name : "Pranay Turakane"}
                            />
                          ))}
                        </div>
                      )}
                  </motion.div>
                )}

                {/* TAB: MY PORTFOLIO / BORROW LEDGERS */}
                {activeTab === 'my-books' && (
                  <motion.div
                    key="my-books"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                  >
                    {userProfile && (
                      <IssueReturnPanel
                        transactions={transactions}
                        userProfile={userProfile}
                        onReturnBook={handleReturnBook}
                        onPayFine={handlePayFine}
                        onRenewBook={handleRenewBook}
                        onRechargeWallet={handleRechargeWallet}
                      />
                    )}
                  </motion.div>
                )}

                {/* TAB: ADMINISTRATIVE DESK CONTROL */}
                {activeTab === 'admin' && (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                  >
                    <AdminPanel
                      books={books}
                      transactions={transactions}
                      onAddBook={handleAddBookAdmin}
                      onSetRole={handleRoleSet}
                      currentRole={userProfile ? userProfile.role : 'student'}
                      onReturnBook={handleReturnBook}
                    />
                  </motion.div>
                )}

              </AnimatePresence>
            )}
          </div>
          </ErrorBoundary>

          {/* BOTTOM IMMERSIVE STATUS BAR */}
          <footer className="h-10 bg-[#faf8f5] border-t border-stone-200 px-6 flex items-center justify-between text-[10px] font-mono tracking-widest text-[#7c631e] font-bold select-none z-10 relative">
            <div className="flex gap-6 items-center">
              <span>SYSTEM: OPTIMAL</span>
              <span className="hidden sm:inline">LATENCY: 12ms</span>
              <span className="hidden md:flex items-center gap-2 text-[#926f1a]">
                STATUS: ENCRYPTED // PORTAL SECURE
              </span>
            </div>
            <div className="flex gap-6">
              <span className="text-amber-700/60 font-bold hidden lg:inline">SECURE LINK: AES-512-NX</span>
              <span>© {new Date().getFullYear()} BHARAT E-LIBRARY</span>
            </div>
          </footer>

        </main>
      </div>

      {/* 3. OVERLAY DIALOGS: HEURISTIC DETAILS MODAL */}
      <AnimatePresence>
        {detailedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailedBook(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-2xl p-6 z-10 font-sans"
            >
              <button
                onClick={() => setDetailedBook(null)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 select-none text-stone-850">
                {/* Book Spines side */}
                <div className="md:col-span-1">
                  <div className={`w-full h-56 rounded-xl bg-gradient-to-tr ${detailedBook.coverGradient} p-4 flex flex-col justify-between shadow-lg relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent)]" />
                    {detailedBook.coverImage ? (
                      <img
                        src={detailedBook.coverImage}
                        alt={detailedBook.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : null}
                    <span className="text-[9px] font-mono font-bold tracking-widest text-[#dfbd69] bg-black/40 px-1.5 py-0.5 rounded w-max uppercase z-10">{detailedBook.category}</span>
                    <div className="z-10 bg-black/50 p-2 rounded-lg">
                      <h4 className="text-sm font-black text-white leading-tight">{detailedBook.title}</h4>
                      <p className="text-[10px] text-white/80 font-mono mt-1 font-bold">by {detailedBook.author}</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 rounded-xl border border-stone-200 bg-[#faf8f5] space-y-2 text-[11px] font-mono text-stone-500">
                    <div>ISBN: <span className="text-stone-800 font-bold">{detailedBook.isbn}</span></div>
                    <div>PAGES: <span className="text-stone-800 font-bold">{detailedBook.pages}</span></div>
                    <div>YEAR: <span className="text-stone-800 font-bold">{detailedBook.year}</span></div>
                    <div>CLASS: <span className="text-[#a18116] font-extrabold uppercase">{detailedBook.category}</span></div>
                  </div>

                  {/* Book's Own Unique QR Stamp */}
                  <div className="mt-4 p-3.5 bg-stone-950 border border-stone-800 text-stone-200 rounded-2xl flex flex-col items-center gap-1.5 shadow-md">
                    <span className="text-[9px] font-mono tracking-widest text-[#dfbd69] font-black uppercase text-center">Spine Security QR</span>
                    <div className="bg-white p-2 rounded-lg border border-amber-500/10">
                      <div className="grid grid-cols-10 gap-0.5 w-[84px] h-[84px]">
                        {(() => {
                          const hash = detailedBook.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                          const grid = [];
                          for (let i = 0; i < 100; i++) {
                            const r = Math.floor(i / 10);
                            const c = i % 10;
                            const isCornerMarker = 
                              (r < 3 && c < 3) || 
                              (r < 3 && c >= 7) || 
                              (r >= 7 && c < 3);
                            
                            const filled = isCornerMarker 
                              ? (r === 0 || r === 2 || c === 0 || c === 2 || (r === 1 && c === 1)) 
                              : (hash * (r + 1) * (c + 2)) % 3 === 0 || (hash + r + c) % 5 === 0;
                            grid.push(filled);
                          }
                          return grid.map((filled, idx) => (
                            <div 
                              key={idx} 
                              className={`w-full h-full rounded-[1px] ${filled ? 'bg-stone-900' : 'bg-transparent'}`}
                            />
                          ));
                        })()}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-tight text-amber-450 uppercase mt-0.5 truncate max-w-full px-1">
                      BOOK_QR_{detailedBook.id.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Abstracts and Core desc */}
                <div className="md:col-span-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-bold font-mono text-stone-800 mt-0.5">{detailedBook.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-stone-400 font-mono">({detailedBook.reviews?.length || 0} reviews indexed)</span>
                    </div>

                    <h2 className="text-xl font-bold font-sans text-stone-900 mt-1.5 leading-tight">{detailedBook.title}</h2>
                    <p className="text-xs text-amber-700 font-mono mt-0.5 uppercase tracking-wide font-extrabold">Abstract Core Dossier Node</p>
                    
                    <p className="text-xs select-text text-stone-600 mt-4 leading-relaxed bg-[#faf8f5] p-4 rounded-xl border border-stone-200 font-medium pb-4">
                      {detailedBook.description}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2.5 mt-6 border-t border-stone-150 pt-4 justify-end">
                    <button
                      onClick={() => toggleWishlist(detailedBook)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        wishlist.some(b => b.id === detailedBook.id)
                          ? 'bg-rose-55 border-rose-200 text-rose-600'
                          : 'bg-stone-50 border-stone-300 text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 inline inline-block mr-1 fill-current" /> PIN ARCHIVE
                    </button>
                    {detailedBook.available ? (
                      <button
                        onClick={() => {
                          handleIssueBook(detailedBook.id);
                          setDetailedBook(null);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-950 bg-gradient-to-r from-[#dfbd69] via-[#d4af37] to-[#aa7c11] hover:brightness-105 transition-all font-mono cursor-pointer shadow-sm hover:shadow-[0_2px_8px_rgba(212,175,55,0.3)] text-center font-extrabold"
                      >
                        ISSUE DIRECT
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 bg-stone-50 border border-stone-200 cursor-not-allowed font-mono"
                      >
                        TEMPORARILY UNAVAILABLE
                      </button>
                    )}
                  </div>

                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. SUCCESS/NEUTRAL MICRO TOAST Overlays */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border font-mono text-xs font-semibold shadow-2xl flex items-center gap-2.5 backdrop-blur-md ${
              toast.type === 'critique'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : toast.type === 'neutral'
                ? 'bg-slate-500/15 border-slate-500/40 text-slate-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {toast.type === 'critique' ? (
              <X className="w-5 h-5 text-rose-400 shrink-0 border border-rose-400/20 rounded-md p-0.5 bg-rose-500/10" />
            ) : (
              <Check className="w-5 h-5 text-emerald-400 shrink-0 border border-emerald-400/20 rounded-md p-0.5 bg-emerald-500/10" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Interactive Login form helper (includes default and editable field state variables)
function LoginForm({ onSubmit }: { onSubmit: (name: string, email: string, role: 'student' | 'librarian' | 'admin') => void }) {
  const [name, setName] = useState('Pranay Turakane');
  const [email, setEmail] = useState('pranayturakane743@gmail.com');
  const [role, setRole] = useState<'student' | 'librarian' | 'admin'>('student');

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name, email, role);
      }}
      className="space-y-4 text-left"
    >
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#dfbd69] font-mono font-bold">Your Name</label>
        <div className="relative">
          <input 
            type="text" 
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-stone-900/60 border border-stone-800 rounded-xl px-4 py-2.5 pl-10 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50 transition-colors"
            placeholder="e.g. Pranay Turakane"
          />
          <User className="absolute left-3.5 top-3 w-4 h-4 text-stone-500" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#dfbd69] font-mono font-bold">Email Address</label>
        <div className="relative">
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-stone-900/60 border border-stone-800 rounded-xl px-4 py-2.5 pl-10 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50 transition-colors"
            placeholder="e.g. name@domain.com"
          />
          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-500" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-[#dfbd69] font-mono font-bold">Select Profile Role</label>
        <div className="grid grid-cols-3 gap-2">
          {(['student', 'librarian', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2 rounded-xl text-[10px] font-mono font-bold uppercase transition-all border shrink-0 flex items-center justify-center gap-1 cursor-pointer ${
                role === r 
                  ? 'bg-amber-500/10 border-amber-500/45 text-amber-500 shadow-sm' 
                  : 'bg-stone-900/40 border-stone-800/80 text-stone-500 hover:text-stone-300'
              }`}
            >
              <span>
                {r === 'student' && '🎓 Scholars'}
                {r === 'librarian' && '📖 Curator'}
                {r === 'admin' && '🔑 Admin'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full mt-4 bg-gradient-to-r from-amber-600 via-[#e07b22] to-[#128807] hover:brightness-105 transition-all text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider font-mono flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
      >
        <span>Enter Virtual Stacks</span>
        <span>🇮🇳</span>
      </button>
    </form>
  );
}
