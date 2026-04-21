import { create } from 'zustand';
import { toast } from 'sonner';

interface ChatUIState {
  // Modals & Panels
  isStudioOpen: boolean;
  setStudioOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  showReelModal: boolean;
  setShowReelModal: (open: boolean) => void;
  showPushPrompt: boolean;
  setShowPushPrompt: (open: boolean) => void;
  showRegisterPrompt: boolean;
  setShowRegisterPrompt: (open: boolean) => void;
  callOpen: boolean;
  setCallOpen: (open: boolean) => void;
  shareTrigger: { text: string } | null;
  setShareTrigger: (trigger: { text: string } | null) => void;

  // Editing
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;

  // Reels
  reelMode: boolean;
  setReelMode: (active: boolean) => void;
  toggleReelMode: () => void;
  selectedMsgIds: Set<string>;
  toggleReelSelection: (msgId: string, maxMsgs: number) => void;
  clearReelSelection: () => void;

  // Global Device / View States
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
}

export const useChatUIStore = create<ChatUIState>((set) => ({
  // Modals & Panels
  isStudioOpen: false,
  setStudioOpen: (open) => set({ isStudioOpen: open }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  showReelModal: false,
  setShowReelModal: (open) => set({ showReelModal: open }),
  showPushPrompt: false,
  setShowPushPrompt: (open) => set({ showPushPrompt: open }),
  showRegisterPrompt: false,
  setShowRegisterPrompt: (open) => set({ showRegisterPrompt: open }),
  callOpen: false,
  setCallOpen: (open) => set({ callOpen: open }),
  shareTrigger: null,
  setShareTrigger: (trigger) => set({ shareTrigger: trigger }),

  // Editing
  editingMessageId: null,
  setEditingMessageId: (id) => set({ editingMessageId: id }),

  // Reels
  reelMode: false,
  setReelMode: (active) => set({ reelMode: active, selectedMsgIds: new Set() }),
  toggleReelMode: () => set((state) => ({ reelMode: !state.reelMode, selectedMsgIds: new Set() })),
  selectedMsgIds: new Set(),
  toggleReelSelection: (msgId: string, maxMsgs: number = 18) => set((state) => {
    const next = new Set(state.selectedMsgIds);
    if (next.has(msgId)) {
      next.delete(msgId);
    } else {
      if (next.size >= maxMsgs) {
        toast.error(`Max ${maxMsgs} messages per reel`);
        return state; // do nothing
      }
      next.add(msgId);
    }
    return { selectedMsgIds: next };
  }),
  clearReelSelection: () => set({ selectedMsgIds: new Set() }),

  // Recording
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
}));
