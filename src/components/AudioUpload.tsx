"use client";

import React, { useState, useRef } from "react";

const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-m4a"];
const allowedExtensions = [".mp3", ".mpeg", ".wav", ".ogg", ".m4a"];

const isAllowedAudio = (f: File) => {
  const hasAllowedExt = allowedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));
  if (hasAllowedExt) return true; // e.g. .mpeg often reported as video/mpeg by OS
  if (f.type.startsWith("video/")) return false;
  return allowedTypes.includes(f.type);
};

type Props = {
  onSuccess?: () => void;
};

export default function AudioUpload({ onSuccess }: Props) {
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isAllowedAudio(file)) {
        setErrorMessage("Use MP3, MPEG, WAV, OGG, or M4A only.");
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
      setErrorMessage("Choose a file and enter a name.");
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      // 1) Get signed upload params from our backend (no env on frontend)
      const paramsRes = await fetch("/api/audio/upload-params", {
        credentials: "same-origin",
      });
      if (!paramsRes.ok) {
        const err = await paramsRes.json().catch(() => ({}));
        throw new Error(err.error || "Could not get upload params");
      }
      const params = await paramsRes.json() as {
        cloudName: string;
        apiKey: string;
        signature: string;
        timestamp: number;
        folder: string;
        resource_type: string;
      };

      // 2) Upload directly to Cloudinary (no file through our server → no body limit)
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("api_key", params.apiKey);
      formData.append("timestamp", String(params.timestamp));
      formData.append("signature", params.signature);
      formData.append("folder", params.folder);
      formData.append("resource_type", params.resource_type);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${params.cloudName}/video/upload`;
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      const src = uploadData.secure_url;
      if (!uploadRes.ok || !src) {
        throw new Error(uploadData.error?.message || "Upload to Cloudinary failed");
      }

      // 3) Save URL + name in our DB via backend
      const saveRes = await fetch("/api/audio/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: name.trim(), src }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        throw new Error(saveData.error || "Failed to save audio");
      }

      setStatus("success");
      setName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-3 w-full">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Audio file</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/x-m4a,.mp3,.mpeg,.wav,.ogg,.m4a"
          onChange={handleFileChange}
          className="flex-1 text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-primary/40 file:bg-primary/5 file:text-primary file:text-sm file:font-medium"
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
          placeholder="e.g. Background music"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </label>

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "saving" || !selectedFile || !name.trim()}
        className={`${
          status === "success"
            ? "bg-green-600"
            : "bg-primary hover:opacity-90 text-primary-foreground"
        } w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {status === "saving"
          ? "Uploading…"
          : status === "success"
            ? "Added! Upload another"
            : "Upload audio"}
      </button>
    </form>
  );
}
