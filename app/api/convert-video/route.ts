import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 200 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 200MB)' }, { status: 413 });
  }

  const webmBuffer = Buffer.from(await req.arrayBuffer());
  const id = randomUUID();
  const inputPath = join(tmpdir(), `${id}.webm`);
  const outputPath = join(tmpdir(), `${id}.mp4`);

  try {
    await writeFile(inputPath, webmBuffer);

    await new Promise<void>((resolve, reject) => {
      execFile('ffmpeg', [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-profile:v', 'high',
        '-level', '4.1',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-y',
        outputPath,
      ], { maxBuffer: 10 * 1024 * 1024 }, (error, _stdout, stderr) => {
        if (error) {
          console.error('[convert-video] ffmpeg error:', stderr);
          reject(error);
        } else {
          resolve();
        }
      });
    });

    const mp4Buffer = await readFile(outputPath);

    return new NextResponse(mp4Buffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="aura-reel.mp4"`,
        'Content-Length': String(mp4Buffer.byteLength),
      },
    });
  } catch (err) {
    const { captureException } = await import('@sentry/nextjs');
    captureException(err, { extra: { route: '/api/convert-video' } });
    console.error('[convert-video]', err);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
