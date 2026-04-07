'use client';

import { createContext, useContext } from 'react';
import type { StoreOverrides } from './store-overrides';

const StoreConfigContext = createContext<StoreOverrides>({});

export const StoreConfigProvider = StoreConfigContext.Provider;

export function useStoreConfig(): StoreOverrides {
  return useContext(StoreConfigContext);
}
