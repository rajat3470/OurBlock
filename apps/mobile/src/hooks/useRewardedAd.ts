import { useState, useCallback } from "react";
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import { getRewardedAdUnitId } from "../services/adService";

export type RewardedAdState = "idle" | "loading" | "showing" | "error";

/**
 * Loads and shows a rewarded ad.
 * Returns a promise that resolves to true if the user earned the reward,
 * or false if the ad was dismissed without reward or failed to load.
 */
export function useRewardedAd() {
  const [adState, setAdState] = useState<RewardedAdState>("idle");

  const showRewardedAd = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      setAdState("loading");

      const adUnitId = __DEV__ ? TestIds.REWARDED : getRewardedAdUnitId();
      const rewarded = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      let earned = false;

      const unsubEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => { earned = true; }
      );

      const unsubLoaded = rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          setAdState("showing");
          rewarded.show();
        }
      );

      const unsubClosed = rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          setAdState("idle");
          unsubEarned();
          unsubLoaded();
          unsubClosed();
          unsubError();
          resolve(earned);
        }
      );

      const unsubError = rewarded.addAdEventListener(
        AdEventType.ERROR,
        () => {
          setAdState("error");
          unsubEarned();
          unsubLoaded();
          unsubClosed();
          unsubError();
          resolve(false);
        }
      );

      rewarded.load();
    });
  }, []);

  return { adState, showRewardedAd };
}
