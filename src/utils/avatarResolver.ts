// Avatar resolver utility - maps database avatar URLs to actual imported assets
// This is needed because Vite hashes asset paths, so we need to use ES6 imports

import pokerAvatar1 from "@/assets/avatars/poker-avatar-1.png";
import pokerAvatar2 from "@/assets/avatars/poker-avatar-2.png";
import pokerAvatar3 from "@/assets/avatars/poker-avatar-3.png";
import pokerAvatar4 from "@/assets/avatars/poker-avatar-4.png";
import pokerAvatar5 from "@/assets/avatars/poker-avatar-5.png";
import pokerAvatar6 from "@/assets/avatars/poker-avatar-6.png";
import pokerAvatar7 from "@/assets/avatars/poker-avatar-7.png";
import pokerAvatar8 from "@/assets/avatars/poker-avatar-8.png";
import pokerAvatar9 from "@/assets/avatars/poker-avatar-9.png";
import pokerAvatar10 from "@/assets/avatars/poker-avatar-10.png";
import pokerAvatar11 from "@/assets/avatars/poker-avatar-11.png";
import pokerAvatar12 from "@/assets/avatars/poker-avatar-12.png";
import pokerAvatar13 from "@/assets/avatars/poker-avatar-13.png";
import pokerAvatar14 from "@/assets/avatars/poker-avatar-14.png";
import pokerAvatar15 from "@/assets/avatars/poker-avatar-15.png";
import pokerAvatar16 from "@/assets/avatars/poker-avatar-16.png";
import pokerAvatar17 from "@/assets/avatars/poker-avatar-17.png";
import pokerAvatar18 from "@/assets/avatars/poker-avatar-18.png";
import pokerAvatar19 from "@/assets/avatars/poker-avatar-19.png";
import pokerAvatar20 from "@/assets/avatars/poker-avatar-20.png";
import pokerAvatar21 from "@/assets/avatars/poker-avatar-21.png";
import pokerAvatar22 from "@/assets/avatars/poker-avatar-22.png";
import pokerAvatar23 from "@/assets/avatars/poker-avatar-23.png";
import pokerAvatar24 from "@/assets/avatars/poker-avatar-24.png";

// Map of avatar number to imported asset
const AVATAR_MAP: Record<number, string> = {
  1: pokerAvatar1,
  2: pokerAvatar2,
  3: pokerAvatar3,
  4: pokerAvatar4,
  5: pokerAvatar5,
  6: pokerAvatar6,
  7: pokerAvatar7,
  8: pokerAvatar8,
  9: pokerAvatar9,
  10: pokerAvatar10,
  11: pokerAvatar11,
  12: pokerAvatar12,
  13: pokerAvatar13,
  14: pokerAvatar14,
  15: pokerAvatar15,
  16: pokerAvatar16,
  17: pokerAvatar17,
  18: pokerAvatar18,
  19: pokerAvatar19,
  20: pokerAvatar20,
  21: pokerAvatar21,
  22: pokerAvatar22,
  23: pokerAvatar23,
  24: pokerAvatar24,
};

/**
 * Resolves an avatar URL from the database to the actual Vite-imported asset path
 * 
 * @param avatarUrl - The avatar URL from the database (can be null/undefined)
 * @param fallbackPlayerId - Player ID to generate a deterministic fallback avatar
 * @returns The resolved avatar URL that works in the current build
 */
export function resolveAvatarUrl(avatarUrl: string | null | undefined, fallbackPlayerId?: string): string {
  // If no avatar URL provided, generate a fallback
  if (!avatarUrl) {
    return getDefaultAvatar(fallbackPlayerId);
  }
  
  // If it's a full external URL (Supabase storage, Telegram, etc.), use it directly
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // If it's a Telegram SVG URL
  if (avatarUrl.startsWith('https://t.me/')) {
    return avatarUrl;
  }
  
  // Extract avatar number from paths like:
  // - /assets/poker-avatar-10-C9wYQiw9.png (Vite hashed)
  // - /src/assets/avatars/poker-avatar-10.png (dev path)
  // - poker-avatar-10.png
  const match = avatarUrl.match(/poker-avatar-(\d+)/);
  if (match) {
    const avatarNumber = parseInt(match[1], 10);
    if (avatarNumber >= 1 && avatarNumber <= 24 && AVATAR_MAP[avatarNumber]) {
      return AVATAR_MAP[avatarNumber];
    }
  }
  
  // Fallback - return the original URL (might work for other cases)
  return avatarUrl;
}

/**
 * Gets a deterministic default avatar based on player ID or a random one
 */
export function getDefaultAvatar(playerId?: string): string {
  if (playerId) {
    // Use player ID to generate consistent avatar
    const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const avatarNumber = (hash % 24) + 1;
    return AVATAR_MAP[avatarNumber] || pokerAvatar1;
  }
  
  // Random avatar
  const randomNumber = Math.floor(Math.random() * 24) + 1;
  return AVATAR_MAP[randomNumber] || pokerAvatar1;
}

/**
 * Gets all available poker avatars
 */
export function getAllAvatars(): string[] {
  return Object.values(AVATAR_MAP);
}

/**
 * Gets a specific avatar by number (1-24)
 */
export function getAvatarByNumber(num: number): string {
  return AVATAR_MAP[num] || pokerAvatar1;
}
