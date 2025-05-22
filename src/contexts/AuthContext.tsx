import { useTwitchAuth } from "@/hooks/useTwitchAuth";
import { type PropsWithChildren, createContext, useContext } from "react";

const AuthContext = createContext<ReturnType<typeof useTwitchAuth> | null>(
  null,
);

export function AuthProvider({ children }: PropsWithChildren) {
  const value = useTwitchAuth();

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return ctx;
}
