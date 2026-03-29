"use client";
import { useState, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MagnifyingGlassIcon, TrashIcon, CheckCircleIcon, XMarkIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { useSpeedTestRouter } from "@/hooks/useSpeedTestRouter";

export default function HistoryPage() {
  const { currentMode, historyData, setHistoryData } = useAppStore();
  const { routeWithSpeedTest, isSpeedTesting } = useSpeedTestRouter();
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (key: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要删除选中的 ${selectedIds.size} 部影片关联的所有播放历史吗？`)) {
      const newData = historyData.filter(
        (v) => !selectedIds.has(v.videoName?.toLowerCase().trim() || String(v.videoId)),
      );
      setHistoryData(newData);
      setSelectedIds(new Set());
      setIsEditing(false);
    }
  };

  const displayData = useMemo(() => {
    let data = historyData.filter((v) => v.mode === currentMode);
    if (search.trim()) {
      data = data.filter((v) =>
        v.videoName?.toLowerCase().includes(search.toLowerCase()),
      );
    }
    const uniqueData = [];
    const seen = new Set();
    for (const item of data) {
       const key = item.videoName?.toLowerCase().trim() || String(item.videoId);
       if (!seen.has(key)) {
           seen.add(key);
           uniqueData.push(item);
       }
    }
    return uniqueData;
  }, [historyData, currentMode, search]);

  return (
    <div className="space-y-3 pb-24">
      <header className="pt-2 flex flex-row items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">播放历史</h1>
        {displayData.length > 0 && (
          <div className="flex items-center space-x-3">
            {isEditing && (
              <button
                disabled={selectedIds.size === 0}
                onClick={handleDeleteSelected}
                className="relative flex items-center justify-center p-2 rounded-full text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                title="删除选中"
              >
                <TrashIcon className="w-6 h-6" />
                {selectedIds.size > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 tabular-nums text-[10px] font-bold text-white shadow ring-2 ring-white dark:ring-[#1c1c1e]">
                    {selectedIds.size}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) setSelectedIds(new Set());
                setIsEditing(!isEditing);
              }}
              className="flex items-center justify-center p-2 rounded-full text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors select-none"
              title={isEditing ? "取消" : "多选管理"}
            >
              {isEditing ? <XMarkIcon className="w-6 h-6" /> : <ListBulletIcon className="w-6 h-6" />}
            </button>
          </div>
        )}
      </header>

      {/* Local Search Component */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-white/5 text-gray-900 border-none dark:text-white rounded-full pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-shadow"
          placeholder="在历史中搜索..."
        />
      </div>

      {displayData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 mb-4 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">暂无播放历史</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
          {displayData.map((video, idx) => {
            const key = video.videoName?.toLowerCase().trim() || String(video.videoId);
            const isSelected = selectedIds.has(key);
            return (
              <button
                onClick={() => {
                  if (isEditing) {
                    toggleSelection(key);
                  } else {
                    routeWithSpeedTest({ ...video, vod_name: video.videoName });
                  }
                }}
                key={`${video._sourceId}-${video.videoId}-${idx}`}
                className={`flex flex-col group cursor-pointer relative ${isEditing && isSelected ? "opacity-70 scale-[0.98]" : ""} transition-all outline-none`}
              >
                {isEditing && (
                  <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full border-2 border-white/90 bg-black/40 shadow-sm flex items-center justify-center pointer-events-none">
                    {isSelected && (
                      <div className="w-3.5 h-3.5 bg-blue-500 rounded-full" />
                    )}
                  </div>
                )}
                <div className="aspect-[3/4] w-full bg-gray-200 dark:bg-gray-800 rounded-xl relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.2)] hover:ring-2 hover:ring-blue-500/50 transition-all duration-500 transform hover:-translate-y-1.5 text-left block">
                  {currentMode !== "Adult" && (
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md pointer-events-none">
                      <span className="text-[10px] sm:text-xs text-white/90 font-medium tracking-wide">
                        {video._sourceName}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse pointer-events-none" />
                  {video.videoPic ? (
                    <img
                      src={video.videoPic}
                      alt={video.videoName}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-white/5">
                      <span className="text-gray-400 text-xs">暂无封面</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
                <div className="mt-2 px-1 w-full text-left">
                  <h3 className="text-gray-900 dark:text-gray-100 font-medium text-[13px] md:text-sm line-clamp-2 leading-tight">
                    {video.videoName}
                  </h3>
                  {video.epName && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-gray-500 flex-1 truncate">
                        {video.epName}
                      </span>
                    </div>
                  )}
                  {(video.duration || 0) > 0 &&
                    (video.currentTime || 0) > 0 && (
                      <div className="relative mt-2 h-1 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-blue-500"
                          style={{
                            width: `${Math.min(100, ((video.currentTime || 0) / (video.duration || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isSpeedTesting && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-white text-lg font-medium tracking-wider drop-shadow-md">
            正在全网测速寻源...
          </div>
          <div className="text-white/70 text-sm mt-2">寻找最佳播放路线</div>
        </div>
      )}
    </div>
  );
}
