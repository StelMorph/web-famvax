// src/contexts/AppContext.js
import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

// Single, app-wide hook that everyone imports
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within <AppProvider>');
  return ctx;
};

// Keep named export for provider binding done in AppState / App.jsx
export const AppProvider = AppContext.Provider;

export default AppContext;
