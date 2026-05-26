export function playSuccessSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Quick rising arpeggio for gamified reward feel
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + duration * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(523.25, now, 0.2);       // C5
    playNote(659.25, now + 0.1, 0.2); // E5
    playNote(783.99, now + 0.2, 0.4); // G5
    playNote(1046.50, now + 0.3, 0.8);// C6
    
  } catch (e) {
    console.error("Audio play failed", e);
  }
}
