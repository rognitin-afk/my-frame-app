'use client';

import React, { useState, useRef } from 'react';

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
      const paramsRes = await fetch('/api/frame/upload-params', { credentials: 'same-origin' });
      if (!paramsRes.ok) {
        const err = await paramsRes.json().catch(() => ({}));
        throw new Error(err.error || 'Could not get upload params');
      }
      const params = await paramsRes.json() as {
        cloudName: string;
        apiKey: string;
        signature: string;
        timestamp: number;
        folder: string;
        resource_type: string;
      };

      const formData = new FormData();
      formData.append('file', selectedFile, selectedFile.name);
      formData.append('api_key', params.apiKey);
      formData.append('timestamp', String(params.timestamp));
      formData.append('signature', params.signature);
      formData.append('folder', params.folder);
      formData.append('resource_type', params.resource_type);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`;
      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json().catch(() => ({}));
      const src = uploadData.secure_url;
      if (!uploadRes.ok || !src) {
        throw new Error(uploadData.error?.message || 'Upload to Cloudinary failed');
      }

      const saveRes = await fetch('/api/frame/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: trimmedName, src, category: trimmedCategory }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to save frame');
      }

      setStatus('success');
      setName('');
      setCategory('General');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.();
    } catch (err) {
      console.error('Upload error:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-3 w-full">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">File</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/webp,image/jpeg,image/png,image/heic,image/heif,.webp,.jpg,.jpeg,.png,.heic,.heif"
          onChange={handleFileChange}
          className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-primary/40 file:bg-primary/5 file:text-primary file:text-sm file:font-medium hover:file:bg-primary/10 file:transition-colors file:cursor-pointer"
        />
      </label>
      {selectedFile && (
        <p className="text-xs text-slate-500 truncate" title={selectedFile.name}>
          Selected: {selectedFile.name}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Title (default: file name)</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Election Frame"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Category</span>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="General"
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
        {status === 'saving' ? 'Uploading…' : status === 'success' ? 'Added! Upload another' : 'Upload frame to MongoDB'}
      </button>
    </form>
  );
}
