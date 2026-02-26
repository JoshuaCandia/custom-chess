import { create } from "zustand";

interface AuthStore {
  guestMode: boolean;
  setGuestMode: (v: boolean) => void;
  justRegistered: string | null;
  setJustRegistered: (username: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  guestMode: false,
  setGuestMode: (guestMode) => set({ guestMode }),
  justRegistered: null,
  setJustRegistered: (justRegistered) => set({ justRegistered }),
}));
