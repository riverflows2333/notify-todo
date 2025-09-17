import { create } from 'zustand';
export const useAuth = create((set) => ({
    token: localStorage.getItem('token'),
    setToken: (t) => {
        if (t)
            localStorage.setItem('token', t);
        else
            localStorage.removeItem('token');
        set({ token: t });
    },
}));
