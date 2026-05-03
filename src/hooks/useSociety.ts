import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import { setSelectedSociety, setError, setLoading } from "@store/slices/societySlice";
import { societyService } from "@services/societyService";
import { Society } from "@types/index";

export const useSociety = () => {
  const dispatch = useAppDispatch();
  const { selectedSociety } = useAppSelector((state) => state.society);

  const selectSociety = useCallback(async (societyId: string) => {
    dispatch(setLoading(true));
    try {
      const society = await societyService.getSocietyById(societyId);
      dispatch(setSelectedSociety(society));
      return society;
    } catch (error: any) {
      dispatch(
        setError(
          error.response?.data?.message || "Failed to load society"
        )
      );
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const getSocieties = useCallback(async (page: number = 1, limit: number = 10) => {
    dispatch(setLoading(true));
    try {
      return await societyService.getSocieties(page, limit);
    } catch (error: any) {
      dispatch(
        setError(
          error.response?.data?.message || "Failed to load societies"
        )
      );
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  return {
    selectedSociety,
    selectSociety,
    getSocieties,
  };
};
