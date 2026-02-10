"use client";
import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Separator } from "../components/ui/separator";
import { Upload, Sparkles, ChevronRight, LayoutTemplate, ImageIcon, Images, Trash2 } from "lucide-react";
import { compressToMax3MB } from "@/lib/compress-image";
import "./globals.css";

interface Frame {
  _id: string;
  name: string;
  src: string;
  category?: string;
}

interface Asset {
  _id: string;
  name: string;
  src: string;
}

const LOCAL_IMAGES_KEY = "congress-canvas-your-images";

interface LocalImage {
  id: string;
  src: string;
  name?: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isInitialized = useRef(false);
  const hasSetInitialFrame = useRef(false);

  // --- STATES ---
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [dbFrames, setDbFrames] = useState<Frame[]>([]);
  const [dbAssets, setDbAssets] = useState<Asset[]>([]);
  const [userName, setUserName] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(100);
  const [rightFramesOpen, setRightFramesOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<"templates" | "assets" | "images">("templates");
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
  const [frameLoading, setFrameLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [canDeleteSelected, setCanDeleteSelected] = useState(false);
  const bgRemovePreloaded = useRef(false);

  // --- PRELOAD BACKGROUND-REMOVAL MODEL IN BACKGROUND (does not block UI) ---
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      try {
        const { preload } = await import("@imgly/background-removal");
        if (cancelled) return;
        await preload();
        if (!cancelled) bgRemovePreloaded.current = true;
      } catch {
        // ignore: model will load on first use
      }
    };
    if (typeof requestIdleCallback !== "undefined") {
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

  // --- FETCH DATA FROM MONGODB ---
  useEffect(() => {
    async function loadFrames() {
      try {
        const res = await fetch("/api/frame");
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

  useEffect(() => {
    async function loadAssets() {
      try {
        const res = await fetch("/api/asset");
        const data = await res.json();
        setDbAssets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      }
    }
    loadAssets();
  }, []);

  // Load "Your images" from localStorage (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_IMAGES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLocalImages(
            parsed.filter(
              (x): x is LocalImage =>
                x && typeof x.id === "string" && typeof x.src === "string"
            )
          );
        }
      }
    } catch {
      // ignore invalid data
    }
  }, []);

  const addLocalImage = (item: Omit<LocalImage, "id"> & { id?: string }) => {
    const entry: LocalImage = {
      id: item.id ?? crypto.randomUUID(),
      src: item.src,
      name: item.name,
    };
    setLocalImages((prev) => {
      const next = [entry, ...prev];
      try {
        localStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(next));
      } catch {
        // quota or other
      }
      return next;
    });
  };

  const removeLocalImage = (id: string) => {
    setLocalImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      try {
        localStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // --- SIDEBAR LOGIC ---
  const framesList = Array.isArray(dbFrames) ? dbFrames : [];

  const handleSelectFrame = (frameSrc: string) => {
    if (frameSrc === selectedFrame) return;
    const canvas = fabricRef.current;
    if (canvas) {
      canvas.getObjects().forEach((obj) => {
        if (obj.get("data")?.type === "user-photo") canvas.remove(obj);
      });
      canvas.requestRenderAll();
    }
    setPhotoZoom(100);
    setSelectedFrame(frameSrc);
  };

  const handleAddAsset = (assetSrc: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    fabric.Image.fromURL(assetSrc, { crossOrigin: "anonymous" }).then((img) => {
      const canvasW = canvas.getWidth();
      const canvasH = canvas.getHeight();
      const w = (img.get("width") as number) ?? 1;
      const h = (img.get("height") as number) ?? 1;
      const scaleToFit = Math.min(1, (canvasW * 0.4) / w, (canvasH * 0.4) / h);
      img.set({
        scaleX: scaleToFit,
        scaleY: scaleToFit,
      });
      canvas.add(img);
      canvas.centerObject(img);
      canvas.bringObjectToFront(img);
      canvas.getObjects().forEach((obj) => {
        if (obj.get("data")?.id?.includes("text"))
          canvas.bringObjectToFront(obj);
      });
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  };

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    // Support both single selection (getActiveObject) and multi (getActiveObjects) like canva-clone
    const multi = canvas.getActiveObjects();
    const single = canvas.getActiveObject();
    const toProcess =
      multi && multi.length > 0 ? multi : single ? [single] : [];
    let removed = false;
    toProcess.forEach((obj) => {
      if (obj.type === "Image" || obj.type === "image" || obj instanceof fabric.FabricImage) {
        canvas.remove(obj);
        removed = true;
      }
    });
    if (removed) {
      canvas.discardActiveObject();
      canvas.renderAll();
      setCanDeleteSelected(false);
    }
  };

  // 1. Initialize Canvas
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      isInitialized.current ||
      !canvasRef.current
    )
      return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      enableRetinaScaling: false,
    });

    fabricRef.current = canvas;
    isInitialized.current = true;

    const nameText = new fabric.IText(userName, {
      left: 250,
      top: 395,
      fontSize: 28,
      fontFamily: "Arial",
      fill: "#006400",
      originX: "center",
      fontWeight: "bold",
      data: { id: "name-text" },
    });

    const posText = new fabric.IText(userPosition, {
      left: 250,
      top: 430,
      fontSize: 18,
      fontFamily: "Arial",
      fill: "#444",
      originX: "center",
      data: { id: "pos-text" },
    });

    canvas.add(nameText, posText);
    canvas.renderAll();

    const updateCanDelete = () => {
      const activeObjects = canvas.getActiveObjects();
      const hasImage = activeObjects?.some(
        (obj) =>
          obj.type === "Image" ||
          obj.type === "image" ||
          obj instanceof fabric.FabricImage
      );
      setCanDeleteSelected(!!hasImage);
    };
    const clearCanDelete = () => setCanDeleteSelected(false);
    canvas.on("selection:created", updateCanDelete);
    canvas.on("selection:updated", updateCanDelete);
    canvas.on("selection:cleared", clearCanDelete);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as Node;
      if (target && typeof (target as HTMLElement).closest === "function") {
        const el = target as HTMLElement;
        if (el.closest("input, textarea, [contenteditable=true]")) return;
      }
      const canvas = fabricRef.current;
      if (!canvas) return;
      const toProcess = canvas.getActiveObjects();
      if (!toProcess?.length) return;
      e.preventDefault();
      let removed = false;
      toProcess.forEach((obj) => {
        if (obj.type === "Image" || obj.type === "image" || obj instanceof fabric.FabricImage) {
          canvas.remove(obj);
          removed = true;
        }
      });
      if (removed) {
        canvas.discardActiveObject();
        canvas.renderAll();
        setCanDeleteSelected(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      canvas.off("selection:created", updateCanDelete);
      canvas.off("selection:updated", updateCanDelete);
      canvas.off("selection:cleared", clearCanDelete);
      canvas.dispose();
      isInitialized.current = false;
    };
  }, []);

  // 2. Text Update
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => {
      if (obj.get("data")?.id === "name-text") {
        (obj as fabric.IText).set({
          text: userName,
          fontFamily: "Noto Sans Devanagari, Arial",
        });
      }
      if (obj.get("data")?.id === "pos-text") {
        (obj as fabric.IText).set({
          text: userPosition,
          fontFamily: "Noto Sans Devanagari, Arial",
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
        if (obj.get("data")?.id === "name-text") {
          obj.set({
            left: 250,
            top: 395,
            originX: "center",
            originY: "center",
          });
        }
        if (obj.get("data")?.id === "pos-text") {
          obj.set({
            left: 250,
            top: 430,
            originX: "center",
            originY: "center",
          });
        }
      });
      canvas.requestRenderAll();
      return;
    }

    setFrameLoading(true);
    const probeImg = new Image();
    probeImg.crossOrigin = "anonymous";
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

      fabric.Image.fromURL(selectedFrame, { crossOrigin: "anonymous" })
        .then((img) => {
          const fabricW =
            img.get("width") ??
            (img as fabric.FabricObject & { width?: number }).width ??
            1;
          const fabricH =
            img.get("height") ??
            (img as fabric.FabricObject & { height?: number }).height ??
            1;
          const scaleX = cw / fabricW;
          const scaleY = ch / fabricH;
          img.set({
            scaleX,
            scaleY,
            left: 0,
            top: 0,
            originX: "left",
            originY: "top",
            selectable: false,
            evented: false,
          });

          if (canvas.backgroundImage) {
            (canvas.backgroundImage as fabric.FabricObject).dispose?.();
          }
          canvas.backgroundImage = img;

          canvas.getObjects().forEach((obj) => {
            if (obj.get("data")?.id === "name-text") {
              obj.set({
                left: cw / 2,
                top: ch - 105,
                originX: "center",
                originY: "center",
              });
            }
            if (obj.get("data")?.id === "pos-text") {
              obj.set({
                left: cw / 2,
                top: ch - 70,
                originX: "center",
                originY: "center",
              });
            }
          });

          canvas.requestRenderAll();
          setFrameLoading(false);
        })
        .catch(() => setFrameLoading(false));
    };
    probeImg.onerror = () => setFrameLoading(false);
    probeImg.src = selectedFrame;
  }, [selectedFrame]);

  // 4. Background Removal Logic
  const handleRemoveBackground = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const userPhoto = canvas
      .getObjects()
      .find((obj) => obj.get("data")?.type === "user-photo") as fabric.Image;
    if (!userPhoto) return alert("Please upload a photo first!");

    try {
      setIsRemoving(true);
      const imageSrc = userPhoto.getSrc();
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(imageSrc, {
        output: { format: "image/png", quality: 1 },
      });

      const { blob: uploadBlob, filename } = await compressToMax3MB(blob, "photo.png");
      const formData = new FormData();
      formData.append("file", uploadBlob, filename);
      const res = await fetch("/api/upload-photo", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsRemoving(false);
        alert(data?.error || "Upload failed");
        return;
      }
      const url = data?.url;
      if (!url || typeof url !== "string") {
        setIsRemoving(false);
        alert("Invalid response");
        return;
      }

      addLocalImage({ src: url, name: "Photo (no BG)" });

      fabric.Image.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
        img.set({
          left: userPhoto.left,
          top: userPhoto.top,
          scaleX: userPhoto.scaleX,
          scaleY: userPhoto.scaleY,
          data: { type: "user-photo" },
        });
        canvas.remove(userPhoto);
        canvas.add(img);
        canvas.bringObjectToFront(img);
        canvas.getObjects().forEach((obj) => {
          if (obj.get("data")?.id?.includes("text"))
            canvas.bringObjectToFront(obj);
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
    const photo = canvas
      ?.getObjects()
      .find((obj) => obj.get("data")?.type === "user-photo");
    if (photo) {
      photo.scale(val / 100);
      canvas?.renderAll();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;

    setPhotoUploading(true);
    try {
      const { blob, filename } = await compressToMax3MB(file);
      const formData = new FormData();
      formData.append("file", blob, filename);

      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Upload failed");
        return;
      }
      const url = data?.url;
      if (!url || typeof url !== "string") {
        alert("Invalid response");
        return;
      }

      const canvas = fabricRef.current;
      canvas.getObjects().forEach((obj) => {
        if (obj.get("data")?.type === "user-photo") canvas.remove(obj);
      });

      fabric.Image.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
        const canvasW = canvas.getWidth();
        const canvasH = canvas.getHeight();
        const w = (img.get("width") as number) ?? 1;
        const h = (img.get("height") as number) ?? 1;
        const scaleToFit = Math.min(1, canvasW / w, canvasH / h);
        img.set({
          scaleX: scaleToFit,
          scaleY: scaleToFit,
          data: { type: "user-photo" },
        });
        setPhotoZoom(scaleToFit * 100);
        canvas.add(img);
        canvas.centerObject(img);
        canvas.bringObjectToFront(img);
        canvas.getObjects().forEach((obj) => {
          if (obj.get("data")?.id?.includes("text"))
            canvas.bringObjectToFront(obj);
        });
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setPhotoUploading(false);
    }

    e.target.value = "";
  };

  const downloadImage = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const doDownload = (dataURL: string) => {
      const link = document.createElement("a");
      link.download = "poster.png";
      link.href = dataURL;
      link.click();
      const currentFrame = framesList.find((f) => f.src === selectedFrame);
      const frameId = currentFrame?._id ?? null;
      fetch("/api/stats/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameId }),
      }).catch(() => {});
    };

    const exportScale = 3;
    const w = canvas.getWidth();
    const h = canvas.getHeight();

    const blobToDataURL = (blob: Blob): Promise<string> =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });

    const inlineExternalImagesInSvg = async (svgString: string): Promise<string> => {
      const urlRegex = /((?:xlink:)?href=")(https?:\/\/[^"]+)(")/g;
      const matches = [...svgString.matchAll(urlRegex)];
      const uniqueByUrl = new Map<string, string>();
      for (const m of matches) {
        const url = m[2]!;
        if (uniqueByUrl.has(url)) continue;
        try {
          const res = await fetch(url, { mode: "cors" });
          if (!res.ok) continue;
          const blob = await res.blob();
          const dataUrl = await blobToDataURL(blob);
          uniqueByUrl.set(url, dataUrl);
        } catch {
          // leave URL as-is if fetch fails (CORS etc.)
        }
      }
      if (uniqueByUrl.size === 0) return svgString;
      return svgString.replace(urlRegex, (_, prefix: string, url: string, suffix: string) => {
        const dataUrl = uniqueByUrl.get(url);
        return dataUrl ? `${prefix}${dataUrl}${suffix}` : `${prefix}${url}${suffix}`;
      });
    };

    try {
      let svgString = canvas.toSVG();
      svgString = await inlineExternalImagesInSvg(svgString);

      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("SVG load failed"));
        el.src = svgUrl;
      });

      const outW = w * exportScale;
      const outH = h * exportScale;
      const offscreen = document.createElement("canvas");
      offscreen.width = outW;
      offscreen.height = outH;
      const ctx = offscreen.getContext("2d");
      if (!ctx) throw new Error("No 2d context");

      ctx.drawImage(img, 0, 0, outW, outH);
      URL.revokeObjectURL(svgUrl);

      const dataURL = offscreen.toDataURL("image/png");
      doDownload(dataURL);
    } catch {
      const dataURL = canvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: exportScale,
      });
      doDownload(dataURL);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col bg-muted/30 md:flex-row">
      {/* LEFT SIDEBAR */}
      <aside className="flex h-screen w-full flex-col border-r bg-card shadow-sm md:w-[300px]" suppressHydrationWarning>
        <div className="shrink-0 border-b bg-card px-3 py-2 flex items-center gap-2">
          <img
            src="/favicon.png"
            alt=""
            className="size-8 shrink-0 object-contain"
          />
          <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
            Congress Canvas
          </h1>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
          <Card className="mb-2 gap-1 py-2 px-3">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                1. Person details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-0 pt-0">
              <div className="space-y-1">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={userPosition}
                  onChange={(e) => setUserPosition(e.target.value)}
                  placeholder="Position"
                />
              </div>
            </CardContent>
          </Card>

          <Separator className="my-2" />

          <Card className="mb-2 gap-1 py-2 px-3">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                2. Photo & AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-0 pt-0">
              <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
                <Upload className="size-4" />
                {photoUploading ? "Uploading…" : "Upload photo"}
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleImageUpload}
                  accept="image/*"
                  disabled={photoUploading}
                />
              </Label>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleRemoveBackground}
                disabled={isRemoving}
              >
                <Sparkles className="size-4" />
                {isRemoving ? "Processing…" : "Remove background"}
              </Button>
            </CardContent>
          </Card>

          <Separator className="my-2" />

          <Card className="mb-2 gap-1 py-2 px-3">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                3. Edit photo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              <div className="space-y-2">
                <Label>Photo zoom — {Math.round(photoZoom)}%</Label>
                <Slider
                  min={10}
                  max={200}
                  value={[photoZoom]}
                  onValueChange={(v) => handleZoom(v[0] ?? 100)}
                  className="w-full"
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="size-4" />
                  Delete selected image
                </Button>
                <p className="text-xs text-muted-foreground">
                  Select an image on the canvas, then click above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* CENTER: Canvas + Download */}
      <div className="flex flex-1 flex-col items-center justify-center bg-muted/50 p-6 min-w-0">
        <div
          style={{
            width: canvasSize.width + 4,
            height: canvasSize.height + 4,
            padding: 2,
            boxSizing: "border-box",
            borderRadius: 8,
          }}
          className="bg-card shadow-lg border rounded-lg relative"
        >
          <div
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              borderRadius: 4,
            }}
            className="relative overflow-hidden bg-muted/30"
          >
            {/* Loading overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm font-medium z-10 transition-opacity"
              style={{
                borderRadius: 4,
                visibility: frameLoading ? "visible" : "hidden",
                opacity: frameLoading ? 1 : 0,
              }}
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

      {/* RIGHT: Collapsible frames sidebar */}
      <aside
        className={`flex flex-col border-l bg-card shadow-sm transition-[width] duration-200 overflow-hidden h-screen shrink-0 ${
          rightFramesOpen ? "w-[280px]" : "w-12"
        }`}
      >
        <div className="flex items-center gap-1 border-b p-2 min-h-0 shrink-0">
          {rightFramesOpen ? (
            <>
              <div className="flex gap-1 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("templates")}
                  title={`Frames (${dbFrames.length})`}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border-2 py-2 px-1.5 transition-colors min-w-0 ${
                    rightPanelTab === "templates"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <LayoutTemplate className="size-5 shrink-0" />
                  <span className="text-[10px] font-medium truncate w-full text-center">Frames</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("assets")}
                  title={`Assets (${dbAssets.length})`}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border-2 py-2 px-1.5 transition-colors min-w-0 ${
                    rightPanelTab === "assets"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="size-5 shrink-0" />
                  <span className="text-[10px] font-medium truncate w-full text-center">Assets</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("images")}
                  title={`Your images (${localImages.length})`}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border-2 py-2 px-1.5 transition-colors min-w-0 ${
                    rightPanelTab === "images"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Images className="size-5 shrink-0" />
                  <span className="text-[10px] font-medium truncate w-full text-center">Your images</span>
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setRightFramesOpen(false)}
                aria-label="Collapse panel"
                suppressHydrationWarning
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => setRightFramesOpen(true)}
              aria-label="Expand panel"
              suppressHydrationWarning
            >
              <LayoutTemplate className="size-5" />
            </Button>
          )}
        </div>
        {rightFramesOpen && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-3 pt-2 pb-1 shrink-0">
              <h3 className="text-sm font-semibold text-foreground">
                {rightPanelTab === "templates" && "Frames"}
                {rightPanelTab === "assets" && "Assets"}
                {rightPanelTab === "images" && "Your images"}
              </h3>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto p-2 pt-0">
              {rightPanelTab === "templates" && (
                <div className="flex flex-col gap-2">
                  {framesList.map((frame) => (
                    <button
                      key={frame._id}
                      type="button"
                      onClick={() => handleSelectFrame(frame.src)}
                      className={`relative w-full rounded-md border-2 transition-colors overflow-hidden shrink-0 max-h-[50vh] ${
                        selectedFrame === frame.src
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 bg-muted/30"
                      }`}
                    >
                      <img
                        src={frame.src}
                        alt={frame.name}
                        className="w-full h-auto object-contain block"
                      />
                    </button>
                  ))}
                </div>
              )}
              {rightPanelTab === "assets" && (
                <div className="grid grid-cols-2 gap-1.5">
                  {dbAssets.map((asset) => (
                    <button
                      key={asset._id}
                      type="button"
                      onClick={() => handleAddAsset(asset.src)}
                      className="aspect-square rounded-md border-2 border-border hover:border-primary/50 bg-muted/30 overflow-hidden shrink-0 transition-colors"
                      title={asset.name}
                    >
                      <img
                        src={asset.src}
                        alt={asset.name}
                        className="w-full h-full object-contain block"
                      />
                    </button>
                  ))}
                  {dbAssets.length === 0 && (
                    <p className="col-span-2 text-xs text-muted-foreground py-4 text-center">
                      No assets yet
                    </p>
                  )}
                </div>
              )}
              {rightPanelTab === "images" && (
                <div className="grid grid-cols-2 gap-1.5">
                  {localImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative group aspect-square rounded-md border-2 border-border hover:border-primary/50 bg-muted/30 overflow-hidden shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => handleAddAsset(img.src)}
                        className="absolute inset-0 w-full h-full block"
                        title={img.name ?? "Add to canvas"}
                      >
                        <img
                          src={img.src}
                          alt={img.name ?? "Your image"}
                          className="w-full h-full object-contain block"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLocalImage(img.id);
                        }}
                        className="absolute top-0.5 right-0.5 p-1 rounded bg-red-500/90 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove from list"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                  {localImages.length === 0 && (
                    <p className="col-span-2 text-xs text-muted-foreground py-4 text-center">
                      No images yet. Remove a photo background to add one here.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
