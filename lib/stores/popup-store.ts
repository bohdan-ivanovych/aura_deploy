/**
 * popup-store.ts
 *
 * Task 2: Singleton global store for Correction / Translation popups.
 * Only one popup can be open at a time — opening a new one auto-closes the previous.
 * A document-level mousedown listener closes the popup when clicking outside.
 */
import { create } from 'zustand';

export type PopupType = 'correction' | 'translation';

export interface OpenPopup {
  type: PopupType;
  /** Unique identifier — typically the message ID or a generated key */
  id: string;
}

interface PopupStoreState {
  openPopup: OpenPopup | null;
  openPopupById: (type: PopupType, id: string) => void;
  closePopup: () => void;
}

export const usePopupStore = create<PopupStoreState>((set) => ({
  openPopup: null,
  openPopupById: (type, id) => set({ openPopup: { type, id } }),
  closePopup: () => set({ openPopup: null }),
}));
