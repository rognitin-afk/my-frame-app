"use client";
import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import "./globals.css";

// This Interface fixes the "Unexpected any" error by defining what a Frame is
interface Frame {
  _id: string;
  name: string;
  src: string;
  category?: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isInitialized = useRef(false);
  const hasSetInitialFrame = useRef(false);

  // --- STATES ---
  const [selectedFrame, setSelectedFrame] = useState('/frames/election.png');
  const [dbFrames, setDbFrames] = useState<Frame[]>([]); // Using the Frame interface here
  const [userName, setUserName] = useState('Your Name');
  const [userPosition, setUserPosition] = useState('Campaign Member');
  const [isRemoving, setIsRemoving] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [showAllFrames, setShowAllFrames] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
  const [frameLoading, setFrameLoading] = useState(false);

  // --- FETCH DATA FROM MONGODB --- (only set initial frame on first load; never overwrite user's selection)
  useEffect(() => {
    async function loadFrames() {
      try {
        const res = await fetch('/api/frame');
        const data = await res.json();
        const frames = Array.isArray(data) ? data : [];
        setDbFrames(frames);
        if (frames.length > 0 && !hasSetInitialFrame.current) {
          hasSetInitialFrame.current = true;
          setSelectedFrame(frames[0].src);
        }
      } catch (error) {
        console.error("Failed to fetch frames from DB:", error);
      }
    }
    loadFrames();
  }, []);

  // --- SIDEBAR LOGIC ---
  const framesList = Array.isArray(dbFrames) ? dbFrames : [];
  const displayedFrames = showAllFrames ? framesList : framesList.slice(0, 4);

  const handleSelectFrame = (frameSrc: string) => {
    if (frameSrc === selectedFrame) return;
    const canvas = fabricRef.current;
    if (canvas) {
      canvas.getObjects().forEach((obj) => {
        if (obj.get('data')?.type === 'user-photo') canvas.remove(obj);
      });
      canvas.requestRenderAll();
    }
    setPhotoZoom(100);
    setSelectedFrame(frameSrc);
  };

  // 1. Initialize Canvas
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized.current || !canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      enableRetinaScaling: false,
    });

    fabricRef.current = canvas;
    isInitialized.current = true;

    const nameText = new fabric.IText(userName, {
      left: 250, top: 395, fontSize: 28, fontFamily: 'Arial',
      fill: '#006400', originX: 'center', fontWeight: 'bold',
      data: { id: 'name-text' }
    });

    const posText = new fabric.IText(userPosition, {
      left: 250, top: 430, fontSize: 18, fontFamily: 'Arial',
      fill: '#444', originX: 'center',
      data: { id: 'pos-text' }
    });

    canvas.add(nameText, posText);
    canvas.renderAll();

    return () => {
      canvas.dispose();
      isInitialized.current = false;
    };
  }, []);

  // 2. Text Update
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => {
      if (obj.get('data')?.id === 'name-text') {
        (obj as fabric.IText).set({
          text: userName,
          fontFamily: 'Noto Sans Devanagari, Arial'
        });
      }
      if (obj.get('data')?.id === 'pos-text') {
        (obj as fabric.IText).set({
          text: userPosition,
          fontFamily: 'Noto Sans Devanagari, Arial'
        });
      }
    });
    canvas.renderAll();
  }, [userName, userPosition]);

  // 3. Frame: get dimensions first → resize canvas → set image as background (not selectable)
  const MAX_CANVAS = 500;

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    setFrameLoading(true);

    const probeImg = new Image();
    probeImg.crossOrigin = 'anonymous';
    probeImg.onload = () => {
      const imgW = probeImg.naturalWidth || 1;
      const imgH = probeImg.naturalHeight || 1;
      if (imgW < 1 || imgH < 1) {
        setFrameLoading(false);
        return;
      }

      const imgAspect = imgW / imgH;
      let cw: number, ch: number;
      if (imgAspect >= 1) {
        cw = MAX_CANVAS;
        ch = Math.round(MAX_CANVAS / imgAspect);
      } else {
        ch = MAX_CANVAS;
        cw = Math.round(MAX_CANVAS * imgAspect);
      }

      setCanvasSize({ width: cw, height: ch });
      try {
        canvas.setDimensions({ width: cw, height: ch });
      } catch {
        // ignore if Fabric not ready
      }

      fabric.Image.fromURL(selectedFrame, { crossOrigin: 'anonymous' }).then((img) => {
        const fabricW = (img.get('width') ?? (img as fabric.FabricObject & { width?: number }).width) ?? 1;
        const fabricH = (img.get('height') ?? (img as fabric.FabricObject & { height?: number }).height) ?? 1;
        const scaleX = cw / fabricW;
        const scaleY = ch / fabricH;
        img.set({
          scaleX,
          scaleY,
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
        });

        if (canvas.backgroundImage) {
          (canvas.backgroundImage as fabric.FabricObject).dispose?.();
        }
        canvas.backgroundImage = img;

        canvas.getObjects().forEach((obj) => {
          if (obj.get('data')?.id === 'name-text') {
            obj.set({ left: cw / 2, top: ch - 105, originX: 'center', originY: 'center' });
          }
          if (obj.get('data')?.id === 'pos-text') {
            obj.set({ left: cw / 2, top: ch - 70, originX: 'center', originY: 'center' });
          }
        });

        canvas.requestRenderAll();
        setFrameLoading(false);
      }).catch(() => setFrameLoading(false));
    };
    probeImg.onerror = () => setFrameLoading(false);
    probeImg.src = selectedFrame;
  }, [selectedFrame]);

  // 4. Background Removal Logic
  const handleRemoveBackground = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const userPhoto = canvas.getObjects().find(obj => obj.get('data')?.type === 'user-photo') as fabric.Image;
    if (!userPhoto) return alert("Please upload a photo first!");

    try {
      setIsRemoving(true);
      const imageSrc = userPhoto.getSrc();
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(imageSrc);
      const transparentUrl = URL.createObjectURL(blob);

      fabric.Image.fromURL(transparentUrl).then((img) => {
        img.set({
          left: userPhoto.left,
          top: userPhoto.top,
          scaleX: userPhoto.scaleX,
          scaleY: userPhoto.scaleY,
          data: { type: 'user-photo' }
        });

        canvas.remove(userPhoto);
        canvas.add(img);
        canvas.bringObjectToFront(img);

        canvas.getObjects().forEach(obj => {
          if (obj.get('data')?.id?.includes('text')) canvas.bringObjectToFront(obj);
        });

        canvas.renderAll();
        setIsRemoving(false);
      });
    } catch (error) {
      console.error(error);
      setIsRemoving(false);
    }
  };

  // 5. Photo Zoom Logic
  const handleZoom = (val: number) => {
    setPhotoZoom(val);
    const canvas = fabricRef.current;
    const photo = canvas?.getObjects().find(obj => obj.get('data')?.type === 'user-photo');
    if (photo) {
      photo.scale(val / 100);
      canvas?.renderAll();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result;
      fabric.Image.fromURL(data as string).then((img) => {
        const canvas = fabricRef.current!;
        canvas.getObjects().forEach(obj => {
          if (obj.get('data')?.type === 'user-photo') canvas.remove(obj);
        });

        img.set({ data: { type: 'user-photo' } });
        const canvasW = canvas.getWidth();
        img.scaleToWidth(Math.round(canvasW * 0.55));
        setPhotoZoom((img.scaleX ?? 1) * 100);

        canvas.add(img);
        canvas.centerObject(img);
        canvas.bringObjectToFront(img);

        canvas.getObjects().forEach(obj => {
          if (obj.get('data')?.id?.includes('text')) canvas.bringObjectToFront(obj);
        });

        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  const downloadImage = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    const link = document.createElement('a');
    link.download = 'poster.png';
    link.href = dataURL;
    link.click();
  };

  return (
    <main className="flex min-h-screen w-full flex-col bg-slate-50 md:flex-row">
      {/* LEFT SIDEBAR */}
      <div className="w-full border-r bg-white p-6 shadow-sm md:w-96 overflow-y-auto max-h-screen">
        <h1 className="mb-6 text-2xl font-black text-red-600 uppercase italic">Campaign Editor</h1>

        {/* 1. Frame Selection */}
        <section className="mb-6">
          <div
            className="flex justify-between items-center mb-3 cursor-pointer group"
            onClick={() => setShowAllFrames(!showAllFrames)}
          >
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-red-600 transition-colors">
              1. Select Frame {showAllFrames ? '(Showing All)' : `(${dbFrames.length} Frames Loaded)`}
            </h2>
            <span className="text-[10px] font-bold text-red-600 uppercase italic">
              {showAllFrames ? 'Show Less ▲' : 'View All ▼'}
            </span>
          </div>

          <div className={`grid grid-cols-2 gap-3 transition-all duration-300 ${showAllFrames ? 'max-h-[400px] overflow-y-auto' : 'max-h-[200px]'}`}>
            {displayedFrames.map((frame) => (
              <button
                key={frame._id}
                onClick={() => handleSelectFrame(frame.src)}
                className={`relative h-20 rounded border-2 transition-all ${selectedFrame === frame.src ? 'border-red-600 bg-red-50' : 'border-slate-100 hover:border-slate-300'}`}
              >
                <img src={frame.src} alt={frame.name} className="object-contain p-2 w-full h-full" />
              </button>
            ))}
          </div>
        </section>

        {/* 2. Text Details */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">2. Person Name</h2>
          <input value={userName} onChange={(e) => setUserName(e.target.value)} className="mb-2 w-full border p-3 rounded" placeholder="Full Name" />
          <input value={userPosition} onChange={(e) => setUserPosition(e.target.value)} className="w-full border p-3 rounded" placeholder="Position" />
        </section>

        {/* 3. Upload & AI */}
        <section className="mb-6 space-y-3">
          <h2 className="mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">3. Photo & AI Tools</h2>
          <label className="flex cursor-pointer items-center justify-center rounded-lg bg-black p-4 font-bold text-white hover:bg-slate-800">
            Upload Photo
            <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
          </label>

          <button
            onClick={handleRemoveBackground}
            disabled={isRemoving}
            className={`w-full p-4 rounded-lg font-bold border-2 transition-all ${isRemoving ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-purple-600 border-purple-600 hover:bg-purple-50'}`}
          >
            {isRemoving ? "AI Processing..." : "✨ Remove Background"}
          </button>
        </section>

        {/* 4. Edit Tool */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">4. Edit Photo</h2>
          <div className="p-4 bg-slate-50 rounded-lg">
            <label className="text-xs font-bold text-slate-500 block mb-2">Photo Zoom</label>
            <input
              type="range" min="10" max="200" value={photoZoom}
              onChange={(e) => handleZoom(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
          </div>
        </section>
      </div>

      {/* RIGHT CANVAS AREA */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-100 p-4">
        {/* Outer wrapper: 2px padding, 5px rounded; inner 1px rounded only so image doesn't shift */}
        <div
          style={{
            width: canvasSize.width + 4,
            height: canvasSize.height + 4,
            padding: 2,
            boxSizing: 'border-box',
            borderRadius: 5,
          }}
          className="bg-white shadow-2xl border border-white"
        >
          <div
            style={{ width: canvasSize.width, height: canvasSize.height, borderRadius: 1 }}
            className="relative overflow-hidden"
          >
            <div
              className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500 font-medium z-10 transition-opacity"
              style={{ borderRadius: 1, visibility: frameLoading ? 'visible' : 'hidden', opacity: frameLoading ? 1 : 0 }}
            >
              Loading frame...
            </div>
            <canvas ref={canvasRef} />
          </div>
        </div>
        <button onClick={downloadImage} className="mt-8 w-full max-w-[500px] rounded-xl bg-red-600 p-4 font-bold text-white shadow-lg">
          Download Final Poster
        </button>
      </div>
    </main>
  );
}