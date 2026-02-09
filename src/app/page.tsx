"use client";
import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Upload, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [dbFrames, setDbFrames] = useState<Frame[]>([]); // Using the Frame interface here
  const [userName, setUserName] = useState('Your Name');
  const [userPosition, setUserPosition] = useState('Campaign Member');
  const [isRemoving, setIsRemoving] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(100);
  const [showAllFrames, setShowAllFrames] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
  const [frameLoading, setFrameLoading] = useState(false);
  const bgRemovePreloaded = useRef(false);

  // --- PRELOAD BACKGROUND-REMOVAL MODEL IN BACKGROUND (does not block UI) ---
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      try {
        const { preload } = await import('@imgly/background-removal');
        if (cancelled) return;
        await preload();
        if (!cancelled) bgRemovePreloaded.current = true;
      } catch {
        // ignore: model will load on first use
      }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(() => run(), { timeout: 5000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = setTimeout(run, 2500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

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

  // 3. Frame: empty canvas until a template is set; then load image as background (not selectable)
  const MAX_CANVAS = 500;
  const DEFAULT_SIZE = { width: 500, height: 500 };

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (!selectedFrame) {
      setFrameLoading(false);
      setCanvasSize(DEFAULT_SIZE);
      try {
        canvas.setDimensions(DEFAULT_SIZE);
      } catch {
        // ignore if Fabric not ready
      }
      if (canvas.backgroundImage) {
        (canvas.backgroundImage as fabric.FabricObject).dispose?.();
        canvas.backgroundImage = undefined;
      }
      // Keep name/pos text at default positions for empty canvas
      canvas.getObjects().forEach((obj) => {
        if (obj.get('data')?.id === 'name-text') {
          obj.set({ left: 250, top: 395, originX: 'center', originY: 'center' });
        }
        if (obj.get('data')?.id === 'pos-text') {
          obj.set({ left: 250, top: 430, originX: 'center', originY: 'center' });
        }
      });
      canvas.requestRenderAll();
      return;
    }

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
        URL.revokeObjectURL(transparentUrl);
        setIsRemoving(false);
      }).catch(() => {
        URL.revokeObjectURL(transparentUrl);
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
    <main className="flex min-h-screen w-full flex-col bg-muted/30 md:flex-row">
      {/* LEFT SIDEBAR */}
      <aside className="w-full border-r bg-card p-6 shadow-sm md:w-[380px] overflow-y-auto max-h-screen">
        <h1 className="mb-6 text-xl font-semibold tracking-tight text-foreground">Campaign Editor</h1>

        {/* 1. Frame Selection */}
        <Card className="mb-6">
          <CardHeader
            className="cursor-pointer pb-2"
            onClick={() => setShowAllFrames(!showAllFrames)}
            onKeyDown={(e) => e.key === 'Enter' && setShowAllFrames((v) => !v)}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                1. Select Frame {showAllFrames ? '(Showing All)' : `(${dbFrames.length} loaded)`}
              </CardTitle>
              <span className="text-muted-foreground" aria-hidden>
                {showAllFrames ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`grid grid-cols-2 gap-2 transition-all duration-300 ${showAllFrames ? 'max-h-[360px] overflow-y-auto' : 'max-h-[180px]'}`}>
              {displayedFrames.map((frame) => (
                <button
                  key={frame._id}
                  type="button"
                  onClick={() => handleSelectFrame(frame.src)}
                  className={`relative h-20 w-full rounded-md border-2 transition-colors overflow-hidden ${
                    selectedFrame === frame.src
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-muted/30'
                  }`}
                >
                  <img src={frame.src} alt={frame.name} className="object-contain size-full p-1.5" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator className="mb-6" />

        {/* 2. Text Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">2. Person details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Full Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" value={userPosition} onChange={(e) => setUserPosition(e.target.value)} placeholder="Position" />
            </div>
          </CardContent>
        </Card>

        <Separator className="mb-6" />

        {/* 3. Upload & AI */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">3. Photo & AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Upload className="size-4" />
              Upload photo
              <input type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
            </Label>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleRemoveBackground}
              disabled={isRemoving}
            >
              <Sparkles className="size-4" />
              {isRemoving ? 'Processing…' : 'Remove background'}
            </Button>
          </CardContent>
        </Card>

        <Separator className="mb-6" />

        {/* 4. Edit Photo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">4. Edit photo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label>Photo zoom — {Math.round(photoZoom)}%</Label>
              <Slider
                min={10}
                max={200}
                value={[photoZoom]}
                onValueChange={(v) => handleZoom(v[0] ?? 100)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* RIGHT CANVAS AREA */}
      <div className="flex flex-1 flex-col items-center justify-center bg-muted/50 p-6">
        <div
          style={{
            width: canvasSize.width + 4,
            height: canvasSize.height + 4,
            padding: 2,
            boxSizing: 'border-box',
            borderRadius: 8,
          }}
          className="bg-card shadow-lg border rounded-lg relative"
        >
          <div
            style={{ width: canvasSize.width, height: canvasSize.height, borderRadius: 4 }}
            className="relative overflow-hidden bg-muted/30"
          >
            {/* Loading overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm font-medium z-10 transition-opacity"
              style={{ borderRadius: 4, visibility: frameLoading ? 'visible' : 'hidden', opacity: frameLoading ? 1 : 0 }}
            >
              Loading frame…
            </div>
            {/* No template placeholder (when API returned no frames or before first load) */}
            {selectedFrame === null && !frameLoading && (
              <div
                className="absolute inset-0 flex items-center justify-center z-10 bg-muted/80 text-muted-foreground text-sm font-medium"
                style={{ borderRadius: 4 }}
                aria-live="polite"
              >
                No template found
              </div>
            )}
            <canvas ref={canvasRef} />
          </div>
        </div>
        <Button
          onClick={downloadImage}
          size="lg"
          className="mt-8 w-full max-w-[420px]"
          disabled={selectedFrame === null}
        >
          Download poster
        </Button>
      </div>
    </main>
  );
}