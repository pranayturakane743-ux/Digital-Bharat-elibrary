import React, { useState, useEffect, useRef } from 'react';
import { Book, IssueTransaction } from '../types';
import { 
  AreaChart, BarChart, PlusCircle, Shield, AlertTriangle, 
  CheckCircle, Database, HelpCircle, LayoutGrid, Calendar,
  QrCode, Camera, X, RefreshCw, AlertCircle, Check, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFirebase } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

interface AdminPanelProps {
  books: Book[];
  transactions: IssueTransaction[];
  onAddBook: (newBook: Book) => void;
  onSetRole: (role: 'student' | 'librarian' | 'admin') => void;
  currentRole: 'student' | 'librarian' | 'admin';
  onReturnBook: (transactionId: string) => Promise<{ success: boolean; error?: string }>;
}

export function AdminPanel({
  books,
  transactions,
  onAddBook,
  onSetRole,
  currentRole,
  onReturnBook,
}: AdminPanelProps) {
  // New input state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('Technology');
  const [pages, setPages] = useState('320');
  const [description, setDescription] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. QR Scanner Simulation & Webcam States
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'decoding' | 'success' | 'error'>('idle');
  const [scanFeedback, setScanFeedback] = useState('ALIGN QR SPECIMEN IN VIEWPORT');
  const [scannedTx, setScannedTx] = useState<IssueTransaction | null>(null);
  const [presentedTx, setPresentedTx] = useState<IssueTransaction | null>(null);
  const [manualQrInput, setManualQrInput] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasOverdueInSystem = transactions.some((tx) => tx.status === 'overdue');

  // Synthesizer chimes simulation for futuristic feedback
  const playBeep = (freq = 880, duration = 0.12) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log("Audio feedback blocked/unsupported.");
    }
  };

  const playErrorBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log("Audio feedback blocked.");
    }
  };

  // Webcam streamer handler
  const startWebcam = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Camera hardware or permissions not accessible.", err);
      setCameraError(err?.message || "Webcam camera hardware not found.");
      setUseRealCamera(false);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Turn webcam on/off based on settings
  useEffect(() => {
    if (isScanModalOpen && useRealCamera) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [isScanModalOpen, useRealCamera]);

  const handlePresentTx = (tx: IssueTransaction) => {
    if (scanState === 'decoding' || scanState === 'success') return;
    setPresentedTx(tx);
    setScannedTx(tx);
    setScanState('scanning');
    setScanFeedback(`SPECIMEN IN APERTURE: BOOK_QR_${tx.bookId.toUpperCase()}. ALIGN RED GUIDE AND CLICK "EMIT LASER DECODE".`);
    playBeep(600, 0.08);
  };

  // Simulated scan operation trigger (strictly requires a presentedTx in the lens)
  const handleTriggerSimulateScan = async () => {
    if (!presentedTx) {
      setScanFeedback("APERTURE EMPTY! CLICK 'PRESENT QR' NEXT TO A BOOK FIRST.");
      playErrorBeep();
      return;
    }
    if (scanState === 'decoding' || scanState === 'success') return;

    setScanState('decoding');
    setScanFeedback(`LOCK-ON ACQUIRED! READING UNIQUE GRID SIGNATURE: BOOK_QR_${presentedTx.bookId.toUpperCase()}`);
    playBeep(880, 0.1);

    setTimeout(async () => {
      setScanFeedback(`DECODING GRIDS... VALIDATING DOCKET IN CHECKSUM LEDGER...`);
      playBeep(980, 0.08);

      setTimeout(async () => {
        // API return call
        const res = await onReturnBook(presentedTx.id);
        if (res.success) {
          playBeep(1046, 0.15); // higher octave beep
          setTimeout(() => playBeep(1318, 0.15), 100); // chime upbeat success note
          
          setScanState('success');
          setScanFeedback(`VERIFIED SUCCESS: Book "${presentedTx.bookTitle}" (BOOK_QR_${presentedTx.bookId.substring(0, 8).toUpperCase()}) checked-in successfully!`);
          
          setTimeout(() => {
            setScanState('idle');
            setScanFeedback('READY FOR NEXT SPECIMEN. ALIGN QR...');
            setPresentedTx(null);
            setScannedTx(null);
          }, 3400);
        } else {
          playErrorBeep();
          setScanState('error');
          setScanFeedback(`VERIFICATION DECLINED: ${res.error || "Fines must be settled prior to return clearance"}`);
          
          setTimeout(() => {
            setScanState('idle');
            setScanFeedback('READY FOR NEXT SPECIMEN. PLACE BOOK IN VIEWPORT...');
            setPresentedTx(null);
            setScannedTx(null);
          }, 4500);
        }
      }, 1000);
    }, 1200);
  };

  const handleManualQrInputReturn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualQrInput.trim()) return;
    if (scanState === 'decoding' || scanState === 'success') return;

    // strip BOOK_QR_ if present to find bookId
    const queryStr = manualQrInput.trim().toUpperCase().replace('BOOK_QR_', '');
    
    // Find active transactions matching bookId (containing queryStr or exact match) or matching bookTitle
    const activeTxs = transactions.filter(t => t.status === 'issued' || t.status === 'overdue');
    const matchedTx = activeTxs.find(t => 
      t.bookId.toUpperCase().includes(queryStr) || 
      t.bookId.toUpperCase() === queryStr || 
      t.bookTitle.toUpperCase().includes(queryStr)
    );

    if (matchedTx) {
      setManualQrInput('');
      setPresentedTx(matchedTx);
      setScannedTx(matchedTx);
      setScanState('decoding');
      setScanFeedback(`MANUAL REGISTRATION LOCATED. INITIATING HIGH-INTENSITY LASER DECODE...`);
      playBeep(880, 0.12);

      setTimeout(async () => {
        setScanFeedback(`PROCESSING DIRECT BYPASS DEPOSIT WITH LEDGER CHECKS...`);
        playBeep(980, 0.08);

        setTimeout(async () => {
          const res = await onReturnBook(matchedTx.id);
          if (res.success) {
            playBeep(1046, 0.15);
            setTimeout(() => playBeep(1318, 0.15), 100);
            
            setScanState('success');
            setScanFeedback(`DIRECT VERIFIED: Book "${matchedTx.bookTitle}" (BOOK_QR_${matchedTx.bookId.substring(0, 8).toUpperCase()}) checked-in.`);
            
            setTimeout(() => {
              setScanState('idle');
              setScanFeedback('READY FOR NEXT SPECIMEN. ALIGN QR...');
              setPresentedTx(null);
              setScannedTx(null);
            }, 3400);
          } else {
            playErrorBeep();
            setScanState('error');
            setScanFeedback(`VERIFY FAIL: ${res.error || "Blocked due to active penalties"}`);
            
            setTimeout(() => {
              setScanState('idle');
              setScanFeedback('READY FOR NEXT SPECIMEN. ALIGN QR...');
              setPresentedTx(null);
              setScannedTx(null);
            }, 4500);
          }
        }, 1000);
      }, 1200);
    } else {
      playErrorBeep();
      setScanState('error');
      setScanFeedback(`VERIFICATION FAILURE: No active borrows found holding code or title matching "${manualQrInput}"`);
      setTimeout(() => {
        setScanState('idle');
        setScanFeedback('READY FOR NEXT SPECIMEN. ALIGN QR...');
      }, 4500);
    }
  };

  // 1. Math formulas to compute telemetry percentages
  const totalBooksCount = books.reduce((acc, b) => acc + b.count, 0);
  const checkedOutCount = transactions.filter(t => t.status === 'issued' || t.status === 'overdue').length;
  const activeFineCount = transactions.filter(t => t.fineAmount > 0).reduce((acc, t) => acc + t.fineAmount, 0);

  // 2. Compute dynamic Category Distribution for SVG Bar chart
  const categoriesMap = books.reduce((acc, book) => {
    acc[book.category] = (acc[book.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barChartData = Object.entries(categoriesMap).map(([name, val]) => ({ name, val }));
  const maxVal = Math.max(...barChartData.map(d => d.val), 1);

  // Add Book handler
  const handleAddBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) return;

    const gradients = [
      'from-cyan-500 via-sky-600 to-blue-700',
      'from-indigo-600 via-purple-700 to-pink-800',
      'from-rose-500 via-pink-600 to-purple-700',
      'from-violet-600 via-indigo-700 to-blue-800',
      'from-emerald-500 via-teal-600 to-cyan-700'
    ];

    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const newBook: Book = {
      id: `b_custom_${Date.now()}`,
      title,
      author,
      isbn: isbn || `978-0-${Math.floor(Math.random() * 899999 + 100000)}-0`,
      category,
      rating: 5.0,
      available: true,
      count: 3,
      description: description || "An elegant newly published research dossier representing state-of-the-art computational workflows.",
      coverGradient: randomGradient,
      accentColor: '#22d3ee',
      year: new Date().getFullYear(),
      pages: Number(pages) || 280,
      reviews: []
    };

    onAddBook(newBook);
    setSuccessMsg(`Successfully cataloged: "${title}" into active racks!`);
    
    // Clear
    setTitle('');
    setAuthor('');
    setIsbn('');
    setDescription('');
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 4500);
  };

  const handleBulkImport = async () => {
    const csvBooks = [
      ["Five Point Someone", "Chetan Bhagat", "978-81-291-0459-5", 2004, "Contemporary Fiction", "https://covers.openlibrary.org/b/isbn/9788129104595-L.jpg"],
      ["The God of Small Things", "Arundhati Roy", "978-0679457312", 1997, "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9780679457312-L.jpg"],
      ["A Fine Balance", "Rohinton Mistry", "978-0571190843", 1995, "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9780571190843-L.jpg"],
      ["The White Tiger", "Aravind Adiga", "978-1416562597", 2008, "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9781416562597-L.jpg"],
      ["A Suitable Boy", "Vikram Seth", "978-0060786526", 1993, "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9780060786526-L.jpg"],
      ["The Inheritance of Loss", "Kiran Desai", "978-0802142818", 2006, "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9780802142818-L.jpg"],
      ["Midnight's Children", "Salman Rushdie", "978-0099582076", 1981, "Magical Realism", "https://covers.openlibrary.org/b/isbn/9780099582076-L.jpg"],
      ["Indian Mythology", "Devdutt Pattanaik", "978-0892818709", 2003, "Mythology", "https://covers.openlibrary.org/b/isbn/9780892818709-L.jpg"],
      ["The Pathless Path", "Preeti Shenoy", "978-9353337196", 2020, "Self-Help", "https://covers.openlibrary.org/b/isbn/9789353337196-L.jpg"],
      ["Awake and Dreaming", "Chetan Bhagat", "978-8129132543", 2008, "Poetry", "https://covers.openlibrary.org/b/isbn/9788129132543-L.jpg"],
      ["The Palace of Illusions", "Chitra Banerjee Divakaruni", "978-0385519732", 2008, "Mythological Fiction", "https://covers.openlibrary.org/b/isbn/9780385519732-L.jpg"],
      ["Matru Devi Se Sanjay Tak", "Sudha Murty", "978-0143451624", 2020, "Contemporary", "https://covers.openlibrary.org/b/isbn/9780143451624-L.jpg"],
      ["The Elephant, the Tiger, and the Cellphone", "Shashi Tharoor", "978-0802142801", 2007, "Non-Fiction", "https://covers.openlibrary.org/b/isbn/9780802142801-L.jpg"],
      ["Mother Mary Comes to Me", "Arundhati Roy", "978-0593596716", 2025, "Memoir", "https://covers.openlibrary.org/b/isbn/9780593596716-L.jpg"],
      ["The Far Field", "Madhuri Vijay", "978-1984820038", 2019, "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9781984820038-L.jpg"]
    ];

    const { db } = getFirebase();
    const booksRef = collection(db, 'books');

    for (const [title, author, isbn, year, category, coverImage] of csvBooks) {
      const q = query(booksRef, where('isbn', '==', isbn));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        console.log(`Skipping duplicate: ${title}`);
        continue;
      }

      await addDoc(booksRef, {
        title, author, isbn, year, category, coverImage,
        rating: 5, available: true, count: 1, description: 'Imported book',
        coverGradient: 'from-stone-900 to-stone-950', accentColor: 'blue', pages: 200
      });
      console.log(`Added: ${title}`);
    }
    setSuccessMsg("Successfully imported all books!");
  };

  return (
    <div className="w-full font-sans select-none space-y-6 py-4">
      
      {/* 1. SECURE SYSTEM METADATA HEADER */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-amber-700 stroke-[2]" />
          <div>
            <h4 className="text-sm font-black font-sans text-amber-950 tracking-wide">ADMIN CONTROL CENTER</h4>
            <p className="text-[11px] text-stone-600 font-medium">Secured Librarianship Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap">
          <button
            id="open-scan-qr-btn"
            disabled={currentRole === 'student'}
            onClick={() => {
              setIsScanModalOpen(true);
              setUseRealCamera(false);
              setPresentedTx(null);
              setScanState('idle');
              setScanFeedback('READY FOR SPECIMEN. PLACE BOOK IN VIEWPORT LENS WITH "PRESENT QR"...');
            }}
            className={`flex items-center gap-2 p-2 px-3.5 rounded-lg text-[10px] font-mono tracking-wider font-extrabold uppercase border transition-all cursor-pointer ${
              currentRole === 'student'
                ? 'opacity-40 bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                : hasOverdueInSystem
                ? 'bg-amber-600/20 border-amber-500/80 text-amber-950 animate-gold-pulse'
                : 'bg-amber-600/15 border-amber-600/25 text-amber-900 hover:bg-amber-600/25 hover:border-amber-600/45 shadow-sm'
            }`}
          >
            <QrCode className="w-4 h-4 text-amber-750 shrink-0" />
            <span>Scan Returns</span>
          </button>

          <div className="flex gap-2">
            {(['student', 'librarian', 'admin'] as const).map((role) => (
            <button
              id={`role-btn-${role}`}
              key={role}
              onClick={() => onSetRole(role)}
              className={`p-2 px-3 rounded-lg text-[10px] font-mono tracking-widest uppercase border transition-all cursor-pointer ${
                currentRole === role
                  ? 'bg-amber-600 text-white border-amber-600 shadow-[0_2px_8px_rgba(212,175,55,0.3)]'
                  : 'bg-[#faf8f5] border-stone-200 text-stone-500 hover:text-stone-800'
              }`}
            >
              {role}
            </button>
          ))}
          </div>
        </div>
      </div>

      {currentRole === 'student' ? (
        <div className="p-8 border border-stone-200 rounded-2xl bg-white text-center text-stone-500 max-w-xl mx-auto py-12 flex flex-col items-center shadow-sm">
          <Shield className="w-10 h-10 text-stone-300 mb-3" />
          <p className="text-xs font-mono font-bold text-stone-700">Academic clearances required.</p>
          <p className="text-[11px] text-stone-500 mt-1">Switch your clearance tier to "Librarian" or "Admin" in the block above to gain management controls.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* STATS ANALYTICS (2/3 WIDTH) */}
          <div className="lg:col-span-2 space-y-6 text-stone-850">
            
            {/* Direct Cards strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4.5 rounded-xl border border-stone-150 bg-white relative overflow-hidden shadow-sm">
                <span className="text-[10px] font-mono text-stone-500 uppercase font-bold">Available Spine Stock</span>
                <div className="text-xl font-bold font-mono text-stone-850 mt-1">{totalBooksCount} RACK COPIES</div>
                <div className="text-[9px] text-[#926f1a] font-mono mt-1 font-bold">✓ Storage arrays optimized</div>
              </div>
              <div className="p-4.5 rounded-xl border border-stone-150 bg-white relative overflow-hidden shadow-sm">
                <span className="text-[10px] font-mono text-stone-500 uppercase font-bold">Active Borrows in Orbit</span>
                <div className="text-xl font-bold font-mono text-stone-850 mt-1">{checkedOutCount} ACTIVE TRANS</div>
                <div className="text-[9px] text-amber-700 font-mono mt-1 font-bold">★ 14 days standard duration</div>
              </div>
              <div className="p-4.5 rounded-xl border border-stone-150 bg-white relative overflow-hidden shadow-sm">
                <span className="text-[10px] font-mono text-stone-500 uppercase font-bold">Fines Pipeline Pending</span>
                <div className="text-xl font-bold font-mono text-stone-850 mt-1">₹{activeFineCount} OVERDUE</div>
                <div className="text-[9px] text-rose-600 font-mono mt-1 font-bold">⚠ Calculated dynamically</div>
              </div>
            </div>

            {/* HIGH END SVG BAR CHART */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-stone-150 pb-3">
                <h3 className="text-xs font-bold font-mono text-amber-900 uppercase flex items-center gap-1.5">
                  <BarChart className="w-4 h-4 text-amber-700" /> Catalog Genre Distributions
                </h3>
                <span className="text-[9px] font-mono text-stone-500 font-bold">DYNAMIC BOOK VOLUMES</span>
              </div>

              {/* Responsive SVG Bar Layout */}
              <div className="w-full h-56 flex items-end gap-3.5 pt-4">
                {barChartData.map((item, idx) => {
                  const pct = (item.val / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                      <div className="text-[10px] font-mono text-amber-805 font-bold opacity-0 group-hover:opacity-100 mb-1.5 transition-opacity">
                        {item.val}
                      </div>
                      
                      {/* Interactive Bar */}
                      <div
                        className="w-full bg-gradient-to-t from-amber-650/35 via-amber-500/50 to-amber-400 rounded-t-lg transition-all duration-500 min-h-[10px] shadow-[0_1px_6px_rgba(217,119,6,0.1)] group-hover:to-amber-500 group-hover:shadow-[0_2px_12px_rgba(212,175,55,0.35)]"
                        style={{ height: `${pct * 0.75}%` }}
                      />

                      <div className="text-[9px] font-mono text-stone-500 mt-2 truncate w-full text-center hover:text-stone-800 uppercase tracking-wider font-semibold">
                        {item.name.substring(0, 4)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SYSTEM LINE GRAPH ACTIVITY AREA */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold font-mono text-[#926f1a] uppercase flex items-center gap-1.5">
                  <AreaChart className="w-4 h-4 text-[#926f1a]" /> Daily Transacting Wave (Weekly Peak)
                </h3>
                <span className="text-[9px] font-mono text-stone-500 font-bold">LIVE STREAM - {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              {/* Spline Wave drawing via custom SVG */}
              <div className="w-full h-24">
                <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradient-wave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dfbd69" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#dfbd69" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(146,111,26,0.06)" strokeDasharray="5,5" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(146,111,26,0.06)" strokeDasharray="5,5" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(146,111,26,0.06)" strokeDasharray="5,5" />

                  {/* Shaded Area */}
                  <path
                    d="M0,90 Q40,40 80,75 T160,25 T240,65 T320,15 T400,60 L400,100 L0,100 Z"
                    fill="url(#gradient-wave)"
                  />
                  {/* Spine Stroke */}
                  <path
                    d="M0,90 Q40,40 80,75 T160,25 T240,65 T320,15 T400,60"
                    fill="none"
                    stroke="#aa7c11"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="flex justify-between items-center text-[8px] font-mono text-stone-500 mt-2 font-bold">
                <span>MON (MOCK)</span>
                <span>WED</span>
                <span>FRI</span>
                <span>SUN (PEAK)</span>
              </div>
            </div>

          </div>

          {/* LIBRARIAN INVENTORY CONTROL (1/3 WIDTH) */}
          <div className="lg:col-span-1 rounded-2xl bg-white border border-stone-200 p-5 flex flex-col justify-between shadow-sm">
            <form onSubmit={handleAddBookSubmit} className="space-y-4">
              <div className="border-b border-stone-150 pb-3 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-705" />
                <h3 className="text-xs font-bold font-mono tracking-widest text-amber-900 uppercase">Spine Curator</h3>
              </div>

              {successMsg && (
                <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-50 text-emerald-700 text-xs font-mono font-medium flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> {successMsg}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-stone-500 block font-bold">Dossier Title</label>
                <input
                  id="admin-book-title"
                  type="text"
                  placeholder="e.g. Astro-biology of Nebula Spores"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-2 text-stone-900 focus:outline-none focus:border-amber-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-stone-500 block font-bold">Lead Researcher / Author</label>
                <input
                  id="admin-book-author"
                  type="text"
                  placeholder="e.g. Dr. Jennifer Vance"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-2 text-stone-900 focus:outline-none focus:border-amber-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-stone-500 block font-bold">Sector / Category</label>
                  <select
                    id="admin-book-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-2 text-stone-800 focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Technology">Technology</option>
                    <option value="Science">Science</option>
                    <option value="Business">Business</option>
                    <option value="Academic">Academic</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Medical">Medical</option>
                    <option value="Fiction">Fiction</option>
                    <option value="History">History</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-stone-500 block font-bold">Record Pages</label>
                  <input
                    type="number"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    className="w-full text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-2 text-stone-900 focus:outline-none focus:border-amber-500 font-medium"
                    min="10"
                    max="2000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-stone-500 block font-bold">ISBN Stamp (Optional)</label>
                <input
                  type="text"
                  placeholder="ISBN Auto-generated if empty"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className="w-full text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-2 text-stone-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-stone-500 block font-bold">Dossier Overview Abstract</label>
                <textarea
                  placeholder="Enter futuristic abstract catalog overview..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-16 text-xs bg-[#faf8f5] border border-stone-300 rounded-lg px-2.5 py-2 text-stone-900 focus:outline-none focus:border-amber-500 resize-none font-medium"
                  maxLength={200}
                />
              </div>

              <button
                id="add-book-submit-btn"
                type="submit"
                className="w-full py-2.5 text-xs font-bold rounded-xl text-stone-950 bg-gradient-to-r from-[#dfbd69] via-[#d4af37] to-[#aa7c11] hover:brightness-105 transition-all cursor-pointer text-center"
              >
                + Catalog into Active Vaults
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="w-full mt-3 py-2.5 text-xs font-bold rounded-xl text-stone-700 bg-stone-100 hover:bg-stone-200 transition-all cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" /> Bulk Import Books
              </button>
            </form>

            <div className="border-t border-stone-150 pt-4 mt-5 text-[9px] text-stone-500 font-mono font-bold">
              <span>LIBR STORAGE RACKS STAT: ACTIVE DEPLOYED</span>
            </div>
          </div>

        </div>
      )}

      {/* 5. MODAL OVERLAY: QR SCANNER RETRIEVALS PORTS */}
      <AnimatePresence>
        {isScanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsScanModalOpen(false);
                setUseRealCamera(false);
              }}
              className="absolute inset-0 bg-stone-950/75 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 font-sans"
            >
              {/* Inline CSS elements for Sweep Laser / Pulse animations */}
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan-laser {
                  0% { top: 0%; }
                  50% { top: 100%; }
                  100% { top: 0%; }
                }
                @keyframes laser-glow {
                  0%, 100% { 
                    opacity: 0.6; 
                    box-shadow: 0 0 8px #dfbd69, 0 0 2px #aa7c11;
                    filter: brightness(0.9);
                  }
                  10%, 40%, 70% { 
                    opacity: 1;
                    box-shadow: 0 0 25px #dfbd69, 0 0 12px #aa7c11, 0 0 45px rgba(223,189,105,0.8);
                    filter: brightness(1.5);
                  }
                  25%, 55%, 85% {
                    opacity: 0.3;
                    box-shadow: 0 0 4px #dfbd69;
                    filter: brightness(0.7);
                  }
                }
                @keyframes grid-pulse {
                  0%, 100% { opacity: 0.15; }
                  50% { opacity: 0.3; }
                }
                .animate-scan-laser {
                  position: absolute;
                  height: 3px;
                  width: 100%;
                  background: linear-gradient(to right, transparent, rgba(212,175,55,0.8), #ffffff, rgba(212,175,55,0.8), transparent);
                  animation: scan-laser 2.5s infinite ease-in-out, laser-glow 0.8s infinite linear;
                  pointer-events: none;
                  z-index: 20;
                }
                .animate-grid-pulse {
                  animation: grid-pulse 2s infinite ease-in-out;
                }
              ` }} />

              {/* Modal Header */}
              <div className="p-5 border-b border-stone-150 flex justify-between items-center bg-stone-50 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600/15 flex items-center justify-center border border-amber-600/20 w-8 h-8 shrink-0">
                    <QrCode className="w-4.5 h-4.5 text-amber-700 text-center flex items-center justify-center" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-mono tracking-widest text-amber-950 uppercase">
                      QR RETRIEVAL DISPATCH SCANNER
                    </h3>
                    <p className="text-[10px] text-stone-500 font-mono uppercase font-semibold">
                      CURATOR QUICK DEPOSIT PROTOCOLS
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsScanModalOpen(false);
                    setUseRealCamera(false);
                  }}
                  className="p-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body: Split view */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
                
                {/* Left side: Immersive scanning viewfinder (6 cols) */}
                <div className="md:col-span-6 flex flex-col gap-4">
                  <div className="text-[10px] font-mono text-stone-400 uppercase font-bold tracking-wider">
                    SCAN VIEWPORT HUD
                  </div>

                  {/* High quality camera viewfinder wrapper */}
                  <div className="relative w-full aspect-square md:h-full md:aspect-auto md:min-h-[300px] bg-black rounded-2xl border border-stone-850 overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
                    
                    {/* Retro Corner brackets overlay */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#dfbd69]/60 pointer-events-none" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#dfbd69]/60 pointer-events-none" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#dfbd69]/60 pointer-events-none" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#dfbd69]/60 pointer-events-none" />

                    {/* Sweep Scanning red line */}
                    {scanState === 'decoding' && <div className="animate-scan-laser z-20" />}

                    {/* Webcam view element */}
                    {useRealCamera ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover z-0 scale-x-[-1]"
                      />
                    ) : (
                      /* Animated Particle Matrix fallback if no webcam camera active */
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,32,15,0.4)_1px,transparent_1px)] bg-[size:16px_16px] animate-grid-pulse opacity-15 z-0" />
                    )}

                    {/* HUD Status line top */}
                    <div className="flex justify-between items-center z-10 text-[9px] font-mono text-slate-400 select-none bg-black/45 p-2 rounded-lg backdrop-blur-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${scanState === 'decoding' ? 'bg-amber-500 animate-ping' : 'bg-green-500'} inline-block`} />
                        <span>PORTAL_LINK_ONLINE</span>
                      </div>
                      <span>FPS: 60.00 // L: 14ms</span>
                    </div>

                    {/* Main target aperture */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 font-sans">
                      <div className={`w-[65%] h-[65%] max-w-[220px] max-h-[220px] rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center bg-stone-950/85 p-3 ${
                        scanState === 'success' 
                          ? 'border-emerald-500 bg-emerald-950/40'
                          : scanState === 'error'
                          ? 'border-rose-500 bg-rose-950/40'
                          : 'border-[#dfbd69]/45'
                      }`}>
                        {presentedTx ? (
                          <div className="flex flex-col items-center gap-1.5 w-full">
                            {scanState === 'success' ? (
                              <Check className="w-10 h-10 text-emerald-400 stroke-[3] bg-emerald-500/25 p-2 rounded-full animate-bounce" />
                            ) : scanState === 'error' ? (
                              <AlertTriangle className="w-10 h-10 text-rose-450 stroke-[2.5] bg-rose-500/25 p-2 rounded-full animate-pulse" />
                            ) : (
                              /* Dynamic simulation QR Code grid of the presented book! */
                              <div className="bg-white p-1 rounded-md border border-amber-600/20 shadow-md transform scale-105">
                                <div className="grid grid-cols-6 gap-0.5 w-[52px] h-[52px]">
                                  {(() => {
                                    const qrGrid = [];
                                    const str = presentedTx.bookId;
                                    for (let i = 0; i < 36; i++) {
                                      const code = str.charCodeAt(i % str.length);
                                      const isAnchor = 
                                        (i === 0 || i === 1 || i === 6 || i === 7) || 
                                        (i === 4 || i === 5 || i === 10 || i === 11) || 
                                        (i === 24 || i === 25 || i === 30 || i === 31);
                                      const isDark = isAnchor || ((code + i) % 2 === 0);
                                      qrGrid.push(isDark);
                                    }
                                    return qrGrid.map((dark, idx) => (
                                      <div 
                                        key={idx} 
                                        className={`w-full h-full rounded-[1px] ${dark ? 'bg-stone-900' : 'bg-transparent'}`}
                                      />
                                    ));
                                  })()}
                                </div>
                              </div>
                            )}
                            <div className="text-center">
                              <span className="text-[7px] font-mono font-black text-[#dfbd69] tracking-wider block">
                                BOOK_QR_{presentedTx.bookId.toUpperCase()}
                              </span>
                              <span className="text-[9px] font-sans font-bold text-stone-200 block truncate max-w-[130px] leading-tight">
                                {presentedTx.bookTitle}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center p-2 text-stone-500 bg-black/45 rounded-xl">
                            <Camera className="w-8 h-8 text-[#dfbd69]/25 stroke-[1.5] mb-1.5" />
                            <p className="text-[9px] font-mono uppercase tracking-wider text-[#dfbd69]/65">
                              LENS IS EMPTY
                            </p>
                            <p className="text-[8px] text-stone-500 mt-1 leading-normal max-w-[130px] select-none pointer-events-none">
                              Select static borrowed card on right to present the spine QR
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* HUD diagnostic information panel bottom */}
                    <div className="z-10 p-3 bg-black/90 rounded-xl border border-white/5 backdrop-blur-md space-y-1.5 relative pointer-events-auto">
                      <div className="flex justify-between items-center select-none text-[8px] font-mono text-stone-500">
                        <span>DECODER STATE</span>
                        <span className="text-[#dfbd69] uppercase font-bold">{scanState}</span>
                      </div>
                      <div className={`text-[10px] font-mono uppercase tracking-wider font-extrabold select-text transition-colors min-h-[16px] ${
                        scanState === 'success' 
                          ? 'text-emerald-400' 
                          : scanState === 'error' 
                          ? 'text-rose-400' 
                          : 'text-stone-200'
                      }`}>
                        {scanFeedback}
                      </div>

                      {presentedTx && scanState === 'scanning' && (
                        <button
                          type="button"
                          onClick={() => handleTriggerSimulateScan()}
                          className="w-full mt-2.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-600 hover:brightness-105 active:scale-98 transition-all text-stone-950 text-[10px] font-mono font-black uppercase tracking-widest text-center cursor-pointer pointer-events-auto shadow-md"
                        >
                          🔥 EMIT LASER DECODE
                        </button>
                      )}

                      {presentedTx && (
                        <div className="pt-2 border-t border-white/5 select-none flex justify-between items-center text-[9px] font-mono text-stone-400">
                          <span className="truncate max-w-[150px] text-stone-300 font-semibold">{presentedTx.bookTitle}</span>
                          <span className="text-stone-500">USER: {presentedTx.userName.substring(0, 12)}...</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Camera toggler switches footer */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 flex justify-between items-center text-xs select-none">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-stone-500" />
                      <div>
                        <span className="font-semibold text-stone-700 block text-[11px]">Hardware Camera Screen</span>
                        <span className="text-[9px] text-stone-400 block font-medium">Capture barcodes on physical receipts</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setUseRealCamera(!useRealCamera)}
                      className={`relative w-11 h-6 rounded-full p-0.5 cursor-pointer transition-colors duration-300 shrink-0 ${
                        useRealCamera ? 'bg-amber-600' : 'bg-stone-300'
                      }`}
                    >
                      <div className={`h-5 w-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                        useRealCamera ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  {useRealCamera && cameraError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Mock webcam: {cameraError}. (Scanning operates perfectly from options panel!)
                    </div>
                  )}

                  {/* Manual Barcode entry desk key-in */}
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 mt-2 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-750 font-extrabold uppercase tracking-wider select-none">
                      <QrCode className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      <span>Manual ID / Title Scan verification</span>
                    </div>
                    <form onSubmit={handleManualQrInputReturn} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. b_nature_spirit or Spine QR..."
                        value={manualQrInput}
                        onChange={(e) => setManualQrInput(e.target.value)}
                        className="flex-1 text-xs bg-white border border-stone-250 rounded-lg px-2.5 py-1.5 font-mono text-stone-800 placeholder-stone-400 focus:outline-[#dfbd69] select-text"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-stone-900 border border-stone-850 hover:bg-stone-800 transition-colors text-amber-400 font-bold text-xs font-mono uppercase tracking-widest pointer-events-auto cursor-pointer"
                      >
                        DEPOSIT
                      </button>
                    </form>
                    <p className="text-[9px] text-stone-400 font-mono select-none">
                      Search or key-in any physical Book ID stamp to simulated laser register.
                    </p>
                  </div>

                </div>

                {/* Right side: Active checked out book slip checklists (6 cols) */}
                <div className="md:col-span-6 flex flex-col gap-4 min-h-0">
                  <div className="flex justify-between items-center select-none text-[10px] font-mono text-stone-400 font-bold uppercase tracking-wider">
                    <span>ACTIVE CHECKED OUT LIST ({transactions.filter(t => t.status === 'issued' || t.status === 'overdue').length})</span>
                    <span>CLICK DEPOSIT TO SCAN</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 max-h-[460px] pr-1 pb-2">
                    {transactions.filter(t => t.status === 'issued' || t.status === 'overdue').length === 0 ? (
                      <div className="p-10 border border-dashed border-stone-200 bg-stone-50 rounded-2xl text-center text-stone-400 text-xs italic select-none">
                        <CheckCircle className="w-10 h-10 text-stone-300 mb-2.5 mx-auto" />
                        <p className="font-bold text-stone-700 not-italic">Vaults are currently 100% full!</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Every issued book dockets files are checked back inside properly.</p>
                      </div>
                    ) : (
                      transactions.filter(t => t.status === 'issued' || t.status === 'overdue').map((tx) => {
                        const isOverdue = tx.status === 'overdue';
                        const isThisScanned = scannedTx?.id === tx.id;
                        
                        return (
                          <div 
                            key={tx.id} 
                            className={`p-4 bg-white hover:bg-stone-50/50 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between gap-4 relative overflow-hidden ${
                              isThisScanned 
                                ? 'border-[#dfbd69] ring-2 ring-[#dfbd69]/15' 
                                : 'border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2 space-y-1.5 select-none">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-extrabold uppercase ${
                                  isOverdue ? 'bg-rose-100 text-rose-750' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {isOverdue ? 'Overdue Fine' : 'Issued Lock'}
                                </span>
                                <span className="text-[9px] text-stone-400 font-mono font-bold">TX: {tx.id}</span>
                              </div>

                              <h4 className="text-xs font-bold text-stone-900 truncate tracking-tight">{tx.bookTitle}</h4>
                              
                              <div className="space-y-0.5 text-[10px] text-stone-500 font-mono">
                                <div>Borrower: <span className="text-stone-800 font-semibold">{tx.userName}</span></div>
                                <div>Due deadline: <span className={`font-semibold ${isOverdue ? "text-rose-600" : "text-stone-700"}`}>{tx.dueDate}</span></div>
                                {tx.fineAmount > 0 && <div className="text-rose-650 font-extrabold font-mono uppercase bg-rose-50 px-1 py-0.5 rounded w-max mt-1">FINE ACCRUED: ₹{tx.fineAmount}</div>}
                              </div>
                            </div>

                            {/* Deterministic QR Code visual graphics tab */}
                            <div className="flex flex-col items-center bg-[#faf8f5] p-2.5 rounded-xl border border-stone-250 relative group select-none shrink-0 w-full sm:w-28 pt-3">
                              <span className="text-[7.5px] font-mono font-black text-amber-600 mb-1 tracking-wider">SPINE QR</span>
                              <div className="w-14 h-14 bg-white p-1 rounded-lg border border-stone-200 flex flex-col justify-between shrink-0 mb-2 shadow-inner relative group-hover:border-[#dfbd69] transition-all">
                                <div className="grid grid-cols-6 gap-0.5 w-full h-full">
                                  {(() => {
                                    const qrGrid = [];
                                    const str = tx.bookId;
                                    for (let i = 0; i < 36; i++) {
                                      const code = str.charCodeAt(i % str.length);
                                      // Anchors
                                      const isAnchor = 
                                        (i === 0 || i === 1 || i === 6 || i === 7) || 
                                        (i === 4 || i === 5 || i === 10 || i === 11) || 
                                        (i === 24 || i === 25 || i === 30 || i === 31);
                                      const isDark = isAnchor || ((code + i) % 2 === 0);
                                      qrGrid.push(isDark);
                                    }
                                    return qrGrid.map((dark, index) => (
                                      <div 
                                        key={index} 
                                        className={"w-full h-full rounded-[1px] transition-all duration-300 " + (
                                          dark 
                                            ? "bg-stone-900 group-hover:bg-[#aa7c11]" 
                                            : "bg-transparent"
                                        )}
                                      />
                                    ));
                                  })()}
                                </div>
                              </div>
                              <span className="text-[7.5px] font-mono text-stone-500 mb-2 truncate max-w-full font-bold">
                                BOOK_QR_{tx.bookId.toUpperCase()}
                              </span>

                              <button
                                onClick={() => handlePresentTx(tx)}
                                disabled={scanState === 'decoding' || scanState === 'success'}
                                className={`w-full py-1 px-1 rounded-md text-[8.5px] font-mono font-black uppercase text-center transition-all cursor-pointer border ${
                                  presentedTx?.id === tx.id
                                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                                    : scanState === 'decoding' || scanState === 'success'
                                    ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                                    : 'bg-white border-stone-300 text-stone-750 hover:shadow-xs'
                                }`}
                              >
                                {presentedTx?.id === tx.id ? '🎯 ALIGNED' : '📷 PRESENT QR'}
                              </button>

                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (scanState === 'decoding' || scanState === 'success') return;
                                  await onReturnBook(tx.id);
                                }}
                                disabled={scanState === 'decoding' || scanState === 'success'}
                                className={`w-full mt-1.5 py-0.5 px-1 rounded-md text-[7px] font-mono font-extrabold uppercase text-center transition-all cursor-pointer border ${
                                  scanState === 'decoding' || scanState === 'success'
                                    ? 'bg-stone-50 text-stone-300 border-stone-150 cursor-not-allowed'
                                    : 'bg-[#faf8f5] border-stone-250 text-stone-605 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-900 shadow-xs'
                                }`}
                                title="Bypass simulation scan and return immediately"
                              >
                                ⚡ BYPASS SCAN
                              </button>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Modal footer diagnostics link */}
              <div className="p-4 bg-stone-50 border-t border-stone-150 flex justify-between items-center text-[9px] font-mono text-stone-400 select-none">
                <span>SIMULATED RETRIEVAL TERMINAL // DEVICE OPTIMAL</span>
                <span>DATA NODES INTEGRATED</span>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
