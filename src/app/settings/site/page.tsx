"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SiteConfigPage() {
  const router = useRouter();
  const { siteConfig, setSiteConfig, currentUser, currentMode } = useAppStore();

  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteLogo, setSiteLogo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== "ADMIN") {
      router.replace("/settings");
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (siteConfig) {
      setSiteName(siteConfig.siteName || "");
      setSiteDescription(siteConfig.siteDescription || "");
      setSiteLogo(siteConfig.siteLogo || "");
    }
  }, [siteConfig]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMb = 2; // Keep SQLite limits reasonably small
    if (file.size > maxMb * 1024 * 1024) {
      alert(`Logo体积过大，请压缩至${maxMb}MB以内，避免造成持久化超载。`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setSiteLogo(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          siteDescription,
          siteLogo,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      setSiteConfig({
        ...siteConfig,
        siteName,
        siteDescription,
        siteLogo,
      });
      alert("网站信息保存成功！");
    } catch (err) {
      alert("保存发生系统错误...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-2xl">
      <header className="flex items-center pt-2 mb-6">
        <Link
          href="/settings"
          className="p-2 -ml-2 mr-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
        >
          <ArrowLeftIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </Link>
        <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
          网站信息及豆瓣高级代理配置
        </span>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              网站名称
            </label>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              required
              placeholder="FanTv"
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              网站简介 (SEO描述)
            </label>
            <textarea
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              required
              rows={3}
              placeholder="A modern dual-mode video application."
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              网站图标 (支持在线URL或直接上传)
            </label>
            <div className="flex items-start space-x-4">
              {siteLogo ? (
                <img
                  src={siteLogo}
                  alt="Logo Preview"
                  className="w-[72px] h-[72px] rounded-2xl object-cover bg-gray-100 dark:bg-gray-800 shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs">
                  空
                </div>
              )}
              <div className="flex flex-col space-y-2 flex-1 pt-1">
                <input
                  value={siteLogo}
                  onChange={(e) => setSiteLogo(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow"
                />
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("logo-upload")?.click()
                    }
                    className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors rounded-lg font-medium"
                  >
                    浏览本地图片
                  </button>
                  <button
                    type="button"
                    onClick={() => setSiteLogo("")}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors px-1"
                  >
                    清除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="flex justify-end">
          <button
            disabled={loading}
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 transition text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50"
          >
            {loading ? "正在保存..." : "保存更改"}
          </button>
        </div>
      </form>
    </div>
  );
}
