import type { NextConfig } from 'next';
import path from 'node:path';

// 영어 사이트 공개 여부. src/lib/i18n.ts의 EN_LIVE와 같은 환경변수입니다.
const EN_LIVE = process.env.NEXT_PUBLIC_EN_LIVE === '1';

const nextConfig: NextConfig = {
  experimental: {
    // 이미지 업로드(최대 4MB)가 서버 액션 기본 제한(1MB)에 걸리지 않게 합니다.
    serverActions: { bodySizeLimit: '5mb' },
    // 루트 레이아웃이 여럿(한국어·영어·어드민)이라 전체 404 화면을 따로 지정합니다.
    globalNotFound: true,
  },
  // 홈 폴더의 다른 package-lock.json과 헷갈리지 않도록 이 프로젝트 폴더를 루트로 고정합니다.
  turbopack: { root: path.resolve(__dirname) },
  // 영어 공개 전에는 /en 주소로 들어와도 같은 한국어 페이지로 보냅니다. (임시 이동)
  async redirects() {
    return EN_LIVE ? [] : [{ source: '/en/:path*', destination: '/:path*', permanent: false }];
  },
};

export default nextConfig;
