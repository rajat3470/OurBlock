import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { setBusinessProfile } from "@store/slices/businessOwnerSlice";
import { subscribeToBusinessSuspension } from "@services/blacklistSyncService";
import { useAuth } from "@hooks/useAuth";
import { Business } from "@/types";

const AUTO_LOGOUT_DELAY_MS = 10_000;

export interface SuspensionState {
  isSuspended: boolean;
  secondsRemaining: number;
}

/**
 * Listens (via Firestore real-time snapshot) to the owner's business document
 * for suspension events triggered by the blacklist module.
 *
 * When the business is suspended:
 *  - Updates Redux with the latest business profile so every screen reflects it.
 *  - Starts a 10-second countdown after which `logoutUser` is invoked automatically.
 *  - Returns `isSuspended` and `secondsRemaining` so the layout can render the
 *    "Account Blocked" overlay.
 */
export function useBusinessOwnerSuspension(): SuspensionState {
  const dispatch = useAppDispatch();
  const { logoutUser } = useAuth();

  const businessId = useAppSelector((s) => s.businessOwner.businessProfile?.id);

  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(AUTO_LOGOUT_DELAY_MS / 1000);

  // Keep logoutUser in a ref so it never causes the effect to re-run
  const logoutUserRef = useRef(logoutUser);
  useEffect(() => { logoutUserRef.current = logoutUser; }, [logoutUser]);

  // Timer refs — mutated directly, never trigger re-renders
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);

  // Keep setSecondsRemaining and setIsSuspended stable via refs so the snapshot
  // callback (created once inside the effect) can call them without going stale.
  const setSecondsRef = useRef(setSecondsRemaining);
  const setIsSuspendedRef = useRef(setIsSuspended);

  useEffect(() => {
    if (!businessId) return;

    // Track whether we've processed the initial (baseline) snapshot.
    // The first snapshot establishes what the state was at login time — we
    // never show the overlay for it, even if the account is already suspended
    // (the login API already blocks that case with an error message).
    let baselineEstablished = false;

    const unsubscribe = subscribeToBusinessSuspension(
      businessId,
      (suspended: boolean, business: Business) => {
        dispatch(setBusinessProfile(business));

        if (!baselineEstablished) {
          // First snapshot: silently record the baseline, do not show overlay.
          baselineEstablished = true;
          return;
        }

        // Subsequent snapshots: suspension happened DURING the active session.
        if (suspended && !hasStartedRef.current) {
          setIsSuspendedRef.current(true);
          startCountdown();
        } else if (!suspended) {
          setIsSuspendedRef.current(false);
          hasStartedRef.current = false;
          clearCountdown();
          setSecondsRef.current(AUTO_LOGOUT_DELAY_MS / 1000);
        }
      }
    );

    return () => {
      unsubscribe();
      clearCountdown();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, dispatch]);

  function startCountdown() {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setSecondsRef.current(AUTO_LOGOUT_DELAY_MS / 1000);

    countdownRef.current = setInterval(() => {
      setSecondsRef.current((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    logoutTimerRef.current = setTimeout(() => {
      clearCountdown();
      logoutUserRef.current();
    }, AUTO_LOGOUT_DELAY_MS);
  }

  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }

  return { isSuspended, secondsRemaining };
}
