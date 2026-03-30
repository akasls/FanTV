import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { startTransition } from "react";

export function useSpeedTestRouter() {
  const router = useRouter();

  const routeWithSpeedTest = (video: any) => {
    const { currentMode, speedTestPlayback, siteConfig, searchTerm } = useAppStore.getState();

    if (video.isDouban) {
      startTransition(() => {
         router.push(`/play?searchName=${encodeURIComponent(video.vod_name || video.title)}&speedtest=true`);
      });
      return;
    }

    const targetId = video.vod_id || video.videoId || video.id;
    
    // Adult mode, explicitly disabled tests, or search results escape the speed test.
    if (currentMode === "Adult" || speedTestPlayback === false || siteConfig?.allowSpeedTest === false || searchTerm) {
      startTransition(() => {
        router.push(
          `/play?id=${targetId}&sourceId=${encodeURIComponent(video._sourceId)}&searchName=${encodeURIComponent(video.vod_name || video.title || "")}`,
        );
      });
      return;
    }

    // Normal mode delegates the speed test to the intermediate /play page
    startTransition(() => {
      router.push(
          `/play?id=${targetId}&sourceId=${encodeURIComponent(video._sourceId)}&searchName=${encodeURIComponent(video.vod_name || video.title || "")}&speedtest=true`
      );
    });
  };

  // Keep isSpeedTesting exported as false to preserve interface compatibility
  return { routeWithSpeedTest, isSpeedTesting: false };
}
