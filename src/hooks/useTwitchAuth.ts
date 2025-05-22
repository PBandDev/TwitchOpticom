import {
  DEV_REDIRECT_URI,
  PROD_REDIRECT_URI,
  TWITCH_CLIENT_ID,
} from "@/config";
import { useIsRestoring, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@twurple/api";
import { StaticAuthProvider, getTokenInfo } from "@twurple/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

const REDIRECT_URI = import.meta.env.PROD
  ? PROD_REDIRECT_URI
  : DEV_REDIRECT_URI;

type TokenData = {
  accessToken: string;
  expiresAt: number;
};

interface AuthUser {
  id: string;
  displayName: string;
}

interface UseTwitchAuthReturn {
  user: AuthUser | null;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  accessToken: string | null;
}

export function useTwitchAuth(): UseTwitchAuthReturn {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();

  const [token, setToken] = useState<TokenData | null>(
    () => queryClient.getQueryData<TokenData>(["auth", "token"]) ?? null,
  );
  const [user, setUser] = useState<AuthUser | null>(
    () => queryClient.getQueryData<AuthUser>(["auth", "user"]) ?? null,
  );

  const login = useCallback((): void => {
    const scope = encodeURIComponent("user:read:email");
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI,
    )}&response_type=token&scope=${scope}`;

    window.location.href = authUrl;
  }, []);

  const logout = useCallback((): void => {
    queryClient.setQueryData(["auth", "token"], null);
    queryClient.setQueryData(["auth", "user"], null);
    queryClient.invalidateQueries({ queryKey: ["auth"] });

    setToken(null);
    setUser(null);
  }, [queryClient]);

  useEffect(() => {
    if (typeof window === "undefined" || isRestoring) {
      return;
    }

    const hashFragment = window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : "";

    if (hashFragment.includes("access_token")) {
      const params = new URLSearchParams(hashFragment);
      const accessToken = params.get("access_token");
      const expiresInRaw = params.get("expires_in");
      const expiresInSec = expiresInRaw ? Number(expiresInRaw) : null;

      if (accessToken) {
        let expiresAt: number;
        if (
          expiresInSec === null ||
          Number.isNaN(expiresInSec) ||
          expiresInSec <= 0
        ) {
          expiresAt = Number.MAX_SAFE_INTEGER;
        } else {
          expiresAt = Date.now() + expiresInSec * 1000 - 60_000;
        }

        const tokenData: TokenData = { accessToken, expiresAt };
        queryClient.setQueryData(["auth", "token"], tokenData);
        setToken(tokenData);
      }

      if (window.location.hash) {
        window.history.replaceState(
          null,
          document.title,
          window.location.pathname + window.location.search,
        );
      }
    } else {
      const cachedToken = queryClient.getQueryData<TokenData>([
        "auth",
        "token",
      ]);
      if (
        cachedToken &&
        (cachedToken.expiresAt === Number.MAX_SAFE_INTEGER ||
          cachedToken.expiresAt > Date.now())
      ) {
        setToken(cachedToken);
        const cachedUser = queryClient.getQueryData<AuthUser>(["auth", "user"]);
        if (cachedUser) {
          setUser(cachedUser);
        }
      } else if (cachedToken) {
        queryClient.setQueryData(["auth", "token"], null);
        queryClient.setQueryData(["auth", "user"], null);
        setToken(null);
        setUser(null);
      }
    }
  }, [isRestoring, queryClient]);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated") {
        if (
          event.query.queryKey[0] === "auth" &&
          event.query.queryKey[1] === "token"
        ) {
          const newTokenState = event.query.state
            .data satisfies TokenData | null;
          setToken(newTokenState);
          if (!newTokenState) {
            setUser(null);
            queryClient.setQueryData(["auth", "user"], null);
          }
        } else if (
          event.query.queryKey[0] === "auth" &&
          event.query.queryKey[1] === "user"
        ) {
          setUser(event.query.state.data satisfies AuthUser | null);
        }
      }
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (isRestoring || !token || user) {
      if (!token && user) setUser(null);
      return;
    }

    (async () => {
      try {
        const tokenInfo = await getTokenInfo(
          token.accessToken,
          TWITCH_CLIENT_ID,
        );
        const userId = tokenInfo.userId;
        if (!userId) {
          throw new Error("Token info did not contain a user ID");
        }

        const authProvider = new StaticAuthProvider(
          TWITCH_CLIENT_ID,
          token.accessToken,
        );
        const api = new ApiClient({ authProvider });
        const fetchedHelixUser = await api.users.getUserById(userId);

        if (fetchedHelixUser) {
          const plainUser: AuthUser = {
            id: fetchedHelixUser.id,
            displayName: fetchedHelixUser.displayName,
          };
          setUser(plainUser);
          queryClient.setQueryData(["auth", "user"], plainUser);
        } else {
          throw new Error(
            "Failed to fetch user details despite valid token info",
          );
        }
      } catch (error) {
        console.error("Failed to fetch Twitch user or token invalid:", error);
        queryClient.setQueryData(["auth", "token"], null);
        queryClient.setQueryData(["auth", "user"], null);
        setToken(null);
        setUser(null);
      }
    })();
  }, [token, user, queryClient, isRestoring]);

  const isAuthenticated = token !== null && user !== null;
  const accessToken = token?.accessToken ?? null;

  return useMemo(
    () => ({ user, login, logout, isAuthenticated, accessToken }),
    [user, login, logout, isAuthenticated, accessToken],
  );
}
