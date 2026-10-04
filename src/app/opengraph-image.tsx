// src/app/opengraph-image.tsx — 링크 공유 미리보기 이미지(빌드 시 PNG로 생성)
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const alt = 'HamRanè — Composer & Music Producer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadLogo() {
  try {
    const buf = await readFile(path.join(process.cwd(), 'src/app/icon.png'));
    return `data:image/png;base64,${buf.toString('base64')}`;
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
          alignItems: 'center',
          padding: '0 96px',
          background: 'linear-gradient(135deg, #0f1715 0%, #131d1a 55%, #1a2421 100%)',
          color: '#eef3ef',
        }}
      >
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={280} height={280} alt="" style={{ marginRight: 72 }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 6, color: '#86efac' }}>
            COMPOSER &amp; MUSIC PRODUCER
          </div>
          <div style={{ display: 'flex', fontSize: logo ? 120 : 148, fontWeight: 700, marginTop: 16, letterSpacing: -4 }}>
            HamRanè
          </div>
          <div style={{ display: 'flex', width: 120, height: 4, background: '#86efac', marginTop: 32 }} />
          <div style={{ display: 'flex', fontSize: 30, color: '#a9b8b0', marginTop: 32 }}>
            Portfolio · Pricing · Contact
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
