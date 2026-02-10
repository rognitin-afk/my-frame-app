'use client';

import React, { useState, useRef } from 'react';
import { compressToMax3MB } from '@/lib/compress-image';

const allowedExtensions = [".webp", ".jpg", ".jpeg", ".png", ".heic", ".heif"];
const allowedTypes = ["image/webp", "image/jpeg", "image/png", "image/heic", "image/heif"];
const isAllowedImage = (f: File) =>
  allowedTypes.includes(f.type) ||
  allowedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));

type Props = {
  onSuccess?: () => void;
};

export default function AssetUploadRemoveBg({ onSuccess }: Props) {
  const [name, setName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isAllowedImage(file)) {
        setErrorMessage("Only WebP, JPG, PNG, and iPhone (HEIC/HEIF) are allowed.");
        setSelectedFile(null);
        setResultBlob(null);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(null);
        return;
      }
      setErrorMessage("");
      setSelectedFile(file);
      setResultBlob(null);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleRemoveBg = async () => {
    if (!selectedFile) return;
    setIsRemoving(true);
    setErrorMessage("");
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultBlob(null);

    try {
      const imageSrc = URL.createObjectURL(selectedFile);
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(imageSrc, {
        output: { format: "image/png", quality: 1 },
      });
      URL.revokeObjectURL(imageSrc);
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Remove BG error:", err);
      setErrorMessage("Background removal failed. Try another image.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleUploadToDb = async () => {
    if (!resultBlob || !name.trim()) return;
    setUploadStatus('saving');
    setErrorMessage("");

    try {
      const { blob, filename } = await compressToMax3MB(resultBlob, "asset.png");
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('name', name.trim());

      const res = await fetch('/api/asset/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setUploadStatus('success');
        setSelectedFile(null);
        setName('');
        setResultBlob(null);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onSuccess?.();
        setTimeout(() => setUploadStatus('idle'), 2000);
      } else {
        setUploadStatus('error');
        setErrorMessage(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadStatus('error');
      setErrorMessage('Upload failed');
    }
  };

  const handleStartOver = () => {
    setSelectedFile(null);
    setResultBlob(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrorMessage("");
    setUploadStatus('idle');
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">File</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/webp,image/jpeg,image/png,image/heic,image/heif,.webp,.jpg,.jpeg,.png,.heic,.heif"
          onChange={handleFileChange}
          disabled={!!resultBlob}
          className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-primary/40 file:bg-primary/5 file:text-primary file:text-sm file:font-medium hover:file:bg-primary/10 file:transition-colors file:cursor-pointer disabled:opacity-60"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Asset name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Star badge"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </label>

      {!resultBlob ? (
        <button
          type="button"
          onClick={handleRemoveBg}
          disabled={!selectedFile || isRemoving}
          className="w-full bg-primary hover:opacity-90 text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isRemoving ? 'Removing background…' : 'Remove background'}
        </button>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-center min-h-[100px]">
            <img src={resultUrl!} alt="Preview" className="max-h-32 object-contain" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUploadToDb}
              disabled={uploadStatus === 'saving' || !name.trim()}
              className={`flex-1 ${
                uploadStatus === 'success' ? 'bg-green-600' : 'bg-primary hover:opacity-90 text-primary-foreground'
              } py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]`}
            >
              {uploadStatus === 'saving' ? 'Uploading…' : uploadStatus === 'success' ? 'Uploaded!' : 'Upload to DB'}
            </button>
            <button
              type="button"
              onClick={handleStartOver}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-[0.98]"
            >
              Start over
            </button>
          </div>
        </>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
      )}
    </div>
  );
}
