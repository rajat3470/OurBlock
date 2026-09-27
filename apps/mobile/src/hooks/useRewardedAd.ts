import { useState, useCallback, useRef } from "react";
import { getRewardedAdUnitId } from "../services/adService";

export type RewardedAdState = "idle" | "loading" | "showing" | "error" | "unsupported";

const AD_LOAD_TIMEOUT_MS = 15_000;
const AD_SHOW_TIMEOUT_MS = 60_000;

async function loadAdsModule() {
  try {
    return await import("react-native-google-mobile-ads");
  } catch (error) {
    return null;
  }
}

export function useRewardedAd() {
  const [adState, setAdState] = useState<RewardedAdState>("idle");
  const resolvedRef = useRef(false);

  const showRewardedAd = useCallback((): Promise<boolean> => {
    return new Promise(async (resolve) => {
      resolvedRef.current = false;

      const safeResolve = (value: boolean) => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        resolve(value);
      };

      setAdState("loading");

      const adsModule = await loadAdsModule();
      if (!adsModule) {
        setAdState("unsupported");
        safeResolve(false);
        return;
      }

      const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = adsModule;
      const adUnitId = __DEV__ ? TestIds.REWARDED : getRewardedAdUnitId();
      const rewarded = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      let earned = false;

      const cleanup = () => {
        clearTimeout(loadTimer);
        clearTimeout(showTimer);
        unsubEarned();
        unsubLoaded();
        unsubClosed();
        unsubError();
      };

      const unsubEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => { earned = true; }
      );

      const unsubLoaded = rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          clearTimeout(loadTimer);
          setAdState("showing");
          rewarded.show();
          showTimer = setTimeout(() => {
            setAdState("idle");
            cleanup();
            safeResolve(earned);
          }, AD_SHOW_TIMEOUT_MS);
        }
      );

      const unsubClosed = rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          setAdState("idle");
          cleanup();
          safeResolve(earned);
        }
      );

      const unsubError = rewarded.addAdEventListener(
        AdEventType.ERROR,
        () => {
          setAdState("error");
          cleanup();
          safeResolve(false);
        }
      );

      let loadTimer = setTimeout(() => {
        setAdState("error");
        cleanup();
        safeResolve(false);
      }, AD_LOAD_TIMEOUT_MS);

      let showTimer: ReturnType<typeof setTimeout>;

      rewarded.load();
    });
  }, []);

  return { adState, showRewardedAd };
}
