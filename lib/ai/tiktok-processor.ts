/**
 * tiktok-processor.ts
 *
 * @deprecated All functionality has been moved to video-processor.ts
 * This file is kept for backwards compatibility with any remaining imports.
 * Do NOT add new code here — use video-processor.ts directly.
 */

export type {
  ShortVideoContext as FullTikTokContext,
  ShortVideoPlatform,
} from '@/lib/ai/video-processor';

export { processTikTokMultimodal, processShortVideo } from '@/lib/ai/video-processor';
