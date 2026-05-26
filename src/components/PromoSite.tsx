import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Zap, ArrowRight, CreditCard, ShoppingBag, Smartphone, Moon, Sun, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ScratchCard } from './ScratchCard';

const CARDS = [
  { id: 1, image: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600&q=80" },
  { id: 2, image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80" },
  { id: 3, image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80" }
];

function InteractiveCardDeck() {
  const [cards, setCards] = useState(CARDS);

  const nextCard = () => {
    setCards((prevCards) => {
      const newCards = [...prevCards];
      const card = newCards.shift();
      if (card) newCards.push(card);
      return newCards;
    });
  };

  const prevCard = () => {
    setCards((prevCards) => {
      const newCards = [...prevCards];
      const card = newCards.pop();
      if (card) newCards.unshift(card);
      return newCards;
    });
  };

  return (
    <div className="relative w-[280px] aspect-[4/5] md:w-[320px] flex items-center justify-center mx-auto my-4 group">
      {cards.map((card, index) => {
        return (
          <motion.div
            key={card.id}
            className="absolute rounded-2xl md:rounded-3xl shadow-xl overflow-hidden bg-slate-900 border-2 md:border-4 border-white/10"
            style={{
               zIndex: cards.length - index,
               width: '100%',
               height: '100%'
            }}
            initial={false}
            animate={{
              y: index * -15,
              scale: 1 - index * 0.05,
              opacity: 1 - index * 0.2
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            <img src={card.image} alt="Benefit" className="w-full h-full object-cover pointer-events-none" />
          </motion.div>
        );
      })}

      <div className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-8 z-50">
        <button onClick={prevCard} className="p-2 md:p-3 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-lg backdrop-blur-md text-slate-800 dark:text-white hover:scale-110 active:scale-95 transition-transform border border-slate-200 dark:border-slate-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

       <div className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-8 z-50">
        <button onClick={nextCard} className="p-2 md:p-3 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-lg backdrop-blur-md text-slate-800 dark:text-white hover:scale-110 active:scale-95 transition-transform border border-slate-200 dark:border-slate-700">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function PromoSite() {
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    // Silent Fingerprinting (Anti-fraud)
    let devId = localStorage.getItem('amz_promo_device_id');
    if (!devId) {
      devId = uuidv4();
      localStorage.setItem('amz_promo_device_id', devId);
    }
    
    // Fetch live stats
    fetch('/api/stats')
      .then(res => {
        if (!res.ok) throw new Error('API not available, fallback to local');
        return res.json();
      })
      .then(data => setAvailableCount(data.available))
      .catch((err) => {
        console.warn('Running without backend, using simulated stats', err);
        setAvailableCount(150);
      });
  }, []);

  const handleClaimClick = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const devId = localStorage.getItem('amz_promo_device_id')!;
      let code = "";

      try {
        const res = await fetch('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: devId })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to secure voucher.');
        code = data.code;
      } catch (err: any) {
         // Fallback for static hosting (GitHub Pages) where the backend doesn't exist
         if (err.message.includes('Unexpected token') || err.message.includes('API not available') || err.message === 'Failed to fetch' || err.name === 'SyntaxError') {
             console.warn("Backend unavailable, using local simulation for GitHub pages.");
             
             // Simulate local freeze period
             const lastClaimTime = localStorage.getItem('amz_last_claim_time');
             if (lastClaimTime) {
                const timeSinceLastClaimMs = Date.now() - parseInt(lastClaimTime);
                const freezePeriodMs = 6 * 60 * 60 * 1000; // 6 hours
                
                if (timeSinceLastClaimMs < freezePeriodMs) {
                   const remainingHours = Math.ceil((freezePeriodMs - timeSinceLastClaimMs) / (1000 * 60 * 60));
                   throw new Error(`You have already claimed a reward recently. Please wait ${remainingHours} hours before claiming another.`);
                }
             }

             await new Promise(r => setTimeout(r, 1000)); // Simulate delay
             localStorage.setItem('amz_last_claim_time', Date.now().toString());
             code = `AMZ-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
             setAvailableCount(prev => prev ? prev - 1 : prev);
         } else {
             throw err; // Real backend error from Express (e.g. 429 Too Many Requests)
         }
      }
      
      setVoucherCode(code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-slate-50 selection:bg-amber-500/30' : 'bg-[#f4f7f6] text-slate-800 selection:bg-amber-500/20'}`}>
      
      {/* Dynamic Background with Floating Elements for Gamified Look */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {theme === 'dark' ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/20 rounded-full blur-[120px]" />
            <div className="absolute top-[40%] right-[-10%] w-[30%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-300/40 rounded-full blur-[100px]" />
            <div className="absolute top-[50%] right-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[100px]" />
            {/* Gamified floating coins */}
            <motion.div 
              animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute top-[15%] left-[10%] text-amber-400 opacity-40 shrink-0"
            >
               <Coins size={64} />
            </motion.div>
            <motion.div 
               animate={{ y: [0, 30, 0], rotate: [0, -15, 15, 0] }}
               transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
               className="absolute top-[60%] right-[10%] text-amber-400 opacity-30 shrink-0"
            >
               <Coins size={80} />
            </motion.div>
          </>
        )}
      </div>

      <main className="relative z-10 container mx-auto px-4 py-4 md:py-20 flex flex-col items-center">
        {/* Header Controls */}
        <div className="w-full flex justify-between items-center mb-6 md:mb-12 max-w-4xl">
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md shadow-sm ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white/60 border-slate-200/60'}`}
           >
             <ShieldCheck className="w-4 h-4 text-green-500" />
             <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Secure Delivery</span>
           </motion.div>

           <motion.button
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             onClick={toggleTheme}
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className={`p-3 rounded-full border backdrop-blur-md shadow-sm transition-colors ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white/60 border-slate-200/60 text-slate-600 hover:bg-white'}`}
           >
             {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </motion.button>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mb-4 md:mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={`inline-block mb-4 md:mb-6 px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-md ${theme === 'dark' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}
          >
            🎁 Exclusive Reward Inside
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl md:text-7xl font-extrabold tracking-tight mb-3 md:mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
          >
            Claim Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">₹10</span> <br className="hidden md:block"/>
            <span className="relative">
              Amazon Pay
              <svg className="absolute -bottom-1 md:-bottom-2 left-0 w-full h-2 md:h-3 text-amber-400 fill-current opacity-30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 15 100 5 L 100 10 L 0 10 Z" />
              </svg>
            </span> Balance
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`text-sm md:text-xl font-medium mb-3 md:mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
          >
            No signups. No OTPs. Just scratch & win instantly.
          </motion.p>
        </div>

        {/* Action Area */}
        <div className="w-full max-w-md flex flex-col items-center">
          {error ? (
              <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className={`w-full p-6 text-center rounded-2xl border ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}
              >
                  <p className="font-medium mb-4">{error}</p>
                  <button 
                    onClick={() => setError(null)}
                    className={`px-6 py-2 rounded-xl text-sm font-bold ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}
                  >
                    Go Back
                  </button>
              </motion.div>
          ) : !voucherCode ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaimClick}
              disabled={isLoading || availableCount === 0}
              className={`w-full h-16 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden group ${theme === 'dark' ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 shadow-amber-500/30 border border-amber-400/50'}`}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />

              {isLoading ? (
                <div className={`w-6 h-6 border-2 rounded-full animate-spin ${theme === 'dark' ? 'border-slate-900/30 border-t-slate-900' : 'border-white/30 border-t-white'}`} />
              ) : availableCount === 0 ? (
                'All Rewards Claimed'
              ) : (
                <>Claim Reward Now <ArrowRight className="w-6 h-6" /></>
              )}
            </motion.button>
          ) : (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="w-full"
             >
                <ScratchCard 
                  voucherCode={voucherCode} 
                  isLoading={isLoading} 
                  error={error}
                  theme={theme}
                  onScratchComplete={() => setIsRevealed(true)} 
                />
             </motion.div>
          )}

          {availableCount !== null && !voucherCode && !error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-6 text-sm font-medium flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <Zap className="w-4 h-4 text-amber-500 animate-pulse" /> 
              Only <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{availableCount}</span> rewards remaining today
            </motion.p>
          )}
        </div>

        {/* Benefits Carousel Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 md:mt-16 w-full w-screen md:w-full overflow-hidden"
        >
          <div className="w-full flex justify-center pb-2 md:pb-8">
            <InteractiveCardDeck />
          </div>
        </motion.div>

      </main>

      {/* Footer */}
      <footer className={`relative z-10 border-t mt-10 md:mt-20 py-6 md:py-8 text-center text-xs md:text-sm ${theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400 bg-white/50'}`}>
        <p className="mb-2">This is a promotional experience. Not affiliated with Amazon Inc. directly.</p>
        <p>Vouchers are subject to standard Amazon Pay terms and conditions.</p>
      </footer>
    </div>
  );
}
