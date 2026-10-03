// src/components/Avatar.tsx
import type { Artist } from '@/lib/types';
/** 이미지를 쓰지 않으면 같은 크기의 빈 원(테두리만) */
export const Avatar = ({ artist }: { artist: Artist }) => (
  <span className="av">{artist.useAvatar && artist.avatarUrl && <img src={artist.avatarUrl} alt="" />}</span>
);
