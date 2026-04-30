import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login as apiLogin, register as apiRegister, getMe } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        try {
          const { data } = await getMe();
          setUser(data);
        } catch {
          await AsyncStorage.removeItem("access_token");
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await apiLogin(email, password);
    await AsyncStorage.setItem("access_token", data.access_token);
    const me = await getMe();
    setUser(me.data);
  };

  const register = async (email, password) => {
    await apiRegister(email, password);
    await login(email, password);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
