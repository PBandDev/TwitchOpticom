import type { HelixUser } from "@twurple/api";

export interface Channel extends Pick<HelixUser, "id" | "displayName"> {
  /** Indicates whether the channel is currently live. */
  isOnline: boolean;
  /** Live viewer count when the channel is online, otherwise `null`. */
  viewerCount: number | null;
  /** Optional ordering index used for reordering in the UI */
  order?: number;
  /** URL of the channel's profile picture. */
  profilePictureUrl?: string;
}

/**
 * Minimal structure returned by the Twitch search endpoint that is used by the combobox.
 */
export interface SearchResult extends Pick<HelixUser, "id" | "displayName"> {
  isOnline: boolean;
  viewerCount: number | null;
  profilePictureUrl: string;
}

export interface TrackedChannel {
  id: string;
  displayName: string;
}
