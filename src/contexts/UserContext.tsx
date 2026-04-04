import { createContext, useContext } from "react";
import type { User } from "../types/types";

export const UserContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
} | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};