'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  createComposerStore,
  type ComposerStore,
  type ComposerStoreApi,
} from './create-store';
import type { ServerActions } from '../adapters/server-actions';
import type { ProfileSpec } from '@youpd/composer-core';

type ComposerContextValue = {
  store: ComposerStoreApi;
  actions: ServerActions;
  profile: ProfileSpec;
  fontManifestUrl: string;
  orgId: string;
};

const ComposerContext = createContext<ComposerContextValue | null>(null);

export type ComposerProviderProps = {
  actions: ServerActions;
  profile: ProfileSpec;
  fontManifestUrl: string;
  orgId: string;
  children: ReactNode;
};

export function ComposerProvider({
  actions,
  profile,
  fontManifestUrl,
  orgId,
  children,
}: ComposerProviderProps) {
  // useRef to hold the store across renders without re-creating it; subsequent
  // re-renders reuse the same store instance.
  const storeRef = useRef<ComposerStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createComposerStore();
  }
  return (
    <ComposerContext.Provider
      value={{
        store: storeRef.current,
        actions,
        profile,
        fontManifestUrl,
        orgId,
      }}
    >
      {children}
    </ComposerContext.Provider>
  );
}

function useComposerContext(): ComposerContextValue {
  const ctx = useContext(ComposerContext);
  if (!ctx) {
    throw new Error('useComposer* must be called inside <ComposerProvider>');
  }
  return ctx;
}

export function useComposerStore<T>(selector: (state: ComposerStore) => T): T {
  const { store } = useComposerContext();
  return useStore(store, selector);
}

export function useComposerStoreApi(): ComposerStoreApi {
  return useComposerContext().store;
}

export function useComposerActions(): ServerActions {
  return useComposerContext().actions;
}

export function useComposerProfile(): ProfileSpec {
  return useComposerContext().profile;
}

export function useComposerFontManifestUrl(): string {
  return useComposerContext().fontManifestUrl;
}

export function useComposerOrgId(): string {
  return useComposerContext().orgId;
}
