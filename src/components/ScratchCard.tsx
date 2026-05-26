import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { playSuccessSound } from '../lib/audio';

interface ScratchCardProps {
  voucherCode: string | null;
  isLoading: boolean;
  onScratchComplete: () => void;
  error: string | null;
  theme: 'light' | 'dark';
}

export function ScratchCard({ voucherCode, isLoading, onScratchComplete, error, theme }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (error || isLoading || isScratched) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent re-initialization if already scratched
    if (isScratched) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Initial Fill (Premium metallic/orange look)
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, '#f59e0b'); // amber-500
    gradient.addColorStop(0.5, '#fbbf24'); // amber-400
    gradient.addColorStop(1, '#d97706'); // amber-600
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.font = '700 20px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH TO REVEAL', rect.width / 2, rect.height / 2);

  }, [error, isLoading, isScratched]);

  const scratch = (x: number, y: number) => {
    if (isScratched || error || isLoading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    checkPercentage();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const checkPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;

    // Check alpha pixel data quickly
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] < 128) transparent++;
    }

    const percentage = (transparent / (pixels.length / 16)) * 100;
    
    if (percentage > 35 && !isScratched) {
      setIsScratched(true);
      onScratchComplete();
      triggerConfetti();
      playSuccessSound();
    }
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) scratch(getCoordinates(e, canvas).x, getCoordinates(e, canvas).y);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) scratch(getCoordinates(e, canvas).x, getCoordinates(e, canvas).y);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const triggerConfetti = () => {
    const end = Date.now() + 2 * 1000;
    const colors = ['#f59e0b', '#fbbf24', '#0f172a'];

    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  const copyCode = async () => {
    if (!voucherCode) return;
    await navigator.clipboard.writeText(voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative w-full max-w-md mx-auto aspect-[1.8/1] rounded-3xl overflow-hidden shadow-2xl border flex flex-col items-center justify-center select-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700/60 ring-1 ring-white/10' : 'bg-white border-slate-200 ring-1 ring-black/5 shadow-amber-500/20'}`}>
      
      {/* Background Revealed Layer */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-0 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-amber-50 to-orange-50'}`}>
        {error ? (
           <p className="text-red-400 font-medium px-4">{error}</p>
        ) : isLoading ? (
           <div className="animate-pulse flex space-x-2 items-center">
               <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
               <div className="w-2 h-2 bg-amber-500 rounded-full delay-75"></div>
               <div className="w-2 h-2 bg-amber-500 rounded-full delay-150"></div>
           </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full h-full justify-center">
            <p className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-amber-600'}`}>Amazon Pay Voucher</p>
            <h3 className={`text-3xl sm:text-4xl font-mono font-bold tracking-wider select-text ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {voucherCode}
            </h3>
            
            <AnimatePresence>
                {isScratched && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 12 }}
                        className="flex gap-3 w-full max-w-[280px]"
                    >
                        <button 
                            onClick={copyCode}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
                        >
                            {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        <a 
                            href="https://www.amazon.in/gc/redeem"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-amber-500/20"
                        >
                            Redeem <ExternalLink className="w-4 h-4" />
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Foreground Canvas Layer */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 w-full h-full touch-none transition-opacity duration-700 cursor-crosshair z-10",
          (isScratched || error || isLoading) ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
}
