'use client';

import { usePWAInstall } from '@/lib/contexts/pwa-install-context';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Smartphone, Share, Plus } from 'lucide-react';
import { useState } from 'react';

export function PWAInstallModal() {
  const {
    deferred,
    install,
    installModalOpen,
    setInstallModalOpen,
    isIOS,
    isStandalone,
    notifPermission,
    requestNotifications,
    remindLater,
  } = usePWAInstall();

  const [step, setStep] = useState<'install' | 'notify'>('install');
  const [notifRequested, setNotifRequested] = useState(false);

  if (isStandalone) return null;
  if (!deferred && !isIOS) return null;

  const handleInstallAndroid = async () => {
    await install();
    if (notifPermission !== 'granted') setStep('notify');
    else setInstallModalOpen(false);
  };

  const handleNotify = async () => {
    setNotifRequested(true);
    await requestNotifications();
    setTimeout(() => setInstallModalOpen(false), 600);
  };

  const handleSkipNotify = () => {
    setInstallModalOpen(false);
  };

  const handleClose = () => {
    setInstallModalOpen(false);
    setStep('install');
  };

  return (
    <AnimatePresence>
      {installModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[98] bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '110%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[99] rounded-t-[28px] overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(6,8,16,0.97) 0%, rgba(10,12,24,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              boxShadow: '0 -24px 80px rgba(0,0,0,0.9), 0 -1px 0 rgba(0,212,212,0.12)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(0,212,212,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(180,50,240,0.06) 0%, transparent 50%)',
              }}
            />

            <div className="relative px-6 pt-5 pb-2">
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.15)' }} />

              <button
                onClick={handleClose}
                className="absolute top-5 right-5 p-1.5 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <AnimatePresence mode="wait">
                {step === 'install' ? (
                  <motion.div
                    key="install"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0,212,212,0.15) 0%, rgba(180,50,240,0.12) 100%)',
                          border: '1px solid rgba(0,212,212,0.2)',
                        }}
                      >
                        <Smartphone className="w-6 h-6" style={{ color: '#00d4d4' }} />
                      </div>
                      <div>
                        <p
                          className="text-[10px] font-black uppercase tracking-[0.22em] mb-1"
                          style={{ color: '#00d4d4' }}
                        >
                          Add to Home Screen
                        </p>
                        <h2 className="text-[18px] font-black tracking-tight leading-tight text-white">
                          Get the full Aura experience
                        </h2>
                        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          Instant access, no browser chrome, offline support.
                        </p>
                      </div>
                    </div>

                    {isIOS ? (
                      <div className="space-y-2.5">
                        <div
                          className="flex items-center gap-3 p-3.5 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(0,212,212,0.12)', border: '1px solid rgba(0,212,212,0.2)' }}
                          >
                            <Share className="w-4 h-4" style={{ color: '#00d4d4' }} />
                          </div>
                          <p className="text-[13px] text-white/75 leading-snug">
                            Tap <span className="font-bold text-white">Share</span> in Safari
                          </p>
                          <span className="text-[11px] font-black text-white/30 ml-auto shrink-0">1</span>
                        </div>
                        <div
                          className="flex items-center gap-3 p-3.5 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(0,212,212,0.12)', border: '1px solid rgba(0,212,212,0.2)' }}
                          >
                            <Plus className="w-4 h-4" style={{ color: '#00d4d4' }} />
                          </div>
                          <p className="text-[13px] text-white/75 leading-snug">
                            Select <span className="font-bold text-white">Add to Home Screen</span>
                          </p>
                          <span className="text-[11px] font-black text-white/30 ml-auto shrink-0">2</span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={remindLater}
                          className="w-full py-3.5 rounded-2xl text-[13px] font-black text-white/60"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          Remind me later
                        </motion.button>
                      </div>
                    ) : (
                      <div className="flex gap-2.5">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={remindLater}
                          className="flex-1 py-3.5 rounded-2xl text-[13px] font-black text-white/50"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          Remind me later
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleInstallAndroid}
                          className="flex-1 py-3.5 rounded-2xl text-[13px] font-black text-black"
                          style={{
                            background: 'linear-gradient(135deg, #00d4d4 0%, #0098db 100%)',
                            boxShadow: '0 4px 20px rgba(0,212,212,0.4)',
                          }}
                        >
                          Install
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="notify"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(240,0,184,0.12) 100%)',
                          border: '1px solid rgba(251,191,36,0.2)',
                        }}
                      >
                        <Bell className="w-6 h-6" style={{ color: '#fbbf24' }} />
                      </div>
                      <div>
                        <p
                          className="text-[10px] font-black uppercase tracking-[0.22em] mb-1"
                          style={{ color: '#fbbf24' }}
                        >
                          Stay on track
                        </p>
                        <h2 className="text-[18px] font-black tracking-tight leading-tight text-white">
                          Enable notifications
                        </h2>
                        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          Daily streak reminders and progress updates.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSkipNotify}
                        className="flex-1 py-3.5 rounded-2xl text-[13px] font-black text-white/50 flex items-center justify-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <BellOff className="w-4 h-4" />
                        Skip
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleNotify}
                        disabled={notifRequested}
                        className="flex-1 py-3.5 rounded-2xl text-[13px] font-black text-black flex items-center justify-center gap-2"
                        style={{
                          background: notifRequested
                            ? 'rgba(251,191,36,0.5)'
                            : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          boxShadow: notifRequested ? 'none' : '0 4px 20px rgba(251,191,36,0.35)',
                        }}
                      >
                        <Bell className="w-4 h-4" />
                        {notifRequested ? 'Enabling…' : 'Allow'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
