import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export function useSpeedTestRouter() {
  const router = useRouter();
  const { currentMode, speedTestPlayback } = useAppStore();

  const routeWithSpeedTest = (video: any) => {
    if (video.isDouban) {
      router.push(`/play?searchName=${encodeURIComponent(video.vod_name || video.title)}&speedtest=true`);
      return;
    }

    const targetId = video.vod_id || video.videoId || video.id;
    
    // Adult mode or explicitly disabled tests escape the speed test.
    if (currentMode === "Adult" || speedTestPlayback === false) {
      router.push(
        `/play?id=${targetId}&sourceId=${encodeURIComponent(video._sourceId)}&searchName=${encodeURIComponent(video.vod_name || video.title || "")}`,
      );
      return;
    }

    // Normal mode delegates the speed test to the intermediate /play page
    router.push(
        `/play?id=${targetId}&sourceId=${encodeURIComponent(video._sourceId)}&searchName=${encodeURIComponent(video.vod_name || video.title || "")}&speedtest=true`
    );
  };

  // Keep isSpeedTesting exported as false to preserve interface compatibility
  return { routeWithSpeedTest, isSpeedTesting: false };
}
