// src/app/opengraph-image.tsx — 링크 공유 미리보기 이미지(빌드 시 PNG로 생성)
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const alt = 'HamRanè — Composer & Music Producer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BOX = { w: 760, h: 260 }; // 로고가 들어갈 최대 영역(px)

async function loadLogo() {
  try {
    const buf = await readFile(path.join(process.cwd(), 'public/logo-on-dark.png'));
    // PNG 파일 헤더에 가로(16~19바이트)·세로(20~23바이트) 크기가 들어 있습니다.
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (!w || !h) return null;
    const k = Math.min(BOX.w / w, BOX.h / h);
    return {
      src: `data:image/png;base64,${buf.toString('base64')}`,
      width: Math.round(w * k),
      height: Math.round(h * k),
    };
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const logo = await loadLogo();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f1715 0%, #131d1a 55%, #1a2421 100%)',
          color: '#eef3ef',
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.src} width={logo.width} height={logo.height} alt="" />
        ) : (
          <div style={{ display: 'flex', fontSize: 148, fontWeight: 700, letterSpacing: -4 }}>HamRanè</div>
        )}
        <div style={{ display: 'flex', width: 120, height: 4, background: '#86efac', marginTop: 44 }} />
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 8, color: '#86efac', marginTop: 36 }}>
          COMPOSER &amp; MUSIC PRODUCER
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#a9b8b0', marginTop: 20 }}>
          Portfolio · Pricing · Contact
        </div>
      </div>
    ),
    { ...size },
  );
}
