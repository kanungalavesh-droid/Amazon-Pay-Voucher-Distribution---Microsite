import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;

  app.use(express.json());

  // Set up IP rate limiting as a silent anti-fraud measure
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again later.' }
  });

  // Vouchers DB (In-Memory Simulation for secure allocation)
  // In a real production app, this would be PostgreSQL or Firebase.
  let vouchers = Array.from({ length: 150 }).map(() => ({
    id: uuidv4(),
    code: `AMZ-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    claimed: false,
    deviceId: null,
    claimedAt: null as Date | null,
    value: 10,
    distributor: 'Initial Stock'
  }));

  // Endpoint to get live stats
  app.get('/api/stats', (req, res) => {
    const available = vouchers.filter(v => !v.claimed).length;
    res.json({ available, total: vouchers.length });
  });

  // Endpoint to claim a voucher securely
  app.post('/api/claim', limiter, (req, res) => {
    const { deviceId } = req.body;
    
    // 1. Validate device fingerprint (Local storage UUID)
    if (!deviceId) {
      return res.status(400).json({ error: 'Device validation failed. Tampering detected.' });
    }

    // 2. Prevent duplicate claims based on device fingerprint (6 hours freeze)
    const pastClaims = vouchers.filter(v => v.deviceId === deviceId);
    if (pastClaims.length > 0) {
      // Sort to get the most recent claim
      pastClaims.sort((a, b) => new Date(b.claimedAt!).getTime() - new Date(a.claimedAt!).getTime());
      const lastClaim = pastClaims[0];
      const timeSinceLastClaimMs = Date.now() - new Date(lastClaim.claimedAt!).getTime();
      const freezePeriodMs = 6 * 60 * 60 * 1000; // 6 hours

      if (timeSinceLastClaimMs < freezePeriodMs) {
        const remainingHours = Math.ceil((freezePeriodMs - timeSinceLastClaimMs) / (1000 * 60 * 60));
        return res.status(429).json({ error: `You have already claimed a reward recently. Please wait ${remainingHours} hours before claiming another.` });
      }
    }

    // 3. Ensure vouchers are available
    const voucher = vouchers.find(v => !v.claimed);
    if (!voucher) {
      return res.status(404).json({ error: 'All rewards have been claimed! Check back tomorrow.' });
    }

    // 4. Atomic Server-Side Allocation
    voucher.claimed = true;
    voucher.deviceId = deviceId;
    voucher.claimedAt = new Date();

    res.json({ code: voucher.code });
  });

  // Admin Login Endpoint
  app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'Amazonpay2026@gmail.com' && password === 'Rooter@2016') {
      res.json({ success: true, token: 'admin-super-secret-token' });
    } else {
      res.status(401).json({ error: 'Incorrect email or password.' });
    }
  });

  // Admin Export / Analytics Mock
  app.get('/api/admin/stats', (req, res) => {
    // Simple auth check
    const authHeader = req.headers.authorization;
    if (authHeader !== 'Bearer admin-super-secret-token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const totalVouchers = vouchers.length;
    const claimedVouchers = vouchers.filter(v => v.claimed);
    
    const uniqueDistributors = [...new Set(vouchers.map(v => v.distributor))];
    
    res.json({
      total: totalVouchers,
      claimed: claimedVouchers.length,
      remaining: totalVouchers - claimedVouchers.length,
      totalValue: vouchers.reduce((sum, v) => sum + (Number(v.value) || 0), 0),
      claimedValue: claimedVouchers.reduce((sum, v) => sum + (Number(v.value) || 0), 0),
      recentClaims: claimedVouchers.slice(-10).reverse(), // Send last 10 claims
      distributors: uniqueDistributors
    });
  });

  // Admin Upload Codes
  app.post('/api/admin/upload', (req, res) => {
    // Simple auth check
    const authHeader = req.headers.authorization;
    if (authHeader !== 'Bearer admin-super-secret-token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { newVouchers } = req.body;
    if (!newVouchers || !Array.isArray(newVouchers)) {
        return res.status(400).json({ error: "Invalid data format." });
    }
    const added = newVouchers.map(v => ({
        id: uuidv4(),
        code: v.code,
        value: Number(v.value) || 10,
        distributor: v.distributor || 'Manual Upload',
        claimed: false,
        deviceId: null,
        claimedAt: null
    }));
    vouchers = [...vouchers, ...added];
    res.json({ success: true, added: added.length, total: vouchers.length });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
