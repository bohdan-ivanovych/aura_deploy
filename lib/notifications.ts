'use client';

import { toast } from 'sonner';

interface PersonaNotification {
  personaName: string;
  message: string;
}

const PERSONA_MESSAGES: Record<string, string[]> = {
  'IELTS Terminator': [
    "You made errors yesterday and didn't show up today. Band 4 energy.",
    "Your absence speaks volumes. Band descriptors don't wait.",
    "Every day you skip is another band score lost. Come back.",
  ],
  'SV Senior Engineer': [
    "Your English is shipping bugs. Come fix them.",
    "You ghosted your practice session. That's a red flag in any interview.",
    "Precision in language = precision in thought. You're slipping.",
  ],
  'Toxic LA Barista': [
    "You made 4 errors yesterday and didn't show up today? Typical.",
    "No cap, your grammar is literally embarrassing. Fix it.",
    "The way you just abandoned your English practice… it's giving up.",
  ],
  'default': [
    "Hey. You were doing well. Don't stop now.",
    "Your English practice streak is in danger. Come back.",
    "5 minutes. That's all it takes. Let's go.",
  ],
};

const SECONDARY_PERSONA_MESSAGES: Record<string, string[]> = {
  'IELTS Terminator': [
    "Still absent? Examiners notice patterns. This is one.",
    "24 hours later. Your band score is still suffering.",
  ],
  'SV Senior Engineer': [
    "The gap between you and a fluent communicator grows daily.",
    "No response? In an interview, silence is a wrong answer.",
  ],
  'Toxic LA Barista': [
    "I'm not even surprised at this point. Lowkey disappointing.",
    "It's giving 'gave up'. Come prove me wrong.",
  ],
  'default': [
    "Still here. Still waiting. Your call.",
    "One message. That's all. Let's break the silence.",
  ],
};

function getMessages(personaName: string, secondary = false) {
  const map = secondary ? SECONDARY_PERSONA_MESSAGES : PERSONA_MESSAGES;
  const key = Object.keys(map).find(k =>
    personaName.toLowerCase().includes(k.toLowerCase())
  ) ?? 'default';
  return map[key];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let secondaryTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersonaName = '';
let notificationsFired = 0;

export function startInactivityNotifications(personaName: string) {
  lastPersonaName = personaName || 'default';
  resetInactivityTimers();
}

export function resetInactivityTimers() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (secondaryTimer) clearTimeout(secondaryTimer);
  notificationsFired = 0;

  const FIVE_MINUTES = 5 * 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;

  inactivityTimer = setTimeout(() => {
    if (notificationsFired === 0) {
      const messages = getMessages(lastPersonaName, false);
      const msg = pickRandom(messages);
      toast(msg, {
        duration: 8000,
        style: {
          background: 'rgba(10,10,15,0.95)',
          border: '1px solid rgba(255,0,128,0.4)',
          color: '#fff',
          fontWeight: '700',
          fontSize: '13px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 30px rgba(255,0,128,0.2)',
        },
        description: `— ${lastPersonaName}`,
      });
      notificationsFired++;

      secondaryTimer = setTimeout(() => {
        if (notificationsFired === 1) {
          const secondaryMessages = getMessages(lastPersonaName, true);
          const secondMsg = pickRandom(secondaryMessages);
          const allPersonas = Object.keys(PERSONA_MESSAGES).filter(k => k !== 'default' && k !== lastPersonaName);
          const altPersona = allPersonas.length > 0 ? pickRandom(allPersonas) : 'default';
          const altMessages = getMessages(altPersona, false);
          const altMsg = pickRandom(altMessages);

          toast(altMsg, {
            duration: 8000,
            style: {
              background: 'rgba(10,10,15,0.95)',
              border: '1px solid rgba(0,212,212,0.4)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '13px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 30px rgba(0,212,212,0.15)',
            },
            description: `— ${altPersona !== 'default' ? altPersona : 'Aura'}`,
          });
          notificationsFired++;
          void secondaryMessages; void secondMsg;
        }
      }, ONE_HOUR);
    }
  }, FIVE_MINUTES);
}

export function stopInactivityNotifications() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (secondaryTimer) clearTimeout(secondaryTimer);
  inactivityTimer = null;
  secondaryTimer = null;
}
