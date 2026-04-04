import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

interface AdMobBannerProps {
  stealthMode?: boolean;
}

const AdMobBanner = ({ stealthMode = false }: AdMobBannerProps) => {
  const [bannerLoaded, setBannerLoaded] = useState(false);

  useEffect(() => {
    // In stealth mode, kill AdMob entirely — no init, no network calls
    if (stealthMode) {
      // If banner was previously loaded, hide it
      if (bannerLoaded && Capacitor.isNativePlatform()) {
        import("@capacitor-community/admob").then(({ AdMob }) => {
          AdMob.hideBanner().catch(() => {});
          AdMob.removeBanner().catch(() => {});
        }).catch(() => {});
        setBannerLoaded(false);
      }
      return;
    }

    if (Capacitor.isNativePlatform()) {
      initAdMob();
    }
  }, [stealthMode]);

  const initAdMob = async () => {
    try {
      const { AdMob, BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");
      await AdMob.initialize({ initializeForTesting: true });
      await AdMob.showBanner({
        adId: "ca-app-pub-3940256099942544/6300978111",
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.TOP_CENTER,
        margin: 0,
      });
      setBannerLoaded(true);
    } catch {
      // Silent fail — no logs in production
    }
  };

  // Stealth mode: render nothing
  if (stealthMode) return null;

  if (Capacitor.isNativePlatform()) {
    return bannerLoaded ? <div className="w-full h-[50px] shrink-0" /> : null;
  }

  return (
    <div className="w-full h-[50px] shrink-0 bg-muted/60 flex items-center justify-center border-b border-border/30">
      <span className="text-xs text-muted-foreground">Ad Banner (native only)</span>
    </div>
  );
};

export default AdMobBanner;
