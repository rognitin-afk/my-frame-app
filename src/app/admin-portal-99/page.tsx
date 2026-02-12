'use client';
import { useEffect, useState } from 'react';
import TestDb from '../../components/TestDb';
import AssetUpload from '../../components/AssetUpload';
import AssetUploadRemoveBg from '../../components/AssetUploadRemoveBg';
import AudioUpload from '../../components/AudioUpload';
import { Modal } from '../../components/ui/modal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type UploadModal = null | 'frame' | 'asset-direct' | 'asset-removebg' | 'audio';

interface Frame {
  _id: string;
  name: string;
  src: string;
  downloadCount?: number;
}

interface Asset {
  _id: string;
  name: string;
  src: string;
}

interface AudioItem {
  _id: string;
  name: string;
  src: string;
}

type AdminTab = 'frames' | 'assets' | 'audio';

type AuthStatus = 'pending' | 'authorized' | 'unauthorized';

export default function AdminPortal() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending');
  const [tab, setTab] = useState<AdminTab>('frames');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [audioList, setAudioList] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState(true);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);
  const [uploadModal, setUploadModal] = useState<UploadModal>(null);

  // Restrict client-side: no valid admin cookie (API returns 401) -> redirect to login
  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats', { credentials: 'same-origin' })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 401) setAuthStatus('unauthorized');
        else setAuthStatus('authorized');
      })
      .catch(() => {
        if (!cancelled) setAuthStatus('unauthorized');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authStatus === 'unauthorized') router.replace('/admin-login');
  }, [authStatus, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin-logout', { method: 'POST', credentials: 'same-origin' });
      router.push('/admin-login');
    } catch {
      router.push('/admin-login');
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

  const loadAssets = async () => {
    try {
      const res = await fetch('/api/asset');
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch assets error:", err);
    } finally {
      setAssetsLoading(false);
    }
  };

  const loadAudio = async () => {
    setAudioLoading(true);
    try {
      const res = await fetch('/api/audio');
      const data = await res.json();
      setAudioList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch audio error:", err);
    } finally {
      setAudioLoading(false);
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
    if (authStatus === 'authorized') {
      loadFrames();
      loadStats();
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === 'authorized' && tab === 'assets') loadAssets();
  }, [authStatus, tab]);

  useEffect(() => {
    if (authStatus === 'authorized' && tab === 'audio') loadAudio();
  }, [authStatus, tab]);

  const handleDeleteFrame = async (id: string) => {
    if (!confirm("Are you sure you want to delete this frame?")) return;

    try {
      const res = await fetch('/api/frame', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setFrames(frames.filter(f => f._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const res = await fetch('/api/asset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setAssets(assets.filter(a => a._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleDeleteAudio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this audio?")) return;

    try {
      const res = await fetch('/api/audio', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setAudioList(audioList.filter((a) => a._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  if (authStatus !== 'authorized') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight shrink-0">Admin</h1>
            <p className="text-slate-500 text-sm truncate hidden sm:block">Frames & assets</p>
            {downloadCount !== null && (
              <span className="text-xs text-slate-500 shrink-0">
                Downloads: <span className="font-semibold text-slate-700">{downloadCount.toLocaleString()}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition-all"
            >
              Logout
            </button>
            <Link href="/" className="text-xs font-medium bg-white px-3 py-1.5 rounded-lg border shadow-sm hover:text-primary transition-all">
              Exit →
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-4 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('frames')}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              tab === 'frames' ? 'bg-white border border-b-0 border-primary/30 text-primary' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Frames
          </button>
          <button
            type="button"
            onClick={() => setTab('assets')}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              tab === 'assets' ? 'bg-white border border-b-0 border-primary/30 text-primary' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Assets
          </button>
          <button
            type="button"
            onClick={() => setTab('audio')}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              tab === 'audio' ? 'bg-white border border-b-0 border-primary/30 text-primary' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Audio
          </button>
        </div>

        {tab === 'frames' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setUploadModal('frame')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Upload new frame
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Existing Frames ({frames.length})</h2>
              {loading ? (
                <div className="py-10 text-center text-slate-400 animate-pulse">Connecting to MongoDB...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {frames.map((frame) => (
                    <div key={frame._id} className="group relative flex flex-col bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg rounded-2xl overflow-hidden transition-all">
                      <div className="aspect-square bg-white flex items-center justify-center p-2">
                        <img src={frame.src} alt={frame.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col flex-1 p-3 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate" title={frame.name}>{frame.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={frame._id}>{frame._id}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">
                          {(frame.downloadCount ?? 0).toLocaleString()} downloads
                        </p>
                        <button
                          onClick={() => handleDeleteFrame(frame._id)}
                          className="mt-2 w-full py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {frames.length === 0 && (
                    <div className="col-span-full py-10 text-center border-2 border-dashed rounded-2xl text-slate-400">
                      No frames found in database.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'assets' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setUploadModal('asset-direct')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Direct upload
              </button>
              <button
                type="button"
                onClick={() => setUploadModal('asset-removebg')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Remove BG then upload
              </button>
            </div>
            <p className="text-xs text-slate-500">Image assets only. For audio, use the Audio tab.</p>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Existing Assets ({assets.length})</h2>
              {assetsLoading ? (
                <div className="py-10 text-center text-slate-400 animate-pulse">Loading...</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                  {assets.map((asset) => (
                    <div key={asset._id} className="group relative flex flex-col bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md rounded-xl overflow-hidden transition-all">
                      <div className="aspect-square bg-white flex items-center justify-center p-1.5">
                        <img src={asset.src} alt={asset.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col flex-1 p-2 min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate" title={asset.name}>{asset.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono truncate mt-0.5" title={asset._id}>{asset._id}</p>
                        <button
                          onClick={() => handleDeleteAsset(asset._id)}
                          className="mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {assets.length === 0 && (
                    <div className="col-span-full py-10 text-center border-2 border-dashed rounded-2xl text-slate-400">
                      No assets yet. Upload one above.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'audio' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setUploadModal('audio')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Upload audio
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Existing Audio ({audioList.length})</h2>
              {audioLoading ? (
                <div className="py-10 text-center text-slate-400 animate-pulse">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {audioList.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-col bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all"
                    >
                      <p className="font-bold text-slate-800 text-sm truncate" title={item.name}>{item.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono truncate mt-0.5" title={item._id}>{item._id}</p>
                      <audio
                        src={item.src}
                        controls
                        className="mt-2 w-full h-8"
                        preload="metadata"
                      />
                      <button
                        onClick={() => handleDeleteAudio(item._id)}
                        className="mt-2 w-full py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {audioList.length === 0 && (
                    <div className="col-span-full py-10 text-center border-2 border-dashed rounded-2xl text-slate-400">
                      No audio yet. Upload one above.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload modals */}
        <Modal
          open={uploadModal === 'frame'}
          onClose={() => setUploadModal(null)}
          title="Upload new frame"
        >
          <TestDb
            onSuccess={() => {
              loadFrames();
              setUploadModal(null);
            }}
          />
          <p className="mt-3 text-xs text-slate-500">
            Choose an image — it will be saved and added to the frame library.
          </p>
        </Modal>
        <Modal
          open={uploadModal === 'asset-direct'}
          onClose={() => setUploadModal(null)}
          title="Direct upload asset"
        >
          <AssetUpload
            onSuccess={() => {
              loadAssets();
              setUploadModal(null);
            }}
          />
          <p className="mt-3 text-xs text-slate-500">
            Upload to Cloudinary and save to DB in one step.
          </p>
        </Modal>
        <Modal
          open={uploadModal === 'asset-removebg'}
          onClose={() => setUploadModal(null)}
          title="Remove BG then upload"
        >
          <AssetUploadRemoveBg
            onSuccess={() => {
              loadAssets();
              setUploadModal(null);
            }}
          />
          <p className="mt-3 text-xs text-slate-500">
            Remove background, preview, then upload to Cloudinary and DB.
          </p>
        </Modal>
        <Modal
          open={uploadModal === 'audio'}
          onClose={() => setUploadModal(null)}
          title="Upload audio"
        >
          <AudioUpload
            onSuccess={() => {
              loadAudio();
              setUploadModal(null);
            }}
          />
          <p className="mt-3 text-xs text-slate-500">
            MP3, WAV, OGG, or M4A only. Stored in Cloudinary and saved to DB.
          </p>
        </Modal>
      </div>
    </div>
  );
}