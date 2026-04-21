'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingStore {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  setCompleted: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      isLoading: true,
      setCompleted: (val) => set({ hasCompletedOnboarding: val }),
      setLoading: (val) => set({ isLoading: val }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true, isLoading: false }),
      reset: () => set({ hasCompletedOnboarding: false, isLoading: false }),
    }),
    {
      name: 'aura_onboarding_store',
      partialize: (state) => ({ hasCompletedOnboarding: state.hasCompletedOnboarding }),
    }
  )
);
