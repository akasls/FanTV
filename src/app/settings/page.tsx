"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const {
    currentMode,
    setMode,
    setAllowAdultMode,
    searchAllSources,
    setSearchAllSources,
    setFavoriteData,
    setHistoryData,
    theme,
    setTheme,
    enableAdBlock,
    setEnableAdBlock,
    currentUser,
    historyData,
    favoriteData,
    userSourceOrder,
    setUserSourceOrder,
    setCurrentUser,
    speedTestPlayback,
    setSpeedTestPlayback,
    doubanDataProxy,
    setDoubanDataProxy,
    doubanImageProxy,
    setDoubanImageProxy,
    siteConfig,
  } = useAppStore();

  const [isDataProxyOpen, setIsDataProxyOpen] = useState(false);
  const [isImageProxyOpen, setIsImageProxyOpen] = useState(false);

  const [loadingConfig, setLoadingConfig] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN";
  const [allowRegistration, setAllowRegistration] = useState(false);
  const [allowGuestAccess, setAllowGuestAccess] = useState(false);

  // Local states for custom proxy inputs
  const [tempDoubanDataProxyCustom, setTempDoubanDataProxyCustom] =
    useState("");
  const [tempDoubanImageProxyCustom, setTempDoubanImageProxyCustom] =
    useState("");
  const isDataProxyStandard =
    doubanDataProxy === "" ||
    doubanDataProxy === "https://movie.douban.cmliussss.net/" ||
    doubanDataProxy === "https://movie.douban.cmliussss.com/";
  const isImageProxyStandard =
    doubanImageProxy === "" ||
    doubanImageProxy === "server" ||
    doubanImageProxy === "https://img.doubanio.cmliussss.net/" ||
    doubanImageProxy === "https://img.doubanio.cmliussss.com/";

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/system-settings")
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.allowRegistration === "boolean") {
            setAllowRegistration(data.allowRegistration);
          }
          if (data && typeof data.allowGuestAccess === "boolean") {
            setAllowGuestAccess(data.allowGuestAccess);
          }
        });
    }
  }, [isAdmin]);

  const toggleRegistration = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    setAllowRegistration(nextVal);
    await fetch("/api/system-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowRegistration: nextVal }),
    });
  };

  const toggleGuestAccess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    setAllowGuestAccess(nextVal);
    await fetch("/api/system-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowGuestAccess: nextVal }),
    });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setHistoryData([]);
    setFavoriteData([]);
    router.push("/login");
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">设置中心</h1>
      </header>

      {/* 通用 (General) */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 ml-2 mb-2">通用</h2>
        <div className="bg-white dark:bg-white/5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 divide-y divide-gray-100 dark:divide-gray-800/80 [&>*:first-child]:rounded-t-3xl [&>*:last-child]:rounded-b-3xl">
          {currentUser?.allowAdultMode && (
            <div className="flex items-center justify-between p-4 md:p-6 transition-colors">
              <div>
                <h3 className="font-medium">圣贤模式</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  未成年人请勿开启此选项
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={currentMode === "Adult"}
                  onChange={(e) => {
                    const isAdult = e.target.checked;
                    setAllowAdultMode(isAdult); // ensure background logic works
                    setMode(isAdult ? "Adult" : "General");
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
              </label>
            </div>
          )}

          {currentMode !== "Adult" && (
            <div className="flex items-center justify-between p-4 md:p-6 transition-colors">
              <div>
                <h3 className="font-medium">测速播放</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  播放前测速找出最佳视频源
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={speedTestPlayback}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSpeedTestPlayback(val);
                    if (currentUser) {
                      fetch("/api/users/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "sync_up",
                          speedTestPlayback: val,
                        }),
                      });
                    }
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between p-4 md:p-6 md:hidden transition-colors">
            <div>
              <h3 className="font-medium">外观主题</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {theme === "system"
                  ? "跟随系统"
                  : theme === "light"
                    ? "日间模式"
                    : "夜间模式"}
              </p>
            </div>
            <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setTheme("light")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === "light" ? "bg-white dark:bg-gray-700 shadow-sm text-amber-500" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >
                日间
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === "dark" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >
                黑夜
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === "system" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-200" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >
                自适应
              </button>
            </div>
          </div>

          {(isAdmin || siteConfig?.removeTsAd) && (
            <div className="flex items-center justify-between p-4 md:p-6 transition-colors">
              <div>
                <h3 className="font-medium">去除切片广告</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  开启后端智能拦截，大幅减少视频内的博彩切片广告
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enableAdBlock}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setEnableAdBlock(nextVal);
                    if (isAdmin) {
                      useAppStore.getState().setSiteConfig({ ...siteConfig, removeTsAd: nextVal });
                      fetch("/api/system-settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ removeTsAd: nextVal }),
                      });
                    }
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
              </label>
            </div>
          )}



          <div className="p-4 md:p-6 flex flex-col space-y-4 transition-colors rounded-b-3xl">
            <div>
              <h3 className="font-medium">豆瓣资源代理设置</h3>
              <p className="text-sm text-gray-500 mt-0.5 mb-3">
                单独配置您的专属数据与图片防盗链代理。
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className={`flex-1 space-y-2 relative transition-all ${isDataProxyOpen ? 'z-50' : 'z-20'}`}>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  数据代理 API
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDataProxyOpen(!isDataProxyOpen)}
                    className="w-full bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow mb-3 flex items-center justify-between shadow-sm"
                  >
                    <span className="truncate">
                      {doubanDataProxy === "" ? "直连（服务器直接请求豆瓣）" :
                       doubanDataProxy === "https://movie.douban.cmliussss.net/" ? "豆瓣 CDN By CMLiussss (腾讯云)" :
                       doubanDataProxy === "https://movie.douban.cmliussss.com/" ? "豆瓣 CDN By CMLiussss (阿里云)" :
                       "自定义代理"}
                    </span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isDataProxyOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isDataProxyOpen && (
                    <div className="absolute z-50 w-full mt-[-8px] bg-white dark:bg-[#2c2c2e] border border-gray-100 dark:border-gray-800 shadow-xl rounded-xl overflow-hidden py-1">
                      {[
                        { label: "直连（服务器直接请求豆瓣）", value: "" },
                        { label: "豆瓣 CDN By CMLiussss (腾讯云)", value: "https://movie.douban.cmliussss.net/" },
                        { label: "豆瓣 CDN By CMLiussss (阿里云)", value: "https://movie.douban.cmliussss.com/" },
                        { label: "自定义代理", value: "custom" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            const val = opt.value;
                            if (val !== "custom") {
                              setDoubanDataProxy(val);
                              if (currentUser) {
                                fetch("/api/users/sync", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "sync_up", doubanDataProxy: val }),
                                });
                              }
                            } else {
                              setDoubanDataProxy("https://");
                            }
                            setIsDataProxyOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            (opt.value === "custom" && !["", "https://movie.douban.cmliussss.net/", "https://movie.douban.cmliussss.com/"].includes(doubanDataProxy)) || 
                            opt.value === doubanDataProxy
                              ? "text-blue-500 font-medium bg-blue-50/50 dark:bg-blue-500/10" 
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!["", "https://movie.douban.cmliussss.net/", "https://movie.douban.cmliussss.com/"].includes(doubanDataProxy) && (
                  <input
                    value={doubanDataProxy}
                    onChange={(e) => setDoubanDataProxy(e.target.value)}
                    onBlur={(e) => {
                      if (currentUser)
                        fetch("/api/users/sync", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "sync_up",
                            doubanDataProxy: e.target.value,
                          }),
                        });
                    }}
                    placeholder="填写完整的代理 API URL (例如: https://api.example.com/)"
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 mt-2"
                  />
                )}
              </div>
              <div className={`flex-1 space-y-2 relative transition-all ${isImageProxyOpen ? 'z-50' : 'z-10'}`}>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  图片代理前缀
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsImageProxyOpen(!isImageProxyOpen)}
                    className="w-full bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow mb-3 flex items-center justify-between shadow-sm"
                  >
                    <span className="truncate">
                      {doubanImageProxy === "" ? "直连（浏览器直接请求豆瓣）" :
                       doubanImageProxy === "server" ? "服务器代理（由服务器端中转桥接）" :
                       doubanImageProxy === "https://img.doubanio.cmliussss.net/" ? "豆瓣 CDN By CMLiussss (腾讯云)" :
                       doubanImageProxy === "https://img.doubanio.cmliussss.com/" ? "豆瓣 CDN By CMLiussss (阿里云)" :
                       "自定义代理"}
                    </span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isImageProxyOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isImageProxyOpen && (
                    <div className="absolute z-50 w-full mt-[-8px] bg-white dark:bg-[#2c2c2e] border border-gray-100 dark:border-gray-800 shadow-xl rounded-xl overflow-hidden py-1">
                      {[
                        { label: "直连（浏览器直接请求豆瓣）", value: "" },
                        { label: "服务器代理（由服务器端中转桥接）", value: "server" },
                        { label: "豆瓣 CDN By CMLiussss (腾讯云)", value: "https://img.doubanio.cmliussss.net/" },
                        { label: "豆瓣 CDN By CMLiussss (阿里云)", value: "https://img.doubanio.cmliussss.com/" },
                        { label: "自定义代理", value: "custom" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            const val = opt.value;
                            if (val !== "custom") {
                              setDoubanImageProxy(val);
                              if (currentUser) {
                                fetch("/api/users/sync", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "sync_up", doubanImageProxy: val }),
                                });
                              }
                            } else {
                              setDoubanImageProxy("https://");
                            }
                            setIsImageProxyOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            (opt.value === "custom" && !["", "server", "https://img.doubanio.cmliussss.net/", "https://img.doubanio.cmliussss.com/"].includes(doubanImageProxy)) || 
                            opt.value === doubanImageProxy
                              ? "text-blue-500 font-medium bg-blue-50/50 dark:bg-blue-500/10" 
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!["", "server", "https://img.doubanio.cmliussss.net/", "https://img.doubanio.cmliussss.com/"].includes(doubanImageProxy) && (
                  <input
                    value={doubanImageProxy}
                    onChange={(e) => setDoubanImageProxy(e.target.value)}
                    onBlur={(e) => {
                      if (currentUser)
                        fetch("/api/users/sync", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "sync_up",
                            doubanImageProxy: e.target.value,
                          }),
                        });
                    }}
                    placeholder="图片代理前缀路由"
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 mt-2"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 管理 (Management) */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 ml-2 mb-2">管理</h2>
        <div className="bg-white dark:bg-white/5 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800/80 divide-y divide-gray-100 dark:divide-gray-800/80">
          {isAdmin && (
            <>
              <div className="flex items-center justify-between p-4 md:p-6 transition-colors">
                <div>
                  <h3 className="font-medium">开放注册</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    是否允许用户自助注册
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={allowRegistration}
                    onChange={toggleRegistration}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 md:p-6 transition-colors">
                <div>
                  <h3 className="font-medium">访客访问</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    是否允许免登录使用普通源
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={allowGuestAccess}
                    onChange={toggleGuestAccess}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <Link
                href="/settings/users"
                className="flex items-center justify-between p-4 md:p-6 cursor-pointer transition-colors"
              >
                <div>
                  <h3 className="font-medium">用户管理</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    新增、编辑、停用、修改用户
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>

              <Link
                href="/settings/site"
                className="flex items-center justify-between p-4 md:p-6 cursor-pointer transition-colors border-t border-gray-100 dark:border-gray-800/80"
              >
                <div>
                  <h3 className="font-medium">网站信息</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    修改网站名称、介绍、图标等
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </>
          )}
          <Link
            href="/settings/sources"
            className="flex items-center justify-between p-4 md:p-6 cursor-pointer transition-colors"
          >
            <div>
              <h3 className="font-medium">源站接口</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                管理苹果CMS接口(JSON API)
              </p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* 历史 (History) */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 ml-2 mb-2">
          历史记录与数据
        </h2>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800/80 divide-y divide-gray-100 dark:divide-gray-800/80">
          {/* Clear Data Combined */}
          <div className="flex items-center justify-between p-4 md:p-6 transition-colors">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">
                清空历史
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                一键清空影片收藏、播放历史、搜索记录
              </p>
            </div>
            <button
              onClick={async (e) => {
                const target = e.currentTarget;
                const oldText = target.innerText;
                
                setHistoryData([]);
                setFavoriteData([]);
                useAppStore.getState().clearCache();
                
                if (currentUser) {
                  await Promise.all([
                    fetch("/api/users/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "wipe_history" }),
                    }),
                    fetch("/api/users/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "wipe_favorites" }),
                    })
                  ]);
                }
                
                target.innerText = "已清空";
                setTimeout(() => {
                  target.innerText = oldText;
                }, 2000);
              }}
              className="text-sm font-medium text-red-500 px-4 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full transition-colors flex items-center justify-center shrink-0"
            >
              清空
            </button>
          </div>

          {currentUser && (
            <div className="flex items-center justify-between p-4 md:p-6 transition-colors border-t border-gray-100 dark:border-gray-800/80">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-gray-200">
                  退出账户
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  切断当前会话并擦除授权凭证
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-500 px-4 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full transition-colors"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
