import React, { useState, useEffect } from 'react';
import { LayoutDashboard, UploadCloud, Users, CreditCard, DollarSign, Activity, AlertCircle, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { AdminLogin } from './AdminLogin';

interface AdminStats {
  total: number;
  claimed: number;
  remaining: number;
  totalValue: number;
  claimedValue: number;
  recentClaims: any[];
  distributors: string[];
}

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('admin_token') === 'admin-super-secret-token'
  );
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [csvText, setCsvText] = useState('');
  const [distributor, setDistributor] = useState('Manual Upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{success?: boolean, added?: number, error?: string} | null>(null);

  const fetchStats = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000); // Polling every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadResult(null);

    // Parse simple CSV: code,value,distributor (or just code)
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
    const newVouchers = lines.map(line => {
      const parts = line.split(',');
      return { 
        code: parts[0]?.trim(), 
        value: parts[1] ? Number(parts[1].trim()) : 10,
        distributor: parts[2] ? parts[2].trim() : (distributor.trim() || 'Manual Upload')
      };
    }).filter(v => v.code);

    if (newVouchers.length === 0) {
      setUploadResult({ error: 'No valid codes found in input.' });
      setIsUploading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ newVouchers })
      });
      
      if (res.status === 401) {
        handleLogout();
        return;
      }
      
      const data = await res.json();

      if (res.ok) {
        setUploadResult({ success: true, added: data.added });
        setCsvText('');
        fetchStats();
      } else {
        setUploadResult({ error: data.error || 'Upload failed.' });
      }
    } catch (err: any) {
      setUploadResult({ error: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={(token) => {
      localStorage.setItem('admin_token', token);
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-amber-500/30 p-6 md:p-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LayoutDashboard className="text-amber-500 w-8 h-8" />
              Promo Campaign Admin
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Monitor distribution metrics and manage voucher inventory.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors">
              Live Site
            </a>
            <button onClick={handleLogout} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Total Inventory" value={stats?.total ?? '-'} icon={<CreditCard className="text-blue-400" />} />
          <StatCard title="Claimed Vouchers" value={stats?.claimed ?? '-'} icon={<Activity className="text-green-400" />} />
          <StatCard title="Remaining Stock" value={stats?.remaining ?? '-'} icon={<AlertCircle className={stats?.remaining && stats.remaining < 50 ? "text-red-400" : "text-amber-400"} />} />
          <StatCard title="Total Value Dist." value={`₹${stats?.claimedValue ?? '-'}`} icon={<DollarSign className="text-emerald-400" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-amber-500" />
              Add Vouchers
            </h2>
            <p className="text-xs text-slate-400 mb-4">Paste CSV (Format: CODE,VALUE,DISTRIBUTOR) or just paste codes directly (default ₹10).</p>
            
            <div className="mb-4">
               <label className="block text-xs font-medium text-slate-400 mb-1">Global Distributor (Fallback)</label>
               <input
                  type="text"
                  list="distributors"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  placeholder="e.g. Partner A"
                  value={distributor}
                  onChange={(e) => setDistributor(e.target.value)}
               />
               <datalist id="distributors">
                  {stats?.distributors?.map((d, i) => <option key={i} value={d} />)}
               </datalist>
            </div>

            <textarea
              className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all mb-4 resize-none"
              placeholder="AMZ-A1B2-C3D4,10,Partner A&#10;AMZ-X9Y8-Z7W6,50&#10;AMZ-Q1W2-F3G4"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            
            <button
              onClick={handleUpload}
              disabled={isUploading || !csvText.trim()}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl transition-all"
            >
              {isUploading ? 'Processing...' : 'Upload Inventory'}
            </button>

            {uploadResult && (
              <div className={`mt-4 p-4 rounded-xl text-sm ${uploadResult.error ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                {uploadResult.error || `Successfully added ${uploadResult.added} vouchers.`}
              </div>
            )}
          </motion.div>

          {/* Recent Activity Table */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Recent Claims
            </h2>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-4 font-medium">Voucher Code</th>
                    <th className="pb-4 font-medium">Value</th>
                    <th className="pb-4 font-medium">Distributor</th>
                    <th className="pb-4 font-medium">Device Fingerprint</th>
                    <th className="pb-4 font-medium text-right">Time Claimed</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stats?.recentClaims && stats.recentClaims.length > 0 ? (
                    stats.recentClaims.map((claim, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 font-mono text-slate-300">{claim.code}</td>
                        <td className="py-4 font-medium text-emerald-400">₹{claim.value}</td>
                        <td className="py-4 font-medium text-slate-300">{claim.distributor}</td>
                        <td className="py-4 font-mono text-xs text-slate-500 truncate max-w-[150px]">
                            {claim.deviceId || 'Unknown'}
                        </td>
                        <td className="py-4 text-right text-slate-400">
                            {new Date(claim.claimedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No claims yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-slate-400 font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold font-mono text-white tracking-tight">{value}</h3>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-xl">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
