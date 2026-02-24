"use client";
import { useEffect, useState, useMemo } from "react";
import TestDb from "../../components/TestDb";
import AssetUpload from "../../components/AssetUpload";
import AssetUploadRemoveBg from "../../components/AssetUploadRemoveBg";
import AudioUpload from "../../components/AudioUpload";
import { Modal } from "../../components/ui/modal";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UploadModal = null | "frame" | "asset-direct" | "asset-removebg" | "audio";

interface District {
  _id: string;
  name: string;
  province: string;
  headquarters: string;
  area: number;
  population: number;
}

interface Frame {
  _id: string;
  name: string;
  src: string;
  downloadCount?: number;
  districts?: string[];
}

interface Asset {
  _id: string;
  name: string;
  src: string;
}

interface AudioItem {
  _id: string;
  name: string;
  src: string;
}

type AdminTab = "frames" | "assets" | "audio";

type AuthStatus = "pending" | "authorized" | "unauthorized";

interface EditFrameFormProps {
  frame: Frame;
  districts: District[];
  onSave: (updatedFrame: Frame) => void;
  onCancel: () => void;
}

function EditFrameForm({
  frame,
  districts,
  onSave,
  onCancel,
}: EditFrameFormProps) {
  const [frameName, setFrameName] = useState(frame.name);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(
    frame.districts || [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get unique provinces from districts
  const uniqueProvinces = useMemo(
    () => Array.from(new Set(districts.map((d) => d.province))).sort(),
    [districts]
  );
  
  const [expandedProvinces, setExpandedProvinces] = useState<Set<string>>(
    () => new Set(uniqueProvinces)
  );

  // Update expandedProvinces when uniqueProvinces changes
  useEffect(() => {
    setExpandedProvinces(new Set(uniqueProvinces));
  }, [uniqueProvinces]);

  const toggleDistrict = (districtId: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(districtId)
        ? prev.filter((id) => id !== districtId)
        : [...prev, districtId],
    );
  };

  const removeDistrict = (districtId: string) => {
    setSelectedDistricts((prev) => prev.filter((id) => id !== districtId));
  };

  const toggleProvince = (province: string) => {
    setExpandedProvinces((prev) => {
      const next = new Set(prev);
      if (next.has(province)) {
        next.delete(province);
      } else {
        next.add(province);
      }
      return next;
    });
  };

  const selectAllInProvince = (provinceDistricts: District[]) => {
    const districtIds = provinceDistricts.map((d) => d._id);
    setSelectedDistricts((prev) => {
      const combined = [...prev];
      districtIds.forEach((id) => {
        if (!combined.includes(id)) {
          combined.push(id);
        }
      });
      return combined;
    });
  };

  const deselectAllInProvince = (provinceDistricts: District[]) => {
    const districtIds = provinceDistricts.map((d) => d._id);
    setSelectedDistricts((prev) =>
      prev.filter((id) => !districtIds.includes(id)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/frame/${frame._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: frameName, districts: selectedDistricts }),
        credentials: "same-origin",
      });

      if (res.ok) {
        const updated = await res.json();
        onSave({ ...frame, name: frameName, districts: selectedDistricts });
      } else {
        alert("Failed to update frame");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating frame");
    }
  };

  // Filter and group districts
  const filteredDistricts = districts.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.province.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const groupedDistricts = filteredDistricts.reduce(
    (acc, district) => {
      const province = district.province;
      if (!acc[province]) acc[province] = [];
      acc[province].push(district);
      return acc;
    },
    {} as Record<string, District[]>,
  );

  // Sort provinces and districts
  Object.keys(groupedDistricts).forEach((province) => {
    groupedDistricts[province].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Get selected district objects for chip display
  const selectedDistrictObjects = districts.filter((d) =>
    selectedDistricts.includes(d._id),
  );

  return (
    <div className="bg-white rounded max-w-5xl mx-auto border border-slate-200">
      <form onSubmit={handleSubmit} className="space-y-1">
        {/* Frame Name Input */}
        <div className="border-b border-slate-200 p-2">
          <input
            type="text"
            value={frameName}
            onChange={(e) => setFrameName(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-900"
            placeholder="Frame name"
            required
          />
        </div>

        {/* Selected Districts as Chips */}
        {selectedDistrictObjects.length > 0 && (
          <div className="border border-slate-200 rounded p-2">
            <div className="flex items-center">
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedDistricts([])}
                className="ml-auto text-xs text-slate-500 hover:text-slate-900"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedDistrictObjects.map((district) => (
                <div
                  key={district._id}
                  className="flex items-center space-x-1 bg-slate-100 rounded pl-2 pr-1 py-1"
                >
                  <span className="text-xs text-slate-700">
                    {district.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDistrict(district._id)}
                    className="flex items-center justify-center w-4 h-4 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                    title="Remove"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search districts or provinces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2.5 py-1.5 pl-8 pr-8 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-900"
          />
          <svg
            className="absolute left-2.5 top-2 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-900"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Districts List with Accordion */}
        <div className="max-h-[32rem] overflow-y-auto border border-slate-200 rounded">
          {Object.keys(groupedDistricts).length > 0 ? (
            <div className="divide-y divide-slate-200">
              {Object.entries(groupedDistricts).map(
                ([province, provinceDistricts]) => {
                  const isExpanded = expandedProvinces.has(province);
                  const allSelected = provinceDistricts.every((d) =>
                    selectedDistricts.includes(d._id),
                  );
                  const someSelected = provinceDistricts.some((d) =>
                    selectedDistricts.includes(d._id),
                  );

                  return (
                    <div key={province}>
                      {/* Province Header */}
                      <div className="px-2.5 py-1.5 bg-slate-50">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleProvince(province)}
                            className="flex items-center space-x-2 flex-1 text-left"
                          >
                            <svg
                              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                                isExpanded ? "transform rotate-90" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            <span className="text-sm font-medium text-slate-900">
                              {province}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({provinceDistricts.length})
                            </span>
                            {someSelected && (
                              <span className="text-xs text-slate-600">
                                ·{" "}
                                {
                                  provinceDistricts.filter((d) =>
                                    selectedDistricts.includes(d._id),
                                  ).length
                                }{" "}
                                selected
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              allSelected
                                ? deselectAllInProvince(provinceDistricts)
                                : selectAllInProvince(provinceDistricts)
                            }
                            className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1"
                          >
                            {allSelected ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                      </div>

                      {/* Province Districts */}
                      {isExpanded && (
                        <div className="p-1.5 grid grid-cols-2 gap-1">
                          {provinceDistricts.map((district) => (
                            <label
                              key={district._id}
                              className={`flex items-center space-x-2 p-1.5 rounded cursor-pointer ${
                                selectedDistricts.includes(district._id)
                                  ? "bg-slate-100"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedDistricts.includes(
                                  district._id,
                                )}
                                onChange={() => toggleDistrict(district._id)}
                                className="w-3.5 h-3.5 text-slate-900 rounded focus:ring-1 focus:ring-slate-900 cursor-pointer"
                              />
                              <span className="text-sm text-slate-700 flex-1">
                                {district.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          ) : searchTerm ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600">
                No districts found matching "{searchTerm}"
              </p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No districts available</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm text-white bg-slate-900 rounded hover:bg-slate-800"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPortal() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("pending");
  const [tab, setTab] = useState<AdminTab>("frames");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [audioList, setAudioList] = useState<AudioItem[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);
  const [uploadModal, setUploadModal] = useState<UploadModal>(null);
  const [editingFrame, setEditingFrame] = useState<Frame | null>(null);

  // Restrict client-side: no valid admin cookie (API returns 401) -> redirect to login
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { credentials: "same-origin" })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 401) setAuthStatus("unauthorized");
        else setAuthStatus("authorized");
      })
      .catch(() => {
        if (!cancelled) setAuthStatus("unauthorized");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authStatus === "unauthorized") router.replace("/admin-login");
  }, [authStatus, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/admin-logout", {
        method: "POST",
        credentials: "same-origin",
      });
      router.push("/admin-login");
    } catch {
      router.push("/admin-login");
    }
  };

  const loadFrames = async () => {
    try {
      const res = await fetch("/api/frame");
      const data = await res.json();
      setFrames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async () => {
    try {
      const res = await fetch("/api/districts");
      const data = await res.json();
      setDistricts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch districts error:", err);
    } finally {
      setDistrictsLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const res = await fetch("/api/asset");
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch assets error:", err);
    } finally {
      setAssetsLoading(false);
    }
  };

  const loadAudio = async () => {
    setAudioLoading(true);
    try {
      const res = await fetch("/api/audio");
      const data = await res.json();
      setAudioList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch audio error:", err);
    } finally {
      setAudioLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (typeof data?.downloadCount === "number")
        setDownloadCount(data.downloadCount);
    } catch {
      setDownloadCount(null);
    }
  };

  useEffect(() => {
    if (authStatus === "authorized") {
      loadFrames();
      loadDistricts();
      loadStats();
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === "authorized" && tab === "assets") loadAssets();
  }, [authStatus, tab]);

  useEffect(() => {
    if (authStatus === "authorized" && tab === "audio") loadAudio();
  }, [authStatus, tab]);

  const handleDeleteFrame = async (id: string) => {
    if (!confirm("Are you sure you want to delete this frame?")) return;

    try {
      const res = await fetch("/api/frame", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setFrames(frames.filter((f) => f._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const res = await fetch("/api/asset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setAssets(assets.filter((a) => a._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleDeleteAudio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this audio?")) return;

    try {
      const res = await fetch("/api/audio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setAudioList(audioList.filter((a) => a._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  if (authStatus !== "authorized") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight shrink-0">
              Admin
            </h1>
            <p className="text-slate-500 text-sm truncate hidden sm:block">
              Frames & assets
            </p>
            {downloadCount !== null && (
              <span className="text-xs text-slate-500 shrink-0">
                Downloads:{" "}
                <span className="font-semibold text-slate-700">
                  {downloadCount.toLocaleString()}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition-all"
            >
              Logout
            </button>
            <Link
              href="/"
              className="text-xs font-medium bg-white px-3 py-1.5 rounded-lg border shadow-sm hover:text-primary transition-all"
            >
              Exit →
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-4 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab("frames")}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              tab === "frames"
                ? "bg-white border border-b-0 border-primary/30 text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Frames
          </button>
          <button
            type="button"
            onClick={() => setTab("assets")}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              tab === "assets"
                ? "bg-white border border-b-0 border-primary/30 text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Assets
          </button>
          <button
            type="button"
            onClick={() => setTab("audio")}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              tab === "audio"
                ? "bg-white border border-b-0 border-primary/30 text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Audio
          </button>
        </div>

        {tab === "frames" && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setUploadModal("frame")}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Upload new frame
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
                Existing Frames ({frames.length})
              </h2>
              {loading ? (
                <div className="py-10 text-center text-slate-400 animate-pulse">
                  Connecting to MongoDB...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {frames.map((frame) => (
                    <div
                      key={frame._id}
                      className="group relative flex flex-col bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg rounded-2xl overflow-hidden transition-all"
                    >
                      <div className="aspect-square bg-white flex items-center justify-center p-2">
                        <img
                          src={frame.src}
                          alt={frame.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col flex-1 p-3 min-w-0">
                        <p
                          className="font-bold text-slate-800 text-sm truncate"
                          title={frame.name}
                        >
                          {frame.name}
                        </p>
                        <p
                          className="text-[10px] text-slate-400 font-mono truncate mt-0.5"
                          title={frame._id}
                        >
                          {frame._id}
                        </p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">
                          {(frame.downloadCount ?? 0).toLocaleString()}{" "}
                          downloads
                        </p>
                        <button
                          onClick={() => setEditingFrame(frame)}
                          className="mt-2 w-full py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFrame(frame._id)}
                          className="mt-2 w-full py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {frames.length === 0 && (
                    <div className="col-span-full py-10 text-center border-2 border-dashed rounded-2xl text-slate-400">
                      No frames found in database.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "assets" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setUploadModal("asset-direct")}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Direct upload
              </button>
              <button
                type="button"
                onClick={() => setUploadModal("asset-removebg")}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Remove BG then upload
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Image assets only. For audio, use the Audio tab.
            </p>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
                Existing Assets ({assets.length})
              </h2>
              {assetsLoading ? (
                <div className="py-10 text-center text-slate-400 animate-pulse">
                  Loading...
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                  {assets.map((asset) => (
                    <div
                      key={asset._id}
                      className="group relative flex flex-col bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md rounded-xl overflow-hidden transition-all"
                    >
                      <div className="aspect-square bg-white flex items-center justify-center p-1.5">
                        <img
                          src={asset.src}
                          alt={asset.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col flex-1 p-2 min-w-0">
                        <p
                          className="font-bold text-slate-800 text-xs truncate"
                          title={asset.name}
                        >
                          {asset.name}
                        </p>
                        <p
                          className="text-[9px] text-slate-400 font-mono truncate mt-0.5"
                          title={asset._id}
                        >
                          {asset._id}
                        </p>
                        <button
                          onClick={() => handleDeleteAsset(asset._id)}
                          className="mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {assets.length === 0 && (
                    <div className="col-span-full py-10 text-center border-2 border-dashed rounded-2xl text-slate-400">
                      No assets yet. Upload one above.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "audio" && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setUploadModal("audio")}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Upload audio
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
                Existing Audio ({audioList.length})
              </h2>
              {audioLoading ? (
                <div className="py-10 text-center text-slate-400 animate-pulse">
                  Loading...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {audioList.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-col bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all"
                    >
                      <p
                        className="font-bold text-slate-800 text-sm truncate"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-[9px] text-slate-400 font-mono truncate mt-0.5"
                        title={item._id}
                      >
                        {item._id}
                      </p>
                      <audio
                        src={item.src}
                        controls
                        className="mt-2 w-full h-8"
                        preload="metadata"
                      />
                      <button
                        onClick={() => handleDeleteAudio(item._id)}
                        className="mt-2 w-full py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {audioList.length === 0 && (
                    <div className="col-span-full py-10 text-center border-2 border-dashed rounded-2xl text-slate-400">
                      No audio yet. Upload one above.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload modals */}
        <Modal
          open={uploadModal === "frame"}
          onClose={() => setUploadModal(null)}
          title="Upload new frame"
        >
          <TestDb
            onSuccess={() => {
              loadFrames();
              setUploadModal(null);
            }}
          />
          <p className="mt-3 text-xs text-slate-500">
            Choose an image — it will be saved and added to the frame library.
          </p>
        </Modal>
        <Modal
          open={uploadModal === "asset-direct"}
          onClose={() => setUploadModal(null)}
          title="Direct upload asset"
        >
          <AssetUpload
            onSuccess={() => {
              loadAssets();
              setUploadModal(null);
            }}
          />
          <p className="mt-3 text-xs text-slate-500">
            Upload to Cloudinary and save to DB in one step.
          </p>
        </Modal>
        <Modal
          open={uploadModal === "asset-removebg"}
          onClose={() => setUploadModal(null)}
          title="Remove BG then upload"
        >
          <AssetUploadRemoveBg
            onSuccess={() => {
              loadAssets();
              setUploadModal(null);
            }}
          />
          <p className="mt-3 text-xs text-slate-500">
            Remove background, preview, then upload to Cloudinary and DB.
          </p>
        </Modal>
        <Modal
          open={uploadModal === "audio"}
          onClose={() => setUploadModal(null)}
          title="Upload audio"
        >
          <AudioUpload
            onSuccess={() => {
              loadAudio();
              setUploadModal(null);
            }}
          />
          <p className="mt-3 text-xs text-slate-500">
            MP3, WAV, OGG, or M4A only. Stored in Cloudinary and saved to DB.
          </p>
        </Modal>

        {/* Edit Frame Modal */}
        <Modal
          open={editingFrame !== null}
          onClose={() => setEditingFrame(null)}
          title="Edit Frame"
        >
          {editingFrame && (
            <EditFrameForm
              frame={editingFrame}
              districts={districts}
              onSave={(updatedFrame) => {
                setFrames(
                  frames.map((f) =>
                    f._id === updatedFrame._id ? updatedFrame : f,
                  ),
                );
                setEditingFrame(null);
              }}
              onCancel={() => setEditingFrame(null)}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}
