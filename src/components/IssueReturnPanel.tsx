import React, { useState, useEffect, useRef } from 'react';
import { IssueTransaction, UserProfile } from '../types';
import { Clock, ShieldAlert, CheckCircle, RefreshCcw, Wallet, QrCode, AlertCircle, ArrowUpRight, History, Calendar, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduleCalendar } from './ScheduleCalendar';
import { gsap } from 'gsap';

interface IssueReturnPanelProps {
  transactions: IssueTransaction[];
  userProfile: UserProfile;
  onReturnBook: (transactionId: string) => Promise<{ success: boolean; error?: string }> | any;
  onPayFine: (transactionId: string, amount: number) => void;
  onRenewBook: (transactionId: string) => void;
  onRechargeWallet: (amount: number) => void;
}

export function IssueReturnPanel({
  transactions,
  userProfile,
  onReturnBook,
  onPayFine,
  onRenewBook,
  onRechargeWallet,
}: IssueReturnPanelProps) {
  const [showQrTxId, setShowQrTxId] = useState<string | null>(null);
  const [rechargeAmt, setRechargeAmt] = useState('');
  const [showRechargeInput, setShowRechargeInput] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'active' | 'history'>('active');

  // Scanner Simulator States on Student interface
  const [scanningTx, setScanningTx] = useState<IssueTransaction | null>(null);
  const [panelScanState, setPanelScanState] = useState<'idle' | 'ready_to_decode' | 'scanning' | 'success' | 'error'>('idle');
  const [panelScanFeedback, setPanelScanFeedback] = useState('STANDBY: ALIGN BOOK IN DISPATCH PLANAR SCANNER');

  const playBeepLocal = (freq = 800, duration = 0.08) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const handlePlaceBookInTray = (tx: IssueTransaction) => {
    setPanelScanState('ready_to_decode');
    setPanelScanFeedback('BOOK SPECIMEN ALIGNED. VIEWPORT HAS EXTRACTED SPINE QR.');
    playBeepLocal(600, 0.1);
  };

  const startLocalScanReturn = (tx: IssueTransaction) => {
    setPanelScanState('scanning');
    setPanelScanFeedback('LOCK-ON ACQUIRED! PROCESSING QR SIGNATURE GRIDS...');
    playBeepLocal(880, 0.1);

    setTimeout(() => {
      setPanelScanFeedback('DECODING BOOK_QR CHECKSUM IN MAIN DISPATCH DOCKETS...');
      playBeepLocal(980, 0.08);

      setTimeout(() => {
        executeActualReturn(tx.id);
      }, 950);
    }, 1100);
  };

  const executeActualReturn = async (txId: string) => {
    setPanelScanFeedback('SUCCESS! SQUEEZING RETURNING BOOK DOCKET...');
    playBeepLocal(1046, 0.12);
    
    try {
      const res = await onReturnBook(txId);
      if (res && res.success === false) {
        setPanelScanState('error');
        setPanelScanFeedback(`VERIFICATION DECLINED: ${res.error || "Please clear outstanding balances first."}`);
        playBeepLocal(180, 0.35);
        return;
      }
      playBeepLocal(1046, 0.15);
      setTimeout(() => playBeepLocal(1318, 0.15), 100);
      setPanelScanState('success');
      setPanelScanFeedback('VERIFIED! BOOK RETURNED SUCCESSFULLY TO THE VAULT.');
      setTimeout(() => {
        setScanningTx(null);
        setPanelScanState('idle');
      }, 2000);
    } catch (err) {
      await onReturnBook(txId);
      setPanelScanState('success');
      setPanelScanFeedback('VERIFIED! BOOK RETURNED IN OFFLINE BACKUP.');
      setTimeout(() => {
        setScanningTx(null);
        setPanelScanState('idle');
      }, 1800);
    }
  };

  const balanceRef = useRef(userProfile.balance || 0);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetBalance = userProfile.balance || 0;
    
    gsap.to(balanceRef, {
      current: targetBalance,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        if (displayRef.current) {
          displayRef.current.innerText = `₹ ${Math.round(balanceRef.current).toLocaleString()}`;
        }
      }
    });
  }, [userProfile.balance]);

  const activeTransactions = transactions.filter(t => t.userEmail === userProfile.email && (t.status === 'issued' || t.status === 'overdue'));
  const historyTransactions = transactions.filter(t => t.userEmail === userProfile.email && t.status === 'returned');

  const handleWalletRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(rechargeAmt);
    if (isNaN(num) || num <= 0) return;
    onRechargeWallet(num);
    setRechargeAmt('');
    setShowRechargeInput(false);
  };

  // Helper code to render an elegant synthetic pseudo-QR matrix block representing physical book Identification Code
  const renderQrMatrix = (bookId: string, bookTitle: string) => {
    // Generate a hash based on the bookId to draw customized patterns deterministically
    const hash = bookId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rows = 12;
    const cols = 12;
    const cells = [];
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Pseudo logic to populate QR pixel points based on indices
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
            className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 ${
              filled ? 'bg-amber-600 shadow-[0_1px_4px_rgba(212,175,55,0.4)]' : 'bg-transparent'
            }`}
          />
        );
      }
    }

    return (
      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col items-center gap-2">
        <div className="grid grid-cols-12 gap-1 bg-white p-3 rounded-lg border border-amber-500/20 shadow-sm">
          {cells}
        </div>
        <span className="text-[10px] font-mono tracking-wider text-amber-900 font-extrabold uppercase mt-1">BOOK CODES: BOOK_QR_{bookId.toUpperCase()}</span>
        <span className="text-[9px] font-sans text-stone-500 text-center max-w-[200px] leading-tight">Present this secure Spine QR to the desk scanner for returns</span>
      </div>
    );
  };

  return (
    <div className="w-full font-sans select-none grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 py-4">
      
      {/* 1. SECURE WALLET & STATISTICS RAIL */}
      <div className="md:col-span-1 xl:col-span-1 rounded-2xl bg-white border border-stone-200 p-5 flex flex-col justify-between shadow-sm text-stone-850 h-[525px] overflow-hidden">
        <div>
          <div className="flex justify-between items-center border-b border-stone-150 pb-3 mb-4">
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#926f1a] uppercase">Profile Core</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 font-bold capitalize">
              Role: {userProfile.role}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 relative overflow-hidden mb-5">
            <div className="absolute top-0 right-0 p-3 text-amber-600 opacity-25">
              <Wallet className="w-12 h-12" />
            </div>
            <span className="text-[10px] font-mono tracking-wider text-stone-500 uppercase font-bold">Scholar Wallet Credits</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1 flex items-center gap-1.5" ref={displayRef}>
              ₹ {(userProfile.balance || 0).toLocaleString()}
            </div>
            
            {!showRechargeInput ? (
              <button
                onClick={() => setShowRechargeInput(true)}
                className="mt-3 text-[10px] font-mono text-amber-700 flex items-center gap-1 hover:underline cursor-pointer font-bold"
              >
                + Top Up Wallet Passport
              </button>
            ) : (
              <form onSubmit={handleWalletRecharge} className="mt-3 flex gap-2">
                <input
                  type="number"
                  placeholder="Amt in ₹"
                  value={rechargeAmt}
                  onChange={(e) => setRechargeAmt(e.target.value)}
                  className="bg-white border border-stone-300 rounded px-2 py-1 text-xs font-mono text-stone-850 focus:outline-none focus:border-amber-500 w-24"
                  min="10"
                  max="5000"
                  required
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-[#dfbd69] text-stone-950 text-xs font-bold hover:brightness-105 transition-all cursor-pointer"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => setShowRechargeInput(false)}
                  className="text-stone-400 text-xs px-1 cursor-pointer"
                >
                  X
                </button>
              </form>
            )}
          </div>

          {/* Gamification Badges inventory */}
          <div>
            <span className="text-[11px] font-mono tracking-wider text-stone-500 uppercase font-bold">Achievements unlocked ({userProfile.badges?.length || 0})</span>
            <div className="grid grid-cols-1 gap-2.5 mt-3">
              {(userProfile.badges || []).map((badge) => (
                <div key={badge.id} className="p-2.5 rounded-lg border border-stone-150 bg-stone-50/50 flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shrink-0">
                    <CheckCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-stone-850">{badge.name}</h5>
                    <p className="text-[9px] text-stone-500">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-stone-150 pt-4 mt-5 text-[11px] text-stone-500 font-mono flex flex-col gap-1 font-semibold">
          <span>LEDGER STATUS: AUTOMATIC SYNC</span>
          <span>FINE CALCULATION: ₹10/DAY OVERDUE</span>
        </div>
      </div>
      
      {/* 2. CALENDAR COMPONENT */}
      <div className="md:col-span-1 xl:col-span-1 border-stone-200 shadow-sm text-stone-850">
        <ScheduleCalendar transactions={transactions.filter(t => t.userEmail === userProfile.email)} />
      </div>

      {/* 3. TRANSACTION LIST & TIMELINE (2 COLUMNS) */}
      <div className="md:col-span-2 xl:col-span-2 flex flex-col justify-between text-stone-850 h-[525px]">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Timeline Filter Header */}
          <div className="flex gap-2 border-b border-stone-200 pb-3 mb-4">
            <button
              id="active-borrows-tab"
              onClick={() => setTimelineFilter('active')}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono border uppercase tracking-wider transition-all cursor-pointer ${
                timelineFilter === 'active'
                  ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/15 border-amber-500/80 text-amber-950 shadow-[0_2px_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'bg-transparent border-stone-200 text-stone-500 hover:text-stone-800'
              }`}
            >
              Active Checkouts ({activeTransactions.length})
            </button>
            <button
              id="borrows-history-tab"
              onClick={() => setTimelineFilter('history')}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono border uppercase tracking-wider transition-all cursor-pointer ${
                timelineFilter === 'history'
                  ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/15 border-amber-500/80 text-amber-950 shadow-[0_2px_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'bg-transparent border-stone-200 text-stone-500 hover:text-stone-800'
              }`}
            >
              Archived History ({historyTransactions.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {timelineFilter === 'active' && activeTransactions.length === 0 && (
                <div className="p-8 text-center bg-stone-50 border border-stone-150 rounded-2xl flex flex-col items-center text-stone-405 py-12">
                  <Clock className="w-8 h-8 text-stone-300 mb-3" />
                  <p className="text-xs font-mono font-bold text-stone-400">No active books checked out.</p>
                  <p className="text-[10px] text-stone-400 mt-1">Visit the Vault slider to issue a dynamic text.</p>
                </div>
              )}

              {timelineFilter === 'history' && historyTransactions.length === 0 && (
                <div className="p-8 text-center bg-stone-50 border border-stone-150 rounded-2xl flex flex-col items-center text-stone-405 py-12">
                  <History className="w-8 h-8 text-stone-300 mb-3" />
                  <p className="text-xs font-mono font-bold text-stone-400">Archive folder is empty.</p>
                </div>
              )}

              {/* TIMELINE RENDER CARD */}
              {(timelineFilter === 'active' ? activeTransactions : historyTransactions).map((tx) => {
                const isOverdue = tx.status === 'overdue' || (tx.status === 'issued' && new Date(tx.dueDate) < new Date());
                const currentFineAmt = tx.fineAmount;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={tx.id}
                    className={`rounded-xl p-4 border transition-all duration-300 bg-white ${
                      isOverdue 
                        ? 'border-rose-300 bg-rose-50/50 hover:shadow-[0_4px_12px_rgba(239,68,68,0.15)]' 
                        : 'border-stone-150 hover:border-stone-250 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      
                      {/* Name & Dates block */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-stone-850 font-sans">{tx.bookTitle}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-widest font-semibold uppercase ${
                            tx.status === 'returned'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 animate-pulse border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-250/50'
                          }`}>
                            {tx.status === 'returned' ? 'RETURNED' : isOverdue ? 'OVERDUE FINE' : 'ACTIVE'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2.5 text-xs text-stone-500 font-mono">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-stone-400" /> Issued: {tx.issueDate}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-stone-400" /> Due: {tx.dueDate}</span>
                          {tx.returnDate && (
                            <span className="col-span-2 text-emerald-600 flex items-center gap-1.5 mt-0.5 font-semibold"><CheckCircle className="w-3.5 h-3.5 text-emerald-505" /> Returned On: {tx.returnDate}</span>
                          )}
                        </div>
                      </div>

                      {/* Timeline Actions / Fines check */}
                      <div className="flex flex-wrap md:flex-col items-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-stone-150 pt-3 md:pt-0">
                        {tx.status !== 'returned' && (
                          <div className="flex items-center gap-2">
                            {/* QR scanner launch button */}
                            <button
                              onClick={() => setShowQrTxId(showQrTxId === tx.id ? null : tx.id)}
                              className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
                              title="Generate Physical Pass Scan Grid"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            {/* Renew Book Option */}
                            <button
                              onClick={() => onRenewBook(tx.id)}
                              className="px-3 py-2 rounded-xl text-xs font-bold font-mono bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" /> Renew
                            </button>

                            {/* Return Book option */}
                            <button
                              id={`return-btn-${tx.id}`}
                              onClick={() => {
                                setScanningTx(tx);
                                setPanelScanState('idle');
                                setPanelScanFeedback('ALIGN THE BOOK QR IN THE SCAN VIRTUAL DEPOT...');
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-950 bg-gradient-to-r from-[#dfbd69] via-[#d4af37] to-[#aa7c11] hover:brightness-105 transition-all duration-150 cursor-pointer"
                            >
                              Return Spine
                            </button>
                          </div>
                        )}

                        {/* Fine tracker widget */}
                        {currentFineAmt > 0 && (
                          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end bg-rose-50 p-2 py-1.5 rounded-lg border border-rose-150 animate-pulse">
                            <span className="text-xs text-rose-700 font-mono font-bold flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Fine: ₹{currentFineAmt}
                            </span>
                            {!tx.finePaid && (
                              <button
                                id={`pay-fine-${tx.id}`}
                                onClick={() => onPayFine(tx.id, currentFineAmt)}
                                className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                              >
                                Pay Fine
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Expandable Pseudo QR matrix passport block */}
                    {showQrTxId === tx.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-3 border-t border-stone-150 flex justify-center"
                      >
                        {renderQrMatrix(tx.bookId, tx.bookTitle)}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* IMMERSIVE STUDENT SCAN-RETURN VERIFICATION MODAL */}
      <AnimatePresence>
        {scanningTx && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-stone-900 border border-stone-850 rounded-3xl max-w-sm w-full p-6 text-stone-100 shadow-2xl relative overflow-hidden"
            >
              {/* Retro digital screens header */}
              <div className="flex justify-between items-center border-b border-stone-800 pb-3 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#dfbd69] uppercase font-extrabold">Desk Scanner Check-In</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScanningTx(null);
                    setPanelScanState('idle');
                  }}
                  className="text-stone-400 hover:text-white font-mono text-xs cursor-pointer transition-colors p-1"
                >
                  ✕
                </button>
              </div>

              {/* Book Info Block */}
              <div className="bg-stone-950/40 p-3 rounded-xl border border-stone-800/60 flex items-center gap-3 mb-4 select-none">
                <div className="w-10 h-14 rounded bg-stone-800 flex items-center justify-center border border-stone-700 font-mono text-[9px] text-[#dfbd69] font-bold shrink-0">
                  SPINE
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-mono tracking-widest text-[#dfbd69] uppercase font-bold">SPECIMEN RECALL</span>
                  <h4 className="text-xs font-bold text-stone-100 truncate mt-0.5 leading-tight">{scanningTx.bookTitle}</h4>
                  <p className="text-[9px] text-stone-400 font-mono mt-0.5">ID: {scanningTx.bookId.toUpperCase()}</p>
                </div>
              </div>

              {/* Live Laser Simulation Viewport */}
              <div className="bg-black rounded-xl border border-stone-800 p-4 py-6 flex flex-col items-center gap-4 relative overflow-hidden my-3 select-none">
                {/* Horizontal Neon Red Laser Sweep */}
                {panelScanState === 'scanning' && (
                  <div className="absolute left-0 right-0 h-[2.5px] bg-[#dfbd69] shadow-[0_0_12px_rgba(212,175,55,0.95)] animate-bounce w-full z-10" style={{ animationDuration: '1.4s' }} />
                )}

                {panelScanState === 'idle' ? (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-800 flex flex-col items-center justify-center p-2 text-stone-550 bg-stone-950/40">
                    <Camera className="w-8 h-8 text-stone-700 animate-pulse mb-1" />
                    <span className="text-[7px] text-stone-500 font-mono tracking-tighter uppercase text-center">Tray Empty</span>
                  </div>
                ) : (
                  /* Simulated QR Code on spine (displayed once book is aligned in tray!) */
                  <div className="relative p-2.5 bg-white rounded-lg border border-[#dfbd69]/30 shadow-md">
                    <div className="grid grid-cols-10 gap-0.5 w-20 h-20">
                      {(() => {
                        const hash = scanningTx.bookId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const cells = [];
                        for (let i = 0; i < 100; i++) {
                          const r = Math.floor(i / 10);
                          const c = i % 10;
                          const isCorner = (r < 3 && c < 3) || (r < 3 && c >= 7) || (r >= 7 && c < 3);
                          const filled = isCorner 
                            ? (r === 0 || r === 2 || c === 0 || c === 2 || (r === 1 && c === 1))
                            : (hash * (r + 1) * (c + 2)) % 3 === 0 || (hash + r + c) % 5 === 0;
                          cells.push(filled);
                        }
                        return cells.map((filled, idx) => (
                          <div key={idx} className={`w-full h-full rounded-[1px] ${filled ? 'bg-stone-900' : 'bg-transparent'}`} />
                        ));
                      })()}
                    </div>
                  </div>
                )}

                <div className="text-center w-full px-2 space-y-1">
                  <div className={`text-[10px] font-mono tracking-wider uppercase font-black ${
                    panelScanState === 'success' 
                      ? 'text-emerald-450' 
                      : panelScanState === 'error' 
                      ? 'text-rose-500' 
                      : 'text-[#dfbd69] animate-pulse'
                  }`}>
                    {panelScanFeedback}
                  </div>
                  <div className="text-[7.5px] font-mono text-stone-500 uppercase tracking-widest leading-none">
                    TICKET_REF: BOOK_QR_{scanningTx.bookId.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Interactive buttons panel */}
              <div className="space-y-2 mt-4 font-mono select-none">
                {panelScanState === 'idle' && (
                  <button
                    type="button"
                    onClick={() => handlePlaceBookInTray(scanningTx)}
                    className="w-full py-2.5 rounded-xl text-[10px] font-mono font-extrabold tracking-widest bg-stone-800 border border-stone-700 hover:bg-stone-700 hover:border-[#dfbd69] text-stone-100 uppercase cursor-pointer transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    📖 PLACE BOOK IN VIEWPORT TRAY
                  </button>
                )}

                {panelScanState === 'ready_to_decode' && (
                  <button
                    type="button"
                    onClick={() => startLocalScanReturn(scanningTx)}
                    className="w-full py-2.5 rounded-xl text-[10px] font-mono font-black tracking-widest bg-gradient-to-r from-amber-500 via-[#d4af37] to-[#aa7c11] text-stone-950 uppercase cursor-pointer hover:brightness-105 transition-all text-center flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/10"
                  >
                    🔥 EMIT DECODE LASER SCAN
                  </button>
                )}

                {panelScanState === 'scanning' && (
                  <div className="w-full py-2.5 rounded-xl text-[9px] font-mono font-bold tracking-widest text-[#dfbd69] bg-stone-850/60 uppercase border border-stone-800/80 text-center animate-pulse">
                    Decoding spine qr codes... please wait
                  </div>
                )}

                {/* Instant bypass allows immediate return "without scanning the QR" */}
                {panelScanState !== 'success' && (
                  <button
                    type="button"
                    onClick={async () => {
                      playBeepLocal(900, 0.05);
                      await onReturnBook(scanningTx.id);
                      setScanningTx(null);
                      setPanelScanState('idle');
                    }}
                    className="w-full py-2 rounded-xl text-[9px] font-mono font-bold tracking-widest border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-850/60 uppercase cursor-pointer transition-all text-center"
                    title="Bypass simulation scan and return immediately"
                  >
                    ⚡ INSTANT BYPASS & DEPOSIT
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
