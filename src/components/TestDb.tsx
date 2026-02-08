'use client';

import { useState, useRef } from 'react';

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

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', name.trim());
    formData.append('category', category.trim() || 'General');

    try {
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
