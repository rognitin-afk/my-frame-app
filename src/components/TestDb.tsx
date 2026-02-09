'use client';

import React, { useState, useRef } from 'react';

const MAX_UPLOAD_MB = 3;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Compress image in the browser to at most 3 MB so upload fits under Vercel limit. Returns blob + filename. */
async function compressToMax3MB(file: File): Promise<{ blob: Blob; filename: string }> {
  if (file.size <= MAX_UPLOAD_BYTES) {
    return { blob: file, filename: file.name };
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxDim = 2400;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ blob: file, filename: file.name });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const tryQuality = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ blob: file, filename: file.name });
              return;
            }
            if (blob.size <= MAX_UPLOAD_BYTES || q <= 0.2) {
              const base = file.name.replace(/\.[^.]+$/, '');
              resolve({ blob, filename: `${base}.jpg` });
              return;
            }
            tryQuality(Math.max(0.2, q - 0.15));
          },
          'image/jpeg',
          q
        );
      };
      tryQuality(0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: file, filename: file.name });
    };
    img.src = url;
  });
}

type Props = {
  onSuccess?: () => void;
};

export default function TestDb({ onSuccess }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = [".webp", ".jpg", ".jpeg", ".png", ".heic", ".heif"];
  const allowedTypes = ["image/webp", "image/jpeg", "image/png", "image/heic", "image/heif"];
  const isAllowedImage = (f: File) =>
    allowedTypes.includes(f.type) ||
    allowedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isAllowedImage(file)) {
        setErrorMessage("Only WebP, JPG, PNG, and iPhone (HEIC/HEIF) are allowed.");
        setSelectedFile(null);
        return;
      }
      setErrorMessage("");
      setSelectedFile(file);
      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !name.trim()) {
      setErrorMessage('Please choose a file and enter a name.');
      return;
    }

    setStatus('saving');
    setErrorMessage('');

    const trimmedName = name.trim();
    const trimmedCategory = category.trim() || 'General';

    try {
      const { blob, filename } = await compressToMax3MB(selectedFile);
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('name', trimmedName);
      formData.append('category', trimmedCategory);

      const response = await fetch('/api/frame/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus('success');
        setName('');
        setCategory('General');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onSuccess?.();
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setStatus('error');
      setErrorMessage('Connection failed');
    }
  };

  return (
    <form onSubmit={handleUpload} className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-4 w-full">
      <p className="text-sm font-medium text-gray-600">Upload from your computer</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png,image/heic,image/heif,.webp,.jpg,.jpeg,.png,.heic,.heif"
        onChange={handleFileChange}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-medium hover:file:bg-slate-200"
      />
      {selectedFile && (
        <p className="text-xs text-slate-500 truncate" title={selectedFile.name}>
          Selected: {selectedFile.name}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Frame name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Election Frame"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Category</span>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="General"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </label>

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === 'saving' || !selectedFile || !name.trim()}
        className={`${
          status === 'success' ? 'bg-green-600' : 'bg-blue-600 hover:opacity-90'
        } text-white px-6 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {status === 'saving' ? 'Uploading...' : status === 'success' ? 'Added! Upload another' : 'Upload frame to MongoDB'}
      </button>
    </form>
  );
}
