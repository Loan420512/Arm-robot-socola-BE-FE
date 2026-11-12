import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AUTH_EVENT, ApiError, clearSession, isUser, readSession, request, saveLoginSession, updateSessionUser } from './api';
import type { LoginResponse, User } from './api';

type Auth = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(readSession()));
  const attempt = useRef(0);
  const loginController = useRef<AbortController | null>(null);
  const abandonLogin = useCallback(() => {
    attempt.current++;
    loginController.current?.abort();
    loginController.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const syncSession = () => {
      if (!active) return;
      clearTimeout(expiryTimer);
      const session = readSession();
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) {
        expiryTimer = setTimeout(() => {
          if (!active) return;
          if (!readSession()) clearSession();
          else syncSession();
        }, Math.min(session.expiresAt - Date.now(), 2_147_483_647));
      }
    };
    window.addEventListener(AUTH_EVENT, syncSession);
    const restored = readSession();
    if (restored) {
      request<User>('/auth/me', { signal: controller.signal }).then((verified) => {
        if (!active || readSession()?.accessToken !== restored.accessToken) return;
        if (!isUser(verified)) throw new ApiError(502, 'Không xác minh được tài khoản quản trị.');
        updateSessionUser(verified);
      }).catch(() => {
        if (active && !controller.signal.aborted && readSession()?.accessToken === restored.accessToken) clearSession();
      }).finally(() => { if (active) setLoading(false); });
    }
    return () => {
      active = false;
      controller.abort();
      abandonLogin();
      clearTimeout(expiryTimer);
      window.removeEventListener(AUTH_EVENT, syncSession);
    };
  }, [abandonLogin]);

  const login = useCallback(async (username: string, password: string) => {
    abandonLogin();
    const currentAttempt = attempt.current;
    const controller = new AbortController();
    loginController.current = controller;
    try {
      const response = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
        signal: controller.signal,
      });
      if (!controller.signal.aborted && currentAttempt === attempt.current) saveLoginSession(response);
    } finally {
      if (loginController.current === controller) loginController.current = null;
    }
  }, [abandonLogin]);

  const logout = useCallback(() => {
    abandonLogin();
    clearSession();
  }, [abandonLogin]);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

// Provider and consumer intentionally share one context module; edits can reload this boundary.
// oxlint-disable-next-line react/only-export-components
export function useAuth(): Auth {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng trong AuthProvider.');
  return context;
}
