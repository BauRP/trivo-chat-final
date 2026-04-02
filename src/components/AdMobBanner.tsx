import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

const AdMobBanner = () => {
  const [bannerLoaded, setBannerLoaded] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initAdMob();
    }
  }, []);

  const initAdMob = async () => {
    try {
      const { AdMob, BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");
      await AdMob.initialize({ initializeForTesting: true });
      await AdMob.showBanner({
        adId: "ca-app-pub-3940256099942544/6300978111", // Test ad ID
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.TOP_CENTER,
        margin: 0,
      });
      setBannerLoaded(true);
    } catch (err) {
      console.warn("AdMob not available:", err);
    }
  };

  // On native, AdMob renders as an overlay; on web, show a placeholder
  if (Capacitor.isNativePlatform()) {
    return bannerLoaded ? <div className="w-full h-[50px] shrink-0" /> : null;
  }

  // Web placeholder for development
  return (
    <div className="w-full h-[50px] shrink-0 bg-muted/60 flex items-center justify-center border-b border-border/30">
      <span className="text-xs text-muted-foreground">Ad Banner (native only)</span>
    </div>
  );
};

export default AdMobBanner;
