import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useLoginPreference = create<{
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
}>()(
  persist(
    (set) => ({
      rememberMe: false,
      setRememberMe: (rememberMe) => set({ rememberMe }),
    }),
    { name: "billboard-login-preference" },
  ),
);
