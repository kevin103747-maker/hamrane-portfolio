// src/app/icon.tsx — 브라우저 탭 아이콘
import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c0c0e',
          color: '#f4f4f5',
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}
