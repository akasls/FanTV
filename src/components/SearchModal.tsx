"use client";
import { useState, useEffect, useRef } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAppStore } from "@/store/useAppStore";

interface Source {
  id: string;
  name: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const {
    currentMode,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    setSearchTerm,
    setSelectedSourceId,
    setSearchAllSources,
    drillDownSourceId,
    setDrillDownSourceId,
    userDisabledSources,
    selectedSourceId,
    targetSearchSource,
    setTargetSearchSource,
  } = useAppStore();

  const [sources, setSources] = useState<Source[]>([]);
  const [inputVal, setInputVal] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasDragged = useRef(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    hasDragged.current = false;
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const stopDrag = () => {
    setIsDragging(false);
  };

  const doDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; 
    if (Math.abs(walk) > 5) {
      hasDragged.current = true;
    }
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setInputVal("");
      if (sources.length === 0) {
        fetch(`/api/sources?mode=${currentMode}`)
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) {
              const active = data.filter(
                (s: any) => !userDisabledSources.includes(s.id) && s.isActive !== false,
              );
              setSources(active);
            }
          })
          .catch(console.error);
      }
    }
  }, [isOpen, currentMode, userDisabledSources]);

  if (!isOpen) return null;

  const handleSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    addSearchHistory(trimmed, currentMode);
    setSearchTerm(trimmed);
    if (targetSearchSource === "all") {
      setSearchAllSources(true);
      setDrillDownSourceId(null);
    } else {
      setSearchAllSources(false);
      setSelectedSourceId(targetSearchSource);
      setDrillDownSourceId(null);
    }
    onClose();
  };

  const currentHistory = searchHistory.filter((h) => h.mode === currentMode);

  return (
    <>
      <div className="fixed -inset-[10%] z-[90] bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none" />
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden overscroll-none"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-300 isolate relative transform-gpu"
        >
        {/* Top: Input Bar */}
        <div className="flex items-center p-4 md:px-6 md:py-5 bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-3xl z-20 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex-1 relative flex items-center bg-gray-100/50 dark:bg-black/30 backdrop-blur-md rounded-[20px] px-5 py-3 shadow-inner ring-1 ring-black/5 dark:ring-white/10 focus-within:ring-black/20 dark:focus-within:ring-white/30 focus-within:shadow-md transition-all duration-300 group">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors mr-3" />
            <input
              autoFocus
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(inputVal);
              }}
              placeholder="搜索影视名称..."
              className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400/80 text-[16px] font-medium"
            />
            {inputVal && (
              <button
                onClick={() => setInputVal("")}
                className="p-1.5 ml-2 bg-black/10 dark:bg-white/10 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-white transition-all hover:scale-105 active:scale-95"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle: Source Scope Selection */}
        <div className="px-4 py-4 md:px-6 md:py-5 bg-white/40 dark:bg-[#1c1c1e]/40 shrink-0 border-b border-gray-200/50 dark:border-gray-800/50 relative z-10 shadow-[0_4px_15px_rgb(0,0,0,0.02)]">
          <section>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 ml-1 uppercase tracking-wider">
              选择搜索源
            </h3>
            <div 
              ref={scrollRef}
              onMouseDown={startDrag}
              onMouseLeave={stopDrag}
              onMouseUp={stopDrag}
              onMouseMove={doDrag}
              className={`flex overflow-x-auto whitespace-nowrap custom-scrollbar gap-3 pb-2 pt-1 -mx-2 px-2 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <button
                onClick={(e) => {
                  if (hasDragged.current) {
                    e.stopPropagation();
                    return;
                  }
                  setTargetSearchSource("all");
                }}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${targetSearchSource === "all" ? "bg-black text-white dark:bg-white dark:text-black shadow-md scale-105" : "bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/20"}`}
              >
                所有源
              </button>
              {sources.map((s) => (
                <button
                  key={s.id}
                  onClick={(e) => {
                    if (hasDragged.current) {
                      e.stopPropagation();
                      return;
                    }
                    setTargetSearchSource(s.id);
                  }}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${targetSearchSource === s.id ? "bg-black text-white dark:bg-white dark:text-black shadow-md scale-105" : "bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/20"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Bottom: Search History */}
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 bg-white/40 dark:bg-[#1c1c1e]/40 border-t border-gray-200/50 dark:border-gray-800/50 hide-scrollbar rounded-b-[32px]">
          {currentHistory.length > 0 ? (
            <section>
              <div className="flex items-center justify-between mb-3 ml-1">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  搜索历史 ({currentMode === "Adult" ? "圣贤" : "普通"})
                </h3>
                <button
                  onClick={() => clearSearchHistory(currentMode)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                  title="清空历史"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentHistory.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(h.term)}
                    className="flex items-center px-4 py-2 bg-black/5 dark:bg-white/10 rounded-xl text-[13px] text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/20 transition-all shadow-sm"
                  >
                    <ClockIcon className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                    {h.term}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              暂无搜索历史
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
