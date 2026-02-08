'use client';

import { useEffect, useState } from 'react';

// 1. Define the Blueprint for a Frame (Fixes TypeScript errors)
interface IFrame {
  _id: string;
  name: string;
  src: string;
  category?: string;
}

export default function Sidebar() {
  const [frames, setFrames] = useState<IFrame[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // 2. Fetch data from your API
  useEffect(() => {
    setMounted(true);
    const fetchFrames = async () => {
      try {
        const res = await fetch('/api/frame');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setFrames(data);
      } catch (err) {
        console.error("Error loading frames:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFrames();
  }, []);

  // Prevent Hydration mismatch (Server vs Client content)
  if (!mounted) return null;

  return (
    <aside className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Poster Frames</h2>
        <p className="text-xs text-gray-500 mt-1">Select a template to begin</p>
      </div>

      {/* Scrollable Frame List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500 mt-2">Loading templates...</p>
          </div>
        ) : frames.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm italic">No frames found in database.</p>
          </div>
        ) : (
          frames.map((frame) => (
            <div 
              key={frame._id} 
              className="group cursor-pointer border-2 border-transparent hover:border-blue-500 rounded-xl p-2 transition-all duration-200 bg-gray-50 hover:bg-blue-50"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-white">
                <img 
                  src={frame.src} 
                  alt={frame.name} 
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" 
                />
              </div>
              <p className="text-xs font-semibold text-gray-700 mt-2 text-center uppercase tracking-wider">
                {frame.name}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button className="w-full py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-black transition">
          Upload Custom Frame
        </button>
      </div>
    </aside>
  );
}