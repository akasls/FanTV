"use client";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VideoItem } from "@/store/useAppStore"; // Assuming VideoItem is exported from useAppStore file
import SearchModal from "@/components/SearchModal";
import { useSpeedTestRouter } from "@/hooks/useSpeedTestRouter";

interface Source {
  id: string;
  name: string;
}

interface Category {
  type_id: string | number;
  type_name: string;
  type_pid?: string | number;
}

const CATEGORY_BLACKLIST = [
  "资讯",
  "新闻资讯",
  "影视资讯",
  "预告资讯",
  "明星资讯",
  "伦理片",
  "伦理",
];

export default function Home() {
  const {
    currentMode,
    homeFeedList,
    setHomeFeedList,
    searchAllSources,
    selectedSourceGlobal,
    setSelectedSourceGlobal,
    setSearchAllSources,
    searchTerm,
    setSearchTerm,
    inputTerm,
    setInputTerm,
    selectedCategoryId,
    setSelectedCategoryId,
    drillDownSourceId,
    setDrillDownSourceId,
    drillDownCustomApiUrl,
    setDrillDownCustomApiUrl,
    drillDownCategoryId,
    setDrillDownCategoryId,
    selectedSourceId,
    setSelectedSourceId,
    userDisabledSources,
    siteConfig,
    theme,
    setTheme,
    doubanImageProxy,
    isFilterExpanded,
    setIsFilterExpanded,
    activeStaticChannel,
    setActiveStaticChannel,
    activeStaticSubCat,
    setActiveStaticSubCat,
    doubanTag,
    setDoubanTag,
    doubanSubcat,
    setDoubanSubcat,
    doubanGenre,
    setDoubanGenre,
    doubanCountry,
    setDoubanCountry,
    doubanYear,
    setDoubanYear,
    doubanSort,
    setDoubanSort,
  } = useAppStore();

  const STATIC_CHANNELS = [
    { id: "movie", name: "电影" },
    { id: "tv", name: "连续剧" },
    ...(siteConfig?.shortDramaApiUrl ? [{ id: "short", name: "短剧" }] : []),
    { id: "variety", name: "综艺" },
    { id: "anime", name: "动漫" },
  ];
  const MOVIE_CATEGORIES = [
    "全部",
    "动作片",
    "科幻片",
    "战争片",
    "喜剧片",
    "爱情片",
    "恐怖片",
    "惊悚片",
    "纪录片",
  ];
const TV_CATEGORIES = ["全部", "大陆剧", "美剧", "英剧", "日剧", "韩剧", "欧美剧", "台剧"];
const VARIETY_CATEGORIES = ["全部", "中国综艺", "美国综艺", "英国综艺", "日本综艺", "韩国综艺"];
const ANIME_CATEGORIES = ["全部", "中国动漫", "日本动漫", "美国动漫"];

const API_DELAY = 1000;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [doubanItems, setDoubanItems] = useState<any[]>([]);

  // Advanced Douban Filters (Zustand Persisted)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [doubanPage, setDoubanPage] = useState(1);
  const [doubanHasMore, setDoubanHasMore] = useState(true);

  useEffect(() => {
    const handleClick = () => setActiveDropdown(null);
    if (activeDropdown) window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [activeDropdown]);

  const [loadingDouban, setLoadingDouban] = useState(false);
  const isShowingDouban =
    currentMode === "General" &&
    !searchTerm &&
    !drillDownSourceId &&
    !drillDownCustomApiUrl;

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showAgeWarning, setShowAgeWarning] = useState(false);
  const { routeWithSpeedTest, isSpeedTesting } = useSpeedTestRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Added error state

  // Search state
  const [sources, setSources] = useState<Source[]>([]);

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Custom Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Infinite Scroll state
  const [page, setPage] = useState(() =>
    Math.max(1, Math.ceil(homeFeedList.length / 50)),
  );
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Safe ref to avoid closure staleness or passing unsupported setter functions to Zustand
  const feedRef = useRef(homeFeedList);
  useEffect(() => {
    feedRef.current = homeFeedList;
  }, [homeFeedList]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close custom dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Desktop Drag-to-Scroll Kinematics for Sources
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingSource = useRef(false);
  const startXSource = useRef(0);
  const scrollLeftSource = useRef(0);
  const hasDraggedSource = useRef(false);

  const handleSourceMouseDown = (e: React.MouseEvent) => {
    isDraggingSource.current = true;
    hasDraggedSource.current = false;
    if (sourceScrollRef.current) {
      startXSource.current = e.pageX - sourceScrollRef.current.offsetLeft;
      scrollLeftSource.current = sourceScrollRef.current.scrollLeft;
    }
  };
  const handleSourceMouseLeave = () => {
    isDraggingSource.current = false;
  };
  const handleSourceMouseUp = () => {
    isDraggingSource.current = false;
  };
  const handleSourceMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSource.current || !sourceScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - sourceScrollRef.current.offsetLeft;
    const walk = (x - startXSource.current) * 1.5; // moderate velocity
    if (Math.abs(walk) > 5) hasDraggedSource.current = true;
    sourceScrollRef.current.scrollLeft = scrollLeftSource.current - walk;
  };

  // Fetch available sources for dropdown
  useEffect(() => {
    if (!mounted) return;
    fetch(`/api/sources?mode=${currentMode}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const active = data.filter(
            (s: any) => !userDisabledSources.includes(s.id),
          );
          setSources(active);
          const matched = active.find(
            (s: any) => s.id === selectedSourceGlobal,
          );
          if (!matched && active.length > 0) {
            setSelectedSourceGlobal(active[0].id);
            setSelectedSourceId(active[0].id);
          } else if (matched) {
            setSelectedSourceId(selectedSourceGlobal);
          } else {
            setSelectedSourceId("");
          }
        } else {
          setSources([]);
          setSelectedSourceId("");
        }
      })
      .catch(console.error);
  }, [mounted, currentMode, userDisabledSources]);

  // Fetch Douban Popular Lists
  useEffect(() => {
    if (
      currentMode === "General" &&
      !searchTerm &&
      !drillDownSourceId &&
      !drillDownCustomApiUrl
    ) {
      setLoadingDouban(true);
      const params = new URLSearchParams();
      params.append("tags", doubanTag);
      if (doubanGenre) params.append("genres", doubanGenre);
      if (doubanCountry) params.append("countries", doubanCountry);
      if (doubanYear) params.append("year_range", doubanYear);
      params.append("sort", doubanSort);
      params.append("start", String((doubanPage - 1) * 20));

      fetch(`/api/douban?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          const newItems = data.data || [];
          if (doubanPage === 1) setDoubanItems(newItems);
          else setDoubanItems((prev) => [...prev, ...newItems]);
          setDoubanHasMore(newItems.length >= 10);
        })
        .catch(console.error)
        .catch(console.error)
        .finally(() => setLoadingDouban(false));
    }
  }, [
    currentMode,
    doubanTag,
    doubanGenre,
    doubanCountry,
    doubanYear,
    doubanSort,
    searchTerm,
    drillDownSourceId,
    drillDownCustomApiUrl,
    doubanPage,
  ]);

  // Reset function
  const resetAndFetch = useCallback(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    setHomeFeedList([]);
  }, [setHomeFeedList]); // Added setHomeFeedList to deps

  // Priority Fetch for Categories (Solves category load bottleneck)
  useEffect(() => {
    if (!mounted || !selectedSourceId || selectedSourceId === "all") return;
    const fetchCats = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch(`/api/categories?sourceId=${selectedSourceId}`);
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCats();
  }, [selectedSourceId, mounted]);

  // Trigger reset when source or mode changes (SKIP INITIAL MOUNT TO PRESERVE ZUSTAND CACHE)
  const isFirstMount1 = useRef(true);
  useEffect(() => {
    if (!mounted) return;
    if (isFirstMount1.current) {
      isFirstMount1.current = false;
      return;
    }
    setCategories([]);
    setSelectedCategoryId("");
    setDrillDownSourceId(null);
    // Deliberately preserving searchTerm so jumping across sources during Search mode retains query states!
    resetAndFetch();
  }, [currentMode, selectedSourceId, mounted, resetAndFetch]);

  // Trigger reset when category or search term changes
  const isFirstMount2 = useRef(true);
  useEffect(() => {
    if (!mounted) return;
    if (isFirstMount2.current) {
      isFirstMount2.current = false;
      return;
    }
    resetAndFetch();
  }, [
    searchTerm,
    selectedCategoryId,
    drillDownSourceId,
    drillDownCustomApiUrl,
    drillDownCategoryId,
    mounted,
    resetAndFetch,
  ]);

  // Auto-Select First Channel for Adult Mode
  useEffect(() => {
    if (
      categories.length > 0 &&
      selectedCategoryId === "" &&
      !searchTerm &&
      !drillDownSourceId &&
      currentMode === "Adult"
    ) {
      const pCats = categories.filter(
        (c) =>
          (!c.type_pid || Number(c.type_pid) === 0) &&
          !CATEGORY_BLACKLIST.includes(c.type_name),
      );
      if (pCats.length > 0) {
        const firstParent = pCats[0];
        const subcats = categories.filter(
          (c) =>
            Number(c.type_pid) === Number(firstParent.type_id) &&
            !CATEGORY_BLACKLIST.includes(c.type_name),
        );
        if (subcats.length > 0) {
          setSelectedCategoryId(String(subcats[0].type_id));
        } else {
          setSelectedCategoryId(String(firstParent.type_id));
        }
      }
    }
  }, [
    categories,
    selectedCategoryId,
    searchTerm,
    drillDownSourceId,
    currentMode,
  ]);

  const handleStaticChannelClick = (chan: string, cName: string) => {
    setActiveStaticChannel(chan);
    setActiveStaticSubCat("全部");
    setSearchTerm("");
    setDoubanGenre("");
    setDoubanCountry("");
    setDoubanYear("");
    setDoubanSort("U");
    setDoubanPage(1);
    setDoubanHasMore(true);
    setHomeFeedList([]);
    setPage(1);

    if (chan === "short") {
      setDrillDownCustomApiUrl(siteConfig?.shortDramaApiUrl || null);
      setDrillDownCategoryId(null);
      setDrillDownSourceId(null);
      setDoubanTag("");
    } else {
      setDrillDownCustomApiUrl(null);
      setDrillDownCategoryId(null);
      setDrillDownSourceId(null);
      setDoubanTag(cName);
    }
  };

  const handleStaticSubCatClick = (
    sub: string,
    customApiUrl?: string,
    categoryId?: string,
  ) => {
    setActiveStaticSubCat(sub);
    setSearchTerm("");
    setDoubanPage(1);
    setDoubanHasMore(true);
    setHomeFeedList([]);
    setPage(1);

    if (activeStaticChannel === "movie") {
      setDoubanGenre(sub === "全部" ? "" : sub.replace("片", ""));
    } else if (activeStaticChannel === "tv") {
      let country = sub.replace("剧", "");
      if (country === "大陆") country = "中国大陆";
      if (country === "台") country = "台湾";
      setDoubanCountry(sub === "全部" ? "" : country);
    } else if (activeStaticChannel === "variety") {
      let country = sub.replace("综艺", "");
      if (country === "中国") country = "中国大陆";
      setDoubanCountry(sub === "全部" ? "" : country);
    } else if (activeStaticChannel === "anime") {
      let country = sub.replace("动漫", "");
      if (country === "中国") country = "中国大陆";
      setDoubanCountry(sub === "全部" ? "" : country);
    } else if (activeStaticChannel === "short") {
      if (sub === "全部") {
        setDrillDownCustomApiUrl(siteConfig?.shortDramaApiUrl || null);
        setDrillDownCategoryId(null);
      } else if (customApiUrl) {
        setDrillDownCustomApiUrl(customApiUrl);
        setDrillDownCategoryId(categoryId || null);
      }
    }
  };

  // Fetch Videos Effect (triggered by page, term, category, source changes)
  useEffect(() => {
    if (!mounted) return;

    const fetchVideos = async () => {
      if (!selectedSourceId) return; // Critical Guard: Prevent empty-source global aggregations on boot
      // Prevent refetch if we already have the list and categories cached
      if (
        page === 1 &&
        feedRef.current.length > 0 &&
        categories.length > 0 &&
        !searchTerm &&
        !selectedCategoryId &&
        selectedSourceId === "all"
      )
        return;

      setLoading(true);
      setError(null); // Reset error on new fetch
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("mode", currentMode);
        queryParams.append("pg", page.toString());

        if (drillDownCustomApiUrl) {
          queryParams.append("customApiUrl", drillDownCustomApiUrl);
          if (drillDownCategoryId) queryParams.append("t", drillDownCategoryId);
        } else {
          const activeSourceId = drillDownSourceId || selectedSourceId;
          if (activeSourceId && activeSourceId !== "all") {
            queryParams.append("sourceId", activeSourceId);
          }
          if (selectedCategoryId) {
            queryParams.append("t", selectedCategoryId);
          }
        }

        if (searchTerm.trim() !== "") {
          queryParams.append("wd", searchTerm.trim());
        }
        if (searchAllSources && !drillDownSourceId && !drillDownCustomApiUrl) {
          // Only append searchAll when not drilling down
          queryParams.append("searchAll", "true");
        }

        const res = await fetch(`/api/videos?${queryParams.toString()}`);
        const data = await res.json();

        // Ensure backend returned categories serve as fallback
        if (
          data.categories &&
          data.categories.length > 0 &&
          categories.length === 0
        ) {
          setCategories(data.categories);
        }

        // Setup lists
        if (data.list && data.list.length > 0) {
          if (searchTerm && searchAllSources && !drillDownSourceId) {
            setHomeFeedList(data.list);
            setHasMore(false);
          } else if (page === 1) {
            setHomeFeedList(data.list);
            if (data.list.length < 20) setHasMore(false);
          } else {
            // Safely spread the current feedRef and the new data list
            setHomeFeedList([...feedRef.current, ...data.list]);
            if (data.list.length < 20) setHasMore(false);
          }
        } else {
          if (page === 1) setHomeFeedList([]);
          setHasMore(false);
        }
      } catch (e) {
        console.error("Failed to load home feed", e);
        setError("Failed to load videos. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Using a tiny timeout prevents React StrictMode double invocation issues
    // Using a tiny timeout prevents React StrictMode double invocation issues
    const timeout = setTimeout(fetchVideos, 50);
    return () => clearTimeout(timeout);
  }, [
    mounted,
    currentMode,
    selectedSourceId,
    selectedCategoryId,
    searchTerm,
    page,
    searchAllSources,
    drillDownSourceId,
    drillDownCustomApiUrl,
    drillDownCategoryId,
  ]);

  const handleCategoryClick = (id: string) => {
    setSelectedCategoryId(id);
  };

  // Intersection Observer implementation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          hasMore &&
          !isShowingDouban
        ) {
          setPage((p) => p + 1);
        }
        if (
          entries[0].isIntersecting &&
          isShowingDouban &&
          !loadingDouban &&
          doubanHasMore
        ) {
          setDoubanPage((p) => p + 1);
        }
      },
      { threshold: 0.1 },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading, hasMore, isShowingDouban, loadingDouban, doubanHasMore]);

  // Scroll Restoration Logic
  useEffect(() => {
    if (mounted && feedRef.current.length > 0) {
      const savedScroll = sessionStorage.getItem("homeScrollY");
      if (savedScroll) {
        // Larger delay needed to guarantee images and DOM nodes are painted
        setTimeout(() => {
          window.scrollTo({
            top: parseInt(savedScroll, 10),
            behavior: "instant",
          });

          // Hydrate horizontal scrolls!
          const hScrollsStr = sessionStorage.getItem("homeHorizontalScrolls");
          if (hScrollsStr) {
            try {
              const hScrolls = JSON.parse(hScrollsStr);
              Object.entries(hScrolls).forEach(([source, left]) => {
                const el = document.getElementById(`scroll-row-${source}`);
                if (el) el.scrollLeft = left as number;
              });
            } catch (e) {}
            sessionStorage.removeItem("homeHorizontalScrolls");
          }
        }, 150);

        // Remove slightly later to prevent layout shifts overriding it
        setTimeout(() => {
          sessionStorage.removeItem("homeScrollY");
        }, 500);
      }
    }
  }, [mounted, feedRef.current.length]);

  const saveScrollPos = () => {
    sessionStorage.setItem("homeScrollY", window.scrollY.toString());
  };

  if (!mounted) return null;

  // Category Multi-tier logics
  const primaryCats = categories.filter(
    (c) => !c.type_pid || Number(c.type_pid) === 0,
  );

  const getSelectedParentId = () => {
    if (!selectedCategoryId) return "";
    const activeCat = categories.find(
      (c) => String(c.type_id) === String(selectedCategoryId),
    );
    if (!activeCat) return "";
    return !activeCat.type_pid || Number(activeCat.type_pid) === 0
      ? String(activeCat.type_id)
      : String(activeCat.type_pid);
  };
  const activeParentId = getSelectedParentId();
  const secondaryCats = activeParentId
    ? categories.filter((c) => String(c.type_pid) === activeParentId)
    : [];

  // Blacklist for category names
  const validPrimaryCats = primaryCats.filter(
    (c) => !CATEGORY_BLACKLIST.includes(c.type_name),
  );

  const yearsObj = [
    { label: "全部", value: "" },
    { label: "2025", value: "2025,2025" },
    { label: "2024", value: "2024,2024" },
    { label: "2023", value: "2023,2023" },
    { label: "2022", value: "2022,2022" },
    { label: "2021", value: "2021,2021" },
    { label: "2020", value: "2020,2020" },
    { label: "10年代", value: "2010,2019" },
    { label: "00年代", value: "2000,2009" },
    { label: "更早", value: ",1999" },
  ];
  const sortsObj = [
    { label: "近期热门", value: "U" },
    { label: "最新上线", value: "T" },
    { label: "豆瓣高分", value: "S" },
  ];

  return (
    <div className="space-y-3 pb-24">
      {/* Top Header - Mobile Only */}
      <header className="md:hidden flex items-center justify-between px-4 mt-2 mb-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight drop-shadow-sm text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-400 to-gray-900 dark:from-white dark:via-gray-400 dark:to-white bg-[length:200%_auto] animate-shimmer mr-3">
            {siteConfig?.siteName || "FanTv"}
          </h1>
          {!searchTerm && (
            <button
               onClick={() => setIsFilterExpanded(!isFilterExpanded)}
               className="flex items-center space-x-1 px-2.5 py-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-300 transition shrink-0"
            >
               <span>{isFilterExpanded ? '收起' : '展开'}</span>
               <ChevronUpIcon className={`w-3 h-3 transform transition-transform ${isFilterExpanded ? '' : 'rotate-180'}`} />
            </button>
          )}
        </div>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center px-4 py-1.5 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-all font-medium text-[13px] shadow-sm shrink-0"
        >
          <MagnifyingGlassIcon className="w-4 h-4 mr-1.5" />
          搜索
        </button>
      </header>

      {/* Filter Component */}
      <div className="px-4 mb-4 max-w-7xl mx-auto w-full">
        {searchTerm ? (
          <div className="flex items-center justify-between bg-white/60 dark:bg-white/5 backdrop-blur-2xl p-4 sm:p-5 rounded-[14px] shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-white/40 dark:border-white/5 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center space-x-2 truncate pr-4">
              <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="text-[14px] sm:text-[15px] font-bold text-gray-800 dark:text-gray-200 truncate">
                搜索 &ldquo;{searchTerm}&rdquo; 结果
              </span>
            </div>
            <button 
              onClick={() => {
                 setSearchTerm("");
                 setSearchAllSources(false);
                 setDrillDownSourceId(null);
                 setDrillDownCustomApiUrl(null);
              }}
              className="shrink-0 px-4 py-1.5 bg-[#f0f2f5] dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-[13px] font-bold rounded-full text-gray-600 dark:text-gray-300 transition-all hover:scale-105 active:scale-95"
            >
              返回首页
            </button>
          </div>
        ) : (
          <div className={`transition-all duration-300 ease-in-out overflow-hidden transform origin-top ${isFilterExpanded ? 'opacity-100 scale-y-100 max-h-[1000px]' : 'opacity-0 scale-y-95 max-h-0'}`}>
            {currentMode === "Adult" ? (
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl p-4 sm:p-5 rounded-[14px] shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-white/40 dark:border-white/5 space-y-0">
            {/* Row 1: Source (源站) */}
            <div className="flex items-center w-full mb-3">
              <div className="text-[12px] font-bold text-gray-700 dark:text-gray-400 shrink-0 w-[36px]">
                源站
              </div>
              <div
                ref={sourceScrollRef}
                onMouseDown={handleSourceMouseDown}
                onMouseLeave={handleSourceMouseLeave}
                onMouseUp={handleSourceMouseUp}
                onMouseMove={handleSourceMouseMove}
                className="flex bg-[#f0f2f5] dark:bg-gray-800/80 rounded-full p-1 max-w-[calc(100%-36px)] overflow-x-auto hide-scrollbar flex-nowrap snap-x ml-1 cursor-grab active:cursor-grabbing"
              >
                {sources.map((s) => (
                  <button
                    key={s.id}
                    onClick={(e) => {
                      if (hasDraggedSource.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        hasDraggedSource.current = false;
                        return;
                      }
                      setSelectedSourceId(s.id);
                      setSelectedSourceGlobal(s.id);
                      setSearchTerm("");
                      setDrillDownSourceId(null);
                    }}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${selectedSourceId === s.id ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Channel (频道) */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-black/5 dark:via-white/10 to-transparent my-3"></div>
            <div className="flex items-center w-full mb-3">
              <div className="text-[12px] font-bold text-gray-700 dark:text-gray-400 shrink-0 w-[36px]">
                频道
              </div>
              <div className="flex bg-[#f0f2f5] dark:bg-gray-800/80 rounded-full p-1 max-w-[calc(100%-36px)] overflow-x-auto hide-scrollbar flex-nowrap snap-x ml-1">
                {categories
                  .filter((c) => !c.type_pid || Number(c.type_pid) === 0)
                  .filter((c) => !CATEGORY_BLACKLIST.includes(c.type_name))
                  .map((cat) => (
                    <button
                      key={cat.type_id}
                      onClick={() => {
                        const subcats = categories.filter(
                          (c) =>
                            Number(c.type_pid) === Number(cat.type_id) &&
                            !CATEGORY_BLACKLIST.includes(c.type_name),
                        );
                        if (subcats.length > 0) {
                          setSelectedCategoryId(String(subcats[0].type_id));
                        } else {
                          setSelectedCategoryId(String(cat.type_id));
                        }
                        setSearchTerm("");
                        setDrillDownSourceId(null);
                      }}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${selectedCategoryId === String(cat.type_id) || activeParentId === String(cat.type_id) ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                    >
                      {cat.type_name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Row 3: Category (分类) */}
            {secondaryCats.length > 0 && (
              <>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-black/5 dark:via-white/10 to-transparent my-3"></div>
                <div className="flex items-center w-full mb-3">
                  <div className="text-[12px] font-bold text-gray-700 dark:text-gray-400 shrink-0 w-[36px]">
                    分类
                  </div>
                  <div className="flex bg-[#f0f2f5] dark:bg-gray-800/80 rounded-full p-1 max-w-[calc(100%-36px)] overflow-x-auto hide-scrollbar flex-nowrap snap-x ml-1">
                    {secondaryCats.map((cat) => (
                      <button
                        key={cat.type_id}
                        onClick={() => {
                          setSelectedCategoryId(String(cat.type_id));
                          setSearchTerm("");
                          setDrillDownSourceId(null);
                        }}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${selectedCategoryId === String(cat.type_id) ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                      >
                        {cat.type_name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl p-4 sm:p-5 rounded-[14px] shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-white/40 dark:border-white/5 space-y-3">
            {/* Row 1: Channel (频道) */}
            <div className="flex items-center w-full mb-3">
              <div className="text-[12px] font-bold text-gray-700 dark:text-gray-400 shrink-0 w-[36px]">
                频道
              </div>
              <div className="flex bg-[#f0f2f5] dark:bg-gray-800/80 rounded-full p-1 max-w-[calc(100%-36px)] overflow-x-auto hide-scrollbar flex-nowrap snap-x ml-1">
                {STATIC_CHANNELS.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleStaticChannelClick(cat.id, cat.name)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${activeStaticChannel === cat.id ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Category (分类) */}
            {["movie", "tv", "variety", "anime", "short"].includes(activeStaticChannel) && (
              <>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-black/5 dark:via-white/10 to-transparent my-3"></div>
                <div className="flex items-center w-full mb-3">
                  <div className="text-[12px] font-bold text-gray-700 dark:text-gray-400 shrink-0 w-[36px]">
                    分类
                  </div>
                  <div className="flex bg-[#f0f2f5] dark:bg-gray-800/80 rounded-full p-1 max-w-[calc(100%-36px)] overflow-x-auto hide-scrollbar flex-nowrap snap-x ml-1">
                    {activeStaticChannel === "movie" && MOVIE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleStaticSubCatClick(cat)}
                          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${activeStaticSubCat === cat ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                        >
                          {cat}
                        </button>
                    ))}
                    {activeStaticChannel === "tv" && TV_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleStaticSubCatClick(cat)}
                          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${activeStaticSubCat === cat ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                        >
                          {cat}
                        </button>
                    ))}
                    {activeStaticChannel === "variety" && VARIETY_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleStaticSubCatClick(cat)}
                          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${activeStaticSubCat === cat ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                        >
                          {cat}
                        </button>
                    ))}
                    {activeStaticChannel === "anime" && ANIME_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleStaticSubCatClick(cat)}
                          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${activeStaticSubCat === cat ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                        >
                          {cat}
                        </button>
                    ))}
                    {activeStaticChannel === "short" && (
                      <>
                        <button
                          key="全部"
                          onClick={() => handleStaticSubCatClick("全部")}
                          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${activeStaticSubCat === "全部" ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                        >
                          全部
                        </button>
                        {siteConfig?.shortDramaCategories && JSON.parse(siteConfig.shortDramaCategories).map((cat: any) => (
                          <button
                            key={cat.name}
                            onClick={() => handleStaticSubCatClick(cat.name, cat.url)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-300 snap-center ${activeStaticSubCat === cat.name ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"}`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="h-px w-full bg-gradient-to-r from-transparent via-black/5 dark:via-white/10 to-transparent my-3"></div>
            {/* Row 3: Filter (筛选) */}
            <div className="relative flex items-center w-full">
              <div className="text-[12px] font-bold text-gray-700 dark:text-gray-400 shrink-0 w-[36px]">
                筛选
              </div>
              <div className="flex items-center space-x-6 px-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(
                      activeDropdown === "country" ? null : "country",
                    );
                  }}
                  className="flex items-center text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                >
                  地区{" "}
                  {activeDropdown === "country" ? (
                    <ChevronUpIcon className="w-3.5 h-3.5 ml-1.5 opacity-60" />
                  ) : (
                    <ChevronDownIcon className="w-3.5 h-3.5 ml-1.5 opacity-60" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(
                      activeDropdown === "year" ? null : "year",
                    );
                  }}
                  className="flex items-center text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                >
                  年代{" "}
                  {activeDropdown === "year" ? (
                    <ChevronUpIcon className="w-3.5 h-3.5 ml-1.5 opacity-60" />
                  ) : (
                    <ChevronDownIcon className="w-3.5 h-3.5 ml-1.5 opacity-60" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(
                      activeDropdown === "sort" ? null : "sort",
                    );
                  }}
                  className="flex items-center text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                >
                  排序{" "}
                  {activeDropdown === "sort" ? (
                    <ChevronUpIcon className="w-3.5 h-3.5 ml-1.5 opacity-60" />
                  ) : (
                    <ChevronDownIcon className="w-3.5 h-3.5 ml-1.5 opacity-60" />
                  )}
                </button>
              </div>

              {/* Popovers */}
              {activeDropdown === "country" && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 mt-3 bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-black/50 p-4 z-50 w-[320px] sm:w-[400px] border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {[
                      "全部",
                      "中国大陆",
                      "欧美",
                      "美国",
                      "香港",
                      "台湾",
                      "日本",
                      "韩国",
                      "英国",
                      "法国",
                      "德国",
                      "意大利",
                      "西班牙",
                      "印度",
                      "泰国",
                      "俄罗斯",
                      "伊朗",
                      "加拿大",
                      "澳大利亚",
                      "爱尔兰",
                      "瑞典",
                      "巴西",
                      "丹麦",
                    ].map((c) => {
                      const val = c === "全部" ? "" : c;
                      const isActive =
                        doubanCountry === val &&
                        !searchTerm &&
                        !drillDownSourceId;
                      return (
                        <button
                          key={c}
                          onClick={() => {
                            setDoubanCountry(val);
                            setSearchTerm("");
                            setDrillDownSourceId(null);
                            setActiveDropdown(null);
                            setDoubanPage(1);
                            setDoubanHasMore(true);
                          }}
                          className={`py-2 px-1 rounded-xl text-[12px] font-medium transition-colors ${isActive ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeDropdown === "year" && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 md:left-14 mt-3 bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-black/50 p-4 z-50 w-[300px] border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {yearsObj.map((y) => {
                      const isActive =
                        doubanYear === y.value &&
                        !searchTerm &&
                        !drillDownSourceId;
                      return (
                        <button
                          key={y.label}
                          onClick={() => {
                            setDoubanYear(y.value);
                            setSearchTerm("");
                            setDrillDownSourceId(null);
                            setActiveDropdown(null);
                            setDoubanPage(1);
                            setDoubanHasMore(true);
                          }}
                          className={`py-2 px-1 rounded-xl text-[12px] font-medium transition-colors ${isActive ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                        >
                          {y.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeDropdown === "sort" && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 md:left-32 mt-3 bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-black/50 p-3 z-50 w-[240px] border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {sortsObj.map((s) => {
                      const isActive =
                        doubanSort === s.value &&
                        !searchTerm &&
                        !drillDownSourceId;
                      return (
                        <button
                          key={s.value}
                          onClick={() => {
                            setDoubanSort(s.value);
                            setDoubanSubcat("");
                            setSearchTerm("");
                            setDrillDownSourceId(null);
                            setActiveDropdown(null);
                          }}
                          className={`py-2 px-1 rounded-xl text-[13px] font-medium transition-colors ${isActive ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
        )}
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Content Grid */}
      {isShowingDouban ? (
        loadingDouban && doubanPage === 1 ? (
          <div className="py-24 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : doubanItems.length === 0 && !loadingDouban ? (
          <div className="text-center py-24 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4 mx-auto">
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            无法加载豆瓣推荐数据
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto w-full px-4">
            {doubanItems.map((item, idx) => (
              <button
                onClick={() => {
                  routeWithSpeedTest({ ...item, vod_name: item.title, isDouban: true });
                }}
                key={`${item.id}-${idx}`}
                className="group cursor-pointer text-left flex flex-col"
              >
                <div className="aspect-[3/4] w-full bg-gray-200 dark:bg-gray-800 rounded-xl relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1.5">
                  {item.rate && item.rate !== "0.0" && (
                    <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 bg-[#f5c518] shadow-sm rounded-md pointer-events-none">
                      <span className="text-[11px] sm:text-xs text-white font-extrabold tracking-tight leading-none drop-shadow-sm">
                        {item.rate}
                      </span>
                    </div>
                  )}
                  <img
                    src={
                      !doubanImageProxy
                        ? item.cover
                        : doubanImageProxy === "server"
                          ? `/api/image-proxy?url=${encodeURIComponent(item.cover)}`
                          : doubanImageProxy.includes("weserv") ||
                              doubanImageProxy.includes("imgextra")
                            ? `${doubanImageProxy}${encodeURIComponent(item.cover)}`
                            : `${
                                doubanImageProxy.replace(/\/$/, "")
                              }/https://img9.doubanio.com/${item.cover.split("https://img9.doubanio.com/")[1] || item.cover.replace(/https?:\/\/[^/]+\//, "")}`
                    }
                    referrerPolicy="no-referrer"
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
                <div className="mt-2 px-1 w-full text-left">
                  <h3 className="text-gray-900 dark:text-gray-100 font-medium text-[13px] md:text-sm line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        )
      ) : homeFeedList.length === 0 && !loading && !error ? (
        <div className="text-center py-24 text-gray-500 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="font-medium text-gray-600 dark:text-gray-400">
            {searchTerm 
               ? "未找到匹配的搜索结果，请尝试更换关键词或检查源站是否被禁用。" 
               : "暂无影片数据，请前往设置配置数据源。"}
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-24 text-red-500 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center mb-4">
            <XMarkIcon className="w-8 h-8 text-red-300 dark:text-red-600" />
          </div>
          <p className="font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full px-4">
          {/* Search Layout Grouping or Video Grid */}
          {searchTerm && searchAllSources && !drillDownSourceId ? (
            <div className="space-y-8">
              {Object.entries(
                homeFeedList.reduce(
                  (acc, video) => {
                    if (!acc[video._sourceName]) acc[video._sourceName] = [];
                    acc[video._sourceName].push(video);
                    return acc;
                  },
                  {} as Record<string, VideoItem[]>,
                ),
              ).map(([sourceName, videos]) => (
                <div key={sourceName}>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-bold text-lg dark:text-gray-200 text-gray-800 flex items-center">
                      <span className="w-1.5 h-5 bg-blue-500 rounded-full mr-2"></span>
                      {sourceName}
                    </h3>
                    <button
                      onClick={() => {
                        setDrillDownSourceId(videos[0]._sourceId);
                        setPage(1);
                        setHasMore(true);
                        setHomeFeedList([]);
                        window.scrollTo({ top: 0, behavior: "instant" });
                      }}
                      className="text-sm text-blue-500 font-medium hover:text-blue-600 transition-colors"
                    >
                      查看更多
                    </button>
                  </div>
                  <div
                    id={`scroll-row-${sourceName}`}
                    className="flex overflow-x-auto hide-scrollbar space-x-2 sm:space-x-4 md:space-x-5 lg:space-x-6 pb-6 items-stretch px-1 pointer-events-auto"
                  >
                    {videos.map((video, idx) => (
                      <div
                        key={`${video.vod_id}-${idx}`}
                        className="w-[105px] sm:w-[125px] md:w-[150px] flex-shrink-0"
                      >
                        <div
                          role="button"
                          onClick={() => {
                            saveScrollPos();
                            const rowEl = document.getElementById(
                              `scroll-row-${sourceName}`,
                            );
                            if (rowEl) {
                              const scrolls = JSON.parse(
                                sessionStorage.getItem(
                                  "homeHorizontalScrolls",
                                ) || "{}",
                              );
                              scrolls[sourceName] = rowEl.scrollLeft;
                              sessionStorage.setItem(
                                "homeHorizontalScrolls",
                                JSON.stringify(scrolls),
                              );
                            }
                            if (searchTerm) {
                              router.push(`/play?id=${encodeURIComponent(video.vod_id)}&sourceId=${encodeURIComponent(video._sourceId)}&searchName=${encodeURIComponent(video.vod_name)}`);
                            } else {
                              routeWithSpeedTest(video);
                            }
                          }}
                          className="flex flex-col group cursor-pointer"
                        >
                          <div className="aspect-[3/4] w-full bg-gray-200 dark:bg-gray-800 rounded-xl relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.2)] hover:ring-2 hover:ring-blue-500/50 transition-all duration-500 transform hover:-translate-y-1.5 text-left">
                            {/* Source Badge */}
                            {activeStaticChannel !== "short" && currentMode !== "Adult" && (
                              <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md pointer-events-none">
                                <span className="text-[10px] sm:text-xs text-white/90 font-medium tracking-wide">
                                  {video._sourceName}
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse pointer-events-none" />
                            {!searchTerm && currentMode !== "Adult" &&
                              activeStaticChannel !== "short" &&
                              video.vod_score &&
                              video.vod_score !== "0.0" && (
                                <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 bg-[#f5c518] shadow-sm rounded-md pointer-events-none">
                                  <span className="text-[11px] sm:text-xs text-white font-extrabold tracking-tight leading-none drop-shadow-sm">
                                    {video.vod_score}
                                  </span>
                                </div>
                              )}
                            {video.vod_pic ? (
                              <img
                                src={video.vod_pic}
                                alt={video.vod_name}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                无封面
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                          </div>
                          <div className="mt-2 px-1 w-full text-left">
                            <h3 className="text-gray-900 dark:text-gray-100 font-medium text-[13px] md:text-sm line-clamp-2 leading-tight">
                              {video.vod_name}
                            </h3>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[11px] text-gray-500 flex-1 truncate">
                                {video.vod_remarks || video.vod_year}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Drill-down specific source header */}
              {drillDownSourceId && searchTerm && searchAllSources && (
                <div className="flex items-center justify-between mb-4 px-1 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-bold text-lg dark:text-gray-200 text-gray-800 flex items-center">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full mr-2"></span>
                    {homeFeedList.length > 0 && homeFeedList[0]?._sourceName
                      ? homeFeedList[0]._sourceName
                      : sources.find((s) => s.id === drillDownSourceId)?.name ||
                        "搜索结果"}
                  </h3>
                  <button
                    onClick={() => {
                      setDrillDownSourceId(null);
                      setPage(1);
                      setHasMore(true);
                      setHomeFeedList([]);
                    }}
                    className="text-[13px] font-medium px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors flex items-center"
                  >
                    返回聚合
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
                {homeFeedList.map((video, idx) => (
                  <button
                    onClick={() => routeWithSpeedTest(video)}
                    key={`${video.videoId}-${video._sourceId}-${idx}`}
                    className="flex flex-col group cursor-pointer"
                  >
                    <div className="aspect-[3/4] w-full bg-gray-200 dark:bg-gray-800 rounded-xl relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.2)] hover:ring-2 hover:ring-blue-500/50 transition-all duration-500 transform hover:-translate-y-1.5 text-left">
                      {/* Source Badge */}
                      {activeStaticChannel !== "short" && currentMode !== "Adult" && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md pointer-events-none">
                          <span className="text-[10px] sm:text-xs text-white/90 font-medium tracking-wide">
                            {video._sourceName}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse pointer-events-none" />
                      {currentMode !== "Adult" &&
                        activeStaticChannel !== "short" &&
                        video.vod_score &&
                        video.vod_score !== "0.0" && (
                          <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 bg-[#f5c518] shadow-sm rounded-md pointer-events-none">
                            <span className="text-[11px] sm:text-xs text-white font-extrabold tracking-tight leading-none drop-shadow-sm">
                              {video.vod_score}
                            </span>
                          </div>
                        )}
                      {video.vod_pic ? (
                        <img
                          src={video.vod_pic}
                          alt={video.vod_name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#1c1c1e]">
                          <span className="text-gray-400 text-xs">
                            暂无封面
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                    </div>
                    <div className="mt-2 px-1 w-full text-left">
                      <h3 className="text-gray-900 dark:text-gray-100 font-medium text-[13px] md:text-sm line-clamp-2 leading-tight">
                        {video.vod_name}
                      </h3>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] text-gray-500 flex-1 truncate">
                          {video.vod_remarks || video.vod_year}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Infinite Scroll Observer Target (Global Mount) */}
      {((!isShowingDouban && hasMore) ||
        (isShowingDouban && doubanHasMore)) && (
        <div ref={observerTarget} className="py-6 flex justify-center">
          {((loading && !isShowingDouban) ||
            (loadingDouban && isShowingDouban && doubanPage > 1)) && (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Floating Action Buttons */}
      <div className="hidden md:flex fixed bottom-6 right-5 md:right-8 flex-col space-y-4 z-50">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-11 h-11 bg-white/95 dark:bg-[#2c2c2e]/95 backdrop-blur-md hover:scale-105 text-gray-800 dark:text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center transition-all cursor-pointer"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            if (theme === "system") setTheme("light");
            else if (theme === "light") setTheme("dark");
            else setTheme("system");
          }}
          className="w-11 h-11 bg-white/95 dark:bg-[#2c2c2e]/95 backdrop-blur-md hover:scale-105 text-gray-800 dark:text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center transition-all cursor-pointer"
        >
          {theme === "light" && <SunIcon className="w-5 h-5 text-amber-500" />}
          {theme === "dark" && <MoonIcon className="w-5 h-5 text-blue-400" />}
          {theme === "system" && (
            <ComputerDesktopIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-11 h-11 bg-white/95 dark:bg-[#2c2c2e]/95 backdrop-blur-md hover:scale-105 text-gray-800 dark:text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center transition-all group cursor-pointer"
        >
          <ArrowUpIcon className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>

      {isSpeedTesting && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-white text-lg font-medium tracking-wider drop-shadow-md">正在全网测速寻源...</div>
          <div className="text-white/70 text-sm mt-2">寻找最佳播放路线</div>
        </div>
      )}
    </div>
  );
}
