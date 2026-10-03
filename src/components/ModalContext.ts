// src/components/ModalContext.ts
'use client';
import { createContext, useContext } from 'react';

export const ModalCtx = createContext<{ openWork: (id: string) => void; openArtist: (id: string) => void }>({
  openWork() {},
  openArtist() {},
});

export const useModal = () => useContext(ModalCtx);
