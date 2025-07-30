import { createContext } from 'react';

export const AppContext = createContext(null);
export const AppProvider = AppContext.Provider;

export const SHARE_SCOPE = {
  PROFILE: 'profile',
  RECORD: 'record',
};