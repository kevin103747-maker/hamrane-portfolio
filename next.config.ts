import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // 이미지 업로드(최대 4MB)가 서버 액션 기본 제한(1MB)에 걸리지 않게 합니다.
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  // 홈 폴더의 다른 package-lock.json과 헷갈리지 않도록 이 프로젝트 폴더를 루트로 고정합니다.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
