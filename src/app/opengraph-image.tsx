// src/app/opengraph-image.tsx — 링크 공유 미리보기 이미지(빌드 시 PNG로 생성)
import { ImageResponse } from 'next/og';

export const alt = 'HamRanè — Composer & Music Producer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 96px',
          background: 'linear-gradient(135deg, #0c0c0e 0%, #17171b 55%, #26262d 100%)',
          color: '#f4f4f5',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 8, color: '#a1a1aa' }}>
          COMPOSER &amp; MUSIC PRODUCER
        </div>
        <div style={{ display: 'flex', fontSize: 148, fontWeight: 700, marginTop: 16, letterSpacing: -4 }}>
          HamRanè
        </div>
        <div style={{ display: 'flex', width: 120, height: 4, background: '#f4f4f5', marginTop: 36, opacity: 0.8 }} />
        <div style={{ display: 'flex', fontSize: 30, color: '#a1a1aa', marginTop: 36 }}>
          Portfolio · Pricing · Contact
        </div>
      </div>
    ),
    { ...size },
  );
}
