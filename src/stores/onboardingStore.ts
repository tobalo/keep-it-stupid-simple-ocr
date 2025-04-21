import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  isCompleted: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isCompleted: false,
      completeOnboarding: () => set({ isCompleted: true }),
      resetOnboarding: () => set({ isCompleted: false }),
    }),
    {
      name: 'onboarding-storage',
    }
  )
);