import { create } from 'zustand';
import type { User } from '@/types';
import { storage } from '@/utils/storage';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';
import { authService, type LoginParams } from '@/services/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (params: LoginParams) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  isAuthenticated: false,

  init: () => {
    const token = storage.get(TOKEN_KEY);
    const user = storage.getJSON<User>(USER_KEY);
    if (token && user) {
      set({ token, user, isAuthenticated: true });
    }
  },

  login: async (params) => {
    set({ loading: true });
    try {
      const result = await authService.login(params);
      storage.set(TOKEN_KEY, result.access_token);
      storage.setJSON(USER_KEY, result.user);
      set({ token: result.access_token, user: result.user, isAuthenticated: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: () => {
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const user = await authService.getMe();
      storage.setJSON(USER_KEY, user);
      set({ user });
    } catch {
      storage.remove(TOKEN_KEY);
      storage.remove(USER_KEY);
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
