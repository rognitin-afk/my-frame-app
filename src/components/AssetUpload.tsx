'use client';

import React, { useState, useRef } from 'react';
import { compressToMax3MB } from '@/lib/compress-image';

type Props = {
  onSuccess?: () => void;
};

const allowedExtensions = [".webp", ".jpg", ".jpeg", ".png", ".heic", ".heif"];
const allowedTypes = ["image/webp", "image/jpeg", "image/png", "image/heic", "image/heif"];
const isAllowedImage = (f: File) =>
  allowedTypes.includes(f.type) ||
  allowedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));

export default function AssetUpload({ onSuccess }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [name, setName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const { blob, filename } = await compressToMax3MB(selectedFile);
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('name', name.trim());

      const response = await fetch('/api/asset/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus('success');
        setName('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onSuccess?.();
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Asset upload error:', err);
      setStatus('error');
      setErrorMessage('Connection failed');
    }
  };

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-3 w-full">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">File</span>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/webp,image/jpeg,image/png,image/heic,image/heif,.webp,.jpg,.jpeg,.png,.heic,.heif"
            onChange={handleFileChange}
            className="flex-1 text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-primary/40 file:bg-primary/5 file:text-primary file:text-sm file:font-medium hover:file:bg-primary/10 file:transition-colors file:cursor-pointer"
          />
        </div>
      </label>
      {selectedFile && (
        <p className="text-xs text-slate-500 truncate" title={selectedFile.name}>
          Selected: {selectedFile.name}
        </p>
      )}

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

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === 'saving' || !selectedFile || !name.trim()}
        className={`${
          status === 'success' ? 'bg-green-600' : 'bg-primary hover:opacity-90 text-primary-foreground'
        } w-full py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {status === 'saving' ? 'Uploading…' : status === 'success' ? 'Added! Upload another' : 'Upload asset'}
      </button>
    </form>
  );
}
