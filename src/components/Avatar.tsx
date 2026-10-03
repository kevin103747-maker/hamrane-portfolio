// src/components/Avatar.tsx
import type { Artist } from '@/lib/types';
/** 프로필 이미지가 있을 때만 그립니다. 없으면 아무것도 그리지 않아 이름만 보입니다. */
export const Avatar = ({ artist }: { artist: Artist }) =>
  artist.useAvatar && artist.avatarUrl ? (
    <span className="av"><img src={artist.avatarUrl} alt="" /></span>
  ) : null;
