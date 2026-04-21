'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAppStore, useChatSessions } from '@/lib/stores/store';
import { useChatUIStore } from '@/lib/stores/ui-store';
import { useStats } from '@/lib/contexts/stats-context';
import { resetInactivityTimers } from '@/lib/notifications';
import type { ReplyTarget } from '@/components/chat/ChatMessage';
import { haptics } from '@/lib/utils/haptics';

/** Parse raw SSE text into { event, data } pairs */
function parseSSEChunk(raw: string): Array<{ event: string; data: string }> {
  const results: Array<{ event: string; data: string }> = [];
  const blocks = raw.split('\n\n');
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    let event = '';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      else if (line.startsWith('data: ')) data = line.slice(6).trim();
    }
    if (event && data) results.push({ event, data });
  }
  return results;
}

export function useChatHandlers() {
  const raw = useChatSessions();
  const sessions: typeof raw.sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  const { updateSession, deleteSession, addSession, selectedSessionId, setSelectedSessionId, setSessions } = raw;
  const { updateDepth, updateHP } = useStats();

  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [lastDepthChange, setLastDepthChange] = useState<{ delta: number } | null>(null);
  const [lastHPDelta, setLastHPDelta] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [practicePrompt, setPracticePrompt] = useState<string | undefined>(undefined);
  const [limitReached, setLimitReached] = useState(false);
  const [typingSessionId, setTypingSessionId] = useState<string | null>(null);

  const sendLockRef = useRef(false);
  const isMountedRef = useRef(true);

  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setReplyTo(null);

    // Lazy load messages if we only have the preview or none
    const currentSession = sessions.find(s => s.id === sessionId);
    if (!currentSession || !currentSession.messages || currentSession.messages.length <= 1) {
      fetch(`/api/chat-sessions/${sessionId}/messages`)
        .then(res => res.json())
        .then(data => {
          if (data.messages) {
            updateSession(sessionId, { messages: data.messages });
          }
        })
        .catch(err => console.error("Failed to load chat messages", err));
    }
  }, [setSelectedSessionId, sessions, updateSession]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat-sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        deleteSession(sessionId);
        if (selectedSessionId === sessionId) setSelectedSessionId(null);
        toast.success('Chat deleted');
      } else {
        toast.error('Could not delete chat');
      }
    } catch {
      toast.error('Failed to delete chat');
    }
  }, [deleteSession, selectedSessionId, setSelectedSessionId]);

  const handleEditMessage = useCallback(async (messageId: string, newText: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText }),
    });
    if (!res.ok) { toast.error('Could not edit message'); return; }
    const currentSession = sessions.find(s => s.id === selectedSessionId);
    if (currentSession) {
      const updatedMessages = (currentSession.messages as any[]).map((m: any) =>
        m.id === messageId ? { ...m, text: newText, edited: true, originalText: m.originalText || m.text } : m
      );
      updateSession(selectedSessionId!, { messages: updatedMessages });
    }
    toast.success('Message edited');
  }, [sessions, selectedSessionId, updateSession]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Could not delete message'); return; }
    const currentSession = sessions.find(s => s.id === selectedSessionId);
    if (currentSession) {
      const updatedMessages = (currentSession.messages as any[]).filter((m: any) => m.id !== messageId);
      updateSession(selectedSessionId!, { messages: updatedMessages });
    }
    toast.success('Message deleted');
  }, [sessions, selectedSessionId, updateSession]);

  const handleBlockAI = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat-sessions/${sessionId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block_ai', reason: 'User blocked AI' }),
      });
      if (res.ok) {
        const data = await res.json();
        updateSession(sessionId, data.session);
        toast.success('AI blocked successfully');
      } else {
        toast.error('Failed to block AI');
      }
    } catch {
      toast.error('Error blocking AI');
    }
  }, [updateSession]);

  const handleUnblockAI = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat-sessions/${sessionId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock_ai' }),
      });
      if (res.ok) {
        const data = await res.json();
        updateSession(sessionId, data.session);
        toast.success('AI unblocked');
      } else {
        toast.error('Failed to unblock AI');
      }
    } catch {
      toast.error('Error unblocking AI');
    }
  }, [updateSession]);

  const handleClearMemory = useCallback(async (sessionId: string) => {
    try {
      await fetch(`/api/chat-sessions/${sessionId}/clear`, { method: 'DELETE' });
      updateSession(sessionId, { messages: [] });
      toast.success('Memory cleared');
    } catch {
      toast.error('Failed to clear memory');
    }
  }, [updateSession]);

  const handleWipePersonaMemory = useCallback(async (personaId: string, sessionId: string) => {
    try {
      const res = await fetch(`/api/persona/${personaId}/memory`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Wipe failed');

      const wipeMsg = {
        id: `wipe-${Date.now()}`,
        text: '🧠 Neural Memory Wiped. The AI has forgotten all non-global context for this persona.',
        sender: 'AI' as const,
        isSystemDivider: true,
        systemDividerText: '🧠 Memory Wiped',
        createdAt: new Date(),
      };
      const session = useAppStore.getState().chatSessions.find((s: any) => s.id === sessionId);
      if (session) {
        updateSession(sessionId, { messages: [...(session.messages as any[]), wipeMsg] });
      }
      toast.success('Neural memory wiped cleanly');
    } catch {
      toast.error('Failed to wipe persona memory');
    }
  }, [updateSession]);

  const handleInitializeSession = useCallback(async (personaId: string, onSuccess?: () => void) => {
    if (isCreating) return;
    try {
      setIsCreating(true);
      const res = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const isNew = !useAppStore.getState().chatSessions.find((s: any) => s.id === data.session.id);
      if (isNew) addSession(data.session);
      setSelectedSessionId(data.session.id);
      onSuccess?.();

      // If this is a brand-new session (no messages yet), trigger persona-personalized greeting
      if (isNew || (data.session.messages?.length ?? 0) === 0) {
        fetch(`/api/chat-sessions/${data.session.id}/greet`, { method: 'POST' })
          .then(r => r.json())
          .then(greetData => {
            if (greetData.message) {
              const currentSession = useAppStore.getState().chatSessions.find((s: any) => s.id === data.session.id);
              const existing: any[] = currentSession?.messages || [];
              // Only inject if still empty (avoid duplicates on race)
              if (existing.length === 0) {
                updateSession(data.session.id, {
                  messages: [...existing, {
                    ...greetData.message,
                    createdAt: new Date(greetData.message.createdAt),
                    sender: 'AI' as const,
                  }],
                });
              }
            }
          })
          .catch(err => console.warn('[greet] failed silently:', err));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initialize chat');
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, addSession, setSelectedSessionId, updateSession]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    // Optimistic UI Update first
    const currentSession = sessions.find(s => s.id === selectedSessionId);
    let originalMessages: any[] = [];
    if (currentSession) {
      originalMessages = currentSession.messages as any[];
      const updatedMessages = originalMessages.map((m: any) =>
        m.id === messageId ? { ...m, reaction: emoji } : m
      );
      updateSession(selectedSessionId!, { messages: updatedMessages });
    }

    try {
      await fetch(`/api/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: emoji }),
      });
    } catch {
      toast.error('Could not save reaction');
      // Revert on error
      if (currentSession) {
        updateSession(selectedSessionId!, { messages: originalMessages });
      }
    }
  }, [sessions, selectedSessionId, updateSession]);

  const handleSendMessage = useCallback(async (
    text: string,
    sessionId: string,
    replyingTo: ReplyTarget | null = null,
    isTikTok: boolean = false,
  ) => {
    if (!text.trim() || loading || !sessionId) return;
    if (sendLockRef.current) return;

    const currentSession = sessions.find(s => s.id === sessionId);
    if (currentSession?.blockedBy === 'USER') {
      toast.error('AI is blocked. Unblock it to send messages.');
      return;
    }
    if (currentSession?.blockedBy === 'AI') {
      toast.error('Chat is blocked by AI. Start a new chat.');
      return;
    }

    sendLockRef.current = true;
    const userText = text.trim();
    setReplyTo(null);

    const getSession = () => useAppStore.getState().chatSessions.find((s: any) => s.id === sessionId);

    const tempId = `temp-${Date.now()}`;
    const preMessages = getSession()?.messages || [];
    updateSession(sessionId, {
      messages: [...(preMessages as any[]), {
        id: tempId,
        text: userText,
        sender: 'USER' as const,
        senderType: 'USER_A',
        grammarCorrection: null,
        weaknessIdentified: null,
        bonusXP: false,
        createdAt: new Date(),
        replyToId: replyingTo?.id ?? null,
        readState: 'sent',
      }],
    });

    setLoading(true);

    // Get last AI message reaction for injection
    const allMsgs: any[] = getSession()?.messages || [];
    const lastAIMsg = [...allMsgs].reverse().find((m: any) => m.sender === 'AI');
    const lastReaction = lastAIMsg?.reaction ?? null;

    let realUserMsgId: string | null = null;

    const updateReadState = (state: 'sent' | 'received' | 'read') => {
      const msgs: any[] = getSession()?.messages || [];
      const targetId = realUserMsgId || tempId;
      updateSession(sessionId, {
        messages: msgs.map((m: any) => m.id === targetId ? { ...m, readState: state } : m),
      });
    };

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatSessionId: sessionId,
          text: userText,
          replyToId: replyingTo?.id,
          personaId: currentSession?.persona?.id,
          lastReaction,
          isTikTok,
        }),
      });

      if (res.status === 402) {
        const errData = await res.json().catch(() => ({}));
        if (errData.upgradeRequired) {
          const msgs: any[] = getSession()?.messages || [];
          updateSession(sessionId, { messages: msgs.filter((m: any) => m.id !== tempId) });
          setLimitReached(true);
          sendLockRef.current = false;
          if (isMountedRef.current) setLoading(false);
          return;
        }
      }

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send message');
      }

      updateReadState('received');
      // Dispatch an event to refresh quests on the UI (e.g. Radar)
      window.dispatchEvent(new Event('quests-updated'));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let hasFirstBubble = false;

      setTypingSessionId(sessionId);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // Process complete SSE event blocks (separated by \n\n)
        let sepIdx: number;
        while ((sepIdx = sseBuffer.indexOf('\n\n')) !== -1) {
          const block = sseBuffer.slice(0, sepIdx);
          sseBuffer = sseBuffer.slice(sepIdx + 2);

          const parsed = parseSSEChunk(block + '\n\n');
          for (const { event, data } of parsed) {
            try {
              const payload = JSON.parse(data);

              if (event === 'session') {
                realUserMsgId = payload.userMsgId;
                if (realUserMsgId) {
                  const msgs: any[] = getSession()?.messages || [];
                  updateSession(sessionId, {
                    messages: msgs.map((m: any) =>
                      m.id === tempId ? { ...m, id: realUserMsgId, readState: 'received' } : m
                    ),
                  });
                }
              }

              if (event === 'user_update' && payload.errorSpan) {
                const targetId = payload.userMsgId || realUserMsgId || tempId;
                const msgs: any[] = getSession()?.messages || [];
                updateSession(sessionId, {
                  messages: msgs.map((m: any) =>
                    m.id === targetId ? { ...m, errorSpan: payload.errorSpan } : m
                  ),
                });
              }

              if (event === 'typing_indicator') {
                setTypingSessionId(sessionId);
              }

              if (event === 'message') {
                if (!hasFirstBubble) {
                  hasFirstBubble = true;
                  updateReadState('read');
                }
                setTypingSessionId(null);

                const newMsg = {
                  id: payload.id,
                  text: payload.text,
                  sender: 'AI' as const,
                  senderPersonaId: payload.senderPersonaId ?? null,
                  senderName: payload.senderName ?? null,
                  senderAvatar: payload.senderAvatar ?? null,
                  grammarCorrection: payload.grammarCorrection ?? null,
                  weaknessIdentified: payload.weaknessIdentified ?? null,
                  bonusXP: payload.bonusXP ?? false,
                  suggestion: payload.suggestion ?? null,
                  errorSpan: payload.errorSpan ?? null,
                  replyTo: payload.replyTo ?? null,
                  createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
                };

                const msgs: any[] = getSession()?.messages || [];
                updateSession(sessionId, { messages: [...msgs, newMsg] });
              }

              if (event === 'stats') {
                if (typeof payload.currentDepth === 'number') {
                  updateDepth(payload.currentDepth);
                  if (typeof payload.depthDelta === 'number' && payload.depthDelta !== 0) {
                    setLastDepthChange({ delta: payload.depthDelta });
                    setTimeout(() => setLastDepthChange(null), 2200);
                  }
                }
                if (typeof payload.currentHP === 'number') {
                  updateHP(payload.currentHP);
                  if (typeof payload.hpDelta === 'number' && payload.hpDelta < 0) haptics.error();
                  setLastHPDelta(payload.hpDelta ?? null);
                  setTimeout(() => setLastHPDelta(null), 2000);
                }
                // 🎯 CEFR Level Badge — surface estimated level to user
                if (payload.userLevel && typeof payload.userLevel === 'string') {
                  const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
                  const levelKey = `cefr_shown_${payload.userLevel}`;
                  if (CEFR_LEVELS.includes(payload.userLevel) && !localStorage.getItem(levelKey)) {
                    localStorage.setItem(levelKey, '1');
                    type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
                    const lvl = payload.userLevel as Level;
                    const levelEmoji: Record<Level, string> = { A1: '🌱', A2: '🌿', B1: '⚡', B2: '🔥', C1: '💎', C2: '👑' };
                    const levelDescMap: Record<Level, string> = {
                      A1: 'Beginner', A2: 'Elementary',
                      B1: 'Intermediate', B2: 'Upper-Intermediate',
                      C1: 'Advanced', C2: 'Mastery',
                    };
                    const emoji = levelEmoji[lvl] || '📊';
                    const levelDesc = levelDescMap[lvl] || lvl;
                    setTimeout(() => {
                      toast(`${emoji} You're ${payload.userLevel} — ${levelDesc}`, {
                        description: 'Share your English level!',
                        duration: 8000,
                        action: {
                          label: 'Share',
                          onClick: () => {
                            const shareText = `I just got assessed as ${payload.userLevel} (${levelDesc}) English level on Aura! 🎯`;
                            if (navigator.share) {
                              navigator.share({ title: 'My English Level', text: shareText }).catch(() => { });
                            } else {
                              navigator.clipboard.writeText(shareText).then(() =>
                                toast.success('Copied to clipboard!')
                              ).catch(() => { });
                            }
                          },
                        },
                      });
                    }, 1200);
                  }
                }
                // Streak milestone celebration
                if (payload.streakMilestone && typeof payload.streakMilestone === 'number') {
                  haptics.success();
                  setTimeout(() => {
                    useChatUIStore.getState().setShareTrigger({ text: `🔥 I hit a ${payload.streakMilestone}-day streak on Aura! Keep the momentum going.` });
                  }, 600);
                }
                if (payload.questCompleted) {
                  const { title, depthReward } = payload.questCompleted;
                  haptics.success();
                  setTimeout(() => {
                    toast.success(`✓ ${title} · +${depthReward}m`, {
                      duration: 5000,
                      description: 'Quest complete — depth rewarded',
                    });
                  }, 800);
                  if (typeof payload.currentDepth === 'number') {
                    setTimeout(() => updateDepth(payload.currentDepth), 900);
                  }
                }
              }

              if (event === 'error') {
                throw new Error(payload.error || 'Stream error');
              }

              if (event === 'done') {
                // Update depth & HP from the done payload (stream API sends these here, not in stats event)
                if (typeof payload.currentDepth === 'number') {
                  updateDepth(payload.currentDepth);
                }
                if (typeof payload.currentHP === 'number') {
                  updateHP(payload.currentHP);
                }
                if (typeof payload.depthDelta === 'number' && payload.depthDelta !== 0) {
                  setLastDepthChange({ delta: payload.depthDelta });
                  setTimeout(() => setLastDepthChange(null), 2200);
                }
                if (typeof payload.hpDelta === 'number' && payload.hpDelta < 0) {
                  haptics.error();
                  setLastHPDelta(payload.hpDelta);
                  setTimeout(() => setLastHPDelta(null), 2000);
                }
                window.dispatchEvent(new CustomEvent('quest-progress-update'));
                resetInactivityTimers();
                
                // If this was a TikTok message, fetch the TikTok Note in the background
                // and inject it into the last AI message client-side (non-blocking)
                if (isTikTok) {
                  // Extract just the TikTok URL from the message text
                  const tiktokUrlMatch = userText.match(/https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/\S+/i);
                  const tiktokUrl = tiktokUrlMatch ? tiktokUrlMatch[0].split('?')[0] : userText;
                  fetch('/api/tiktok-note', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: tiktokUrl }),
                  })
                    .then(r => r.ok ? r.json() : null)
                    .then(noteData => {
                      if (!noteData || !noteData.phrase) return;
                      // Inject tiktokNote into the last AI message in the session
                      const msgs: any[] = getSession()?.messages || [];
                      const lastAIIdx = msgs.map((m: any) => m.sender).lastIndexOf('AI');
                      if (lastAIIdx === -1) return;
                      const updated = msgs.map((m: any, i: number) =>
                        i === lastAIIdx ? { ...m, tiktokNote: noteData } : m
                      );
                      updateSession(sessionId, { messages: updated });
                    })
                    .catch(() => { /* silent — TikTok Note is optional */ });
                }

                const allSessions = useAppStore.getState().chatSessions;
                const totalUserMsgs = (allSessions as any[]).reduce(
                  (sum: number, s: any) => sum + (s.messages as any[]).filter((m: any) => m.sender === 'USER').length, 0
                );
                if (totalUserMsgs === 5 && !localStorage.getItem('initial_quests_shown')) {
                  localStorage.setItem('initial_quests_shown', '1');
                  fetch('/api/quests').then(r => r.json()).then(qData => {
                    (qData.quests || []).slice(0, 3).forEach((quest: any, i: number) => {
                      setTimeout(() => {
                        toast(`🎯 ${quest.title}`, { description: quest.description, duration: 7000, icon: '🗺️' });
                      }, 1800 + i * 900);
                    });
                  }).catch(() => { });
                }
              }
            } catch (parseErr) {
              if (event === 'error') throw new Error('Stream error');
            }
          }
        }
      }

    } catch (err) {
      setTypingSessionId(null);
      const msgs: any[] = getSession()?.messages || [];
      // Only remove the temporary message if the server hasn't confirmed storage yet
      if (!realUserMsgId) {
        updateSession(sessionId, { messages: msgs.filter((m: any) => m.id !== tempId) });
      } else {
        // If it was stored, we should just mark it as sent or error
        updateSession(sessionId, { 
          messages: msgs.map((m: any) => m.id === realUserMsgId ? { ...m, readState: 'sent' } : m) 
        });
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Transmission failed';
      if (errorMessage.includes('API key') || errorMessage.includes('configured')) {
        toast.error('AI service not configured. Check your Groq API key.');
      } else if (errorMessage.includes('timed out')) {
        toast.error('AI took too long. Please try again.');
      } else if (errorMessage.includes('Too many')) {
        toast.error('Slow down — too many messages!');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      sendLockRef.current = false;
      setTypingSessionId(null);
      if (isMountedRef.current) setLoading(false);
    }
  }, [loading, sessions, updateSession, updateDepth, updateHP]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loading,
    isCreating,
    lastDepthChange,
    lastHPDelta,
    replyTo,
    setReplyTo,
    practicePrompt,
    setPracticePrompt,
    isMountedRef,
    limitReached,
    setLimitReached,
    typingSessionId,
    handleSelectSession,
    handleDeleteSession,
    handleEditMessage,
    handleDeleteMessage,
    handleBlockAI,
    handleUnblockAI,
    handleClearMemory,
    handleWipePersonaMemory,
    handleInitializeSession,
    handleSendMessage,
    handleReaction,
    sessions,
    setSessions,
    selectedSessionId,
    setSelectedSessionId,
    addSession,
  };
}
