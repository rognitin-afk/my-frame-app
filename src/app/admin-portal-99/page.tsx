'use client';
import { useEffect, useState } from 'react';
import TestDb from '../../components/TestDb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Frame {
  _id: string;
  name: string;
  src: string;
  downloadCount?: number;
}

export default function AdminPortal() {
  const router = useRouter();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin-logout', { method: 'POST', credentials: 'same-origin' });
      router.push('/admin-portal-99/login');
    } catch {
      router.push('/admin-portal-99/login');
    }
  };

  const loadFrames = async () => {
    try {
      const res = await fetch('/api/frame');
      const data = await res.json();
      setFrames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (typeof data?.downloadCount === 'number') setDownloadCount(data.downloadCount);
    } catch {
      setDownloadCount(null);
    }
  };

  useEffect(() => {
    loadFrames();
    loadStats();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this frame?")) return;

    try {
      const res = await fetch('/api/frame', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        // Update local state immediately to show it's gone
        setFrames(frames.filter(f => f._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">ADMIN PORTAL</h1>
            <p className="text-slate-500 font-medium">Manage your MongoDB frame library</p>
            {downloadCount !== null && (
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Downloads: <span className="text-slate-900">{downloadCount.toLocaleString()}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-bold bg-slate-100 px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-200 transition-all"
            >
              LOGOUT
            </button>
            <Link href="/" className="text-xs font-bold bg-white px-4 py-2 rounded-full border shadow-sm hover:text-red-600 transition-all">
              EXIT TO EDITOR →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section: Add New */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">1. Upload New Frame</h2>
            <TestDb onSuccess={loadFrames} />
            <p className="mt-4 text-[10px] text-slate-400 leading-relaxed italic">
              Choose an image from your computer — it will be saved to the app and added to the frame library.
            </p>
          </div>

          {/* Section: Manage Existing */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">2. Existing Frames ({frames.length})</h2>
            
            {loading ? (
              <div className="py-10 text-center text-slate-400 animate-pulse">Connecting to MongoDB...</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {frames.map((frame) => (
                  <div key={frame._id} className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-xl border flex items-center justify-center p-1">
                        <img src={frame.src} alt="" className="max-h-full object-contain" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{frame.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{frame._id}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          Downloads: {(frame.downloadCount ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(frame._id)}
                      className="opacity-0 group-hover:opacity-100 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all"
                    >
                      DELETE
                    </button>
                  </div>
                ))}
                {frames.length === 0 && (
                  <div className="py-10 text-center border-2 border-dashed rounded-2xl text-slate-400">
                    No frames found in database.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}