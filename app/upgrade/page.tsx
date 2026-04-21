import type { Metadata } from 'next'
import UpgradeClient from './UpgradeClient'

export const metadata: Metadata = {
  title: 'Go Pro — AURA',
  description: 'Unlock unlimited practice sessions, all AI personas, and daily reels with AURA Pro.',
}

export default function UpgradePage() {
  return <UpgradeClient />
}
