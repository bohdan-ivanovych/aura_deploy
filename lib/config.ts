import { Home, MessageSquare, BarChart2, BookOpen } from 'lucide-react';

export const TOAST_OPTIONS = {
  style: {
    background: 'rgba(10,10,10,0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(30px)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    borderRadius: '24px',
    color: '#fff'
  },
};

export const NAV_ITEMS = [
  { name: 'Home',     href: '/',           icon: Home },
  { name: 'Chat',     href: '/chat',       icon: MessageSquare },
  { name: 'Cards',    href: '/flashcards', icon: BookOpen },
  { name: 'Depth',    href: '/stats',      icon: BarChart2 },
];

export const SPRING_OPTIONS = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 1,
};
