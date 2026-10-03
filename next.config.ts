import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 이미지 업로드(최대 4MB)가 서버 액션 기본 제한(1MB)에 걸리지 않게 합니다.
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default nextConfig;
