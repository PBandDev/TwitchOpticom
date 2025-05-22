import { TWITCH_CLIENT_ID } from "@/config";
import type { Channel, SearchResult, TrackedChannel } from "@/lib/types";
import { arrayMove } from "@dnd-kit/sortable";
import { type QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { ApiClient, type HelixChannelSearchResult } from "@twurple/api";
import { StaticAuthProvider } from "@twurple/auth";
import { useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

// --- Schemas ---
const TrackedChannelSchema = z.object({
  id: z.string(),
  displayName: z.string(),
});

export const MAX_CHANNELS_MESSAGE =
  "You can track a maximum of 100 channels." as const;
export const TrackedChannelsSchema = z
  .array(TrackedChannelSchema)
  .max(100, { message: MAX_CHANNELS_MESSAGE });

// --- Constants ---
export const MIN_CHANNEL_SEARCH_QUERY_LENGTH = 2;

// --- Query Keys ---
export const queryKeys = {
  all: ["all"] as const,
  auth: () => ["auth"] as const,
  token: () => [...queryKeys.auth(), "token"] as const,
  user: () => [...queryKeys.auth(), "user"] as const,
  trackedChannels: () => ["trackedChannels"] as const,
  channelSearch: (searchTerm: string) => ["channelSearch", searchTerm] as const,
  channelStatus: (trackedChannels: TrackedChannel[]) =>
    [
      "channelStatus",
      trackedChannels
        .map((c) => c.id)
        .sort()
        .join(","),
    ] as const,
};

// --- Hooks for Queries & Mutations ---

// Hook for fetching and polling live status of tracked channels
interface UseChannelStatusOptions {
  trackedChannels: TrackedChannel[];
  accessToken: string | null;
}

export function useChannelStatus({
  trackedChannels,
  accessToken,
}: UseChannelStatusOptions) {
  return useQuery<Record<string, Channel>, Error>({
    queryKey: queryKeys.channelStatus(trackedChannels),
    queryFn: async () => {
      if (!accessToken || trackedChannels.length === 0 || !TWITCH_CLIENT_ID) {
        return {};
      }

      const authProvider = new StaticAuthProvider(
        TWITCH_CLIENT_ID,
        accessToken,
      );
      const apiClient = new ApiClient({ authProvider });

      const ids = trackedChannels.map((c) => c.id);
      // Fetch streams and users in parallel
      const [streams, users] = await Promise.all([
        apiClient.streams.getStreamsByUserIds(ids),
        apiClient.users.getUsersByIds(ids),
      ]);

      const usersMap = new Map(users.map((u) => [u.id, u]));

      const statusMap: Record<string, Channel> = {};
      for (const trackedItem of trackedChannels) {
        // Renamed to avoid conflict with Channel type
        const stream = streams.find((s) => s.userId === trackedItem.id);
        const user = usersMap.get(trackedItem.id);
        statusMap[trackedItem.id] = {
          id: trackedItem.id,
          displayName: trackedItem.displayName,
          isOnline: !!stream,
          viewerCount: stream ? stream.viewers : null,
          profilePictureUrl: user?.profilePictureUrl, // Get profile picture
        };
      }
      return statusMap;
    },
    enabled: trackedChannels.length > 0 && !!accessToken && !!TWITCH_CLIENT_ID,
    staleTime: 0,
    refetchInterval: 10 * 1000, // 10 seconds
  });
}

// Hook for searching Twitch channels
interface UseChannelSearchOptions {
  searchTerm: string;
  accessToken: string | null;
}
export function useChannelSearch({
  searchTerm,
  accessToken,
}: UseChannelSearchOptions) {
  const apiClient = useMemo(() => {
    if (!accessToken || !TWITCH_CLIENT_ID) return null;
    const provider = new StaticAuthProvider(TWITCH_CLIENT_ID, accessToken);
    return new ApiClient({ authProvider: provider });
  }, [accessToken]);

  return useQuery<SearchResult[], Error>({
    queryKey: queryKeys.channelSearch(searchTerm),
    queryFn: async () => {
      if (!apiClient || searchTerm.length < MIN_CHANNEL_SEARCH_QUERY_LENGTH) {
        return [];
      }
      const searchResponse = await apiClient.search.searchChannels(searchTerm);

      if (!searchResponse.data.length) return [];

      // Get user details for profile pictures
      const userIds = searchResponse.data.map((c) => c.id);
      const users = await apiClient.users.getUsersByIds(userIds);
      const usersMap = new Map(users.map((u) => [u.id, u]));

      return searchResponse.data.map((c: HelixChannelSearchResult) => {
        const user = usersMap.get(c.id);
        return {
          id: c.id,
          displayName: c.displayName,
          isOnline: c.isLive,
          viewerCount: null, // Not available from search, keep null
          profilePictureUrl: user?.profilePictureUrl ?? c.thumbnailUrl, // Fallback to thumbnail if user fetch failed for some reason
        };
      });
    },
    enabled:
      !!apiClient && searchTerm.length >= MIN_CHANNEL_SEARCH_QUERY_LENGTH,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for managing tracked channels (localStorage persistence is handled by TanStack Persister)
export function useTrackedChannelsPersistence(queryClient: QueryClient) {
  const { data: trackedChannels = [] } = useQuery<TrackedChannel[], Error>({
    queryKey: queryKeys.trackedChannels(),
    queryFn: () => {
      const channels =
        queryClient.getQueryData<TrackedChannel[]>(
          queryKeys.trackedChannels(),
        ) ?? [];
      try {
        return TrackedChannelsSchema.parse(channels);
      } catch (error) {
        console.error("Invalid tracked channels in cache:", error);
        return [];
      }
    },
    staleTime: Number.POSITIVE_INFINITY, // Data is persisted, no need to refetch from a server
  });

  const addChannelMutation = useMutation<
    TrackedChannel[],
    Error,
    TrackedChannel,
    { previousChannels?: TrackedChannel[] }
  >({
    mutationFn: async (newChannel: TrackedChannel) => {
      const validatedChannel = TrackedChannelSchema.parse(newChannel);
      const currentChannels =
        queryClient.getQueryData<TrackedChannel[]>(
          queryKeys.trackedChannels(),
        ) ?? [];

      if (currentChannels.some((c) => c.id === validatedChannel.id)) {
        // Return currentChannels to indicate no change / already exists
        return currentChannels;
      }

      if (currentChannels.length >= 100) {
        throw new Error(MAX_CHANNELS_MESSAGE);
      }

      const updatedChannels = [validatedChannel, ...currentChannels];
      TrackedChannelsSchema.parse(updatedChannels);
      return updatedChannels;
    },
    onMutate: async (newChannel) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.trackedChannels(),
      });
      const previousChannels = queryClient.getQueryData<TrackedChannel[]>(
        queryKeys.trackedChannels(),
      );
      queryClient.setQueryData<TrackedChannel[]>(
        queryKeys.trackedChannels(),
        (old = []) => {
          if (old.some((c) => c.id === newChannel.id)) return old;
          if (old.length >= 100) return old; // Prevent optimistic update if limit reached

          const updated = [newChannel, ...old];
          try {
            TrackedChannelsSchema.parse(updated); // Validate optimistic update
            return updated;
          } catch (e) {
            return old; // Revert if optimistic update is invalid
          }
        },
      );
      return { previousChannels };
    },
    onSuccess: (data, newChannel, context) => {
      const previousChannels = context?.previousChannels ?? [];
      if (data.length > previousChannels.length) {
        toast.success(`Channel "${newChannel.displayName}" added.`);
      } else if (data.some((c) => c.id === newChannel.id)) {
        toast.info(`Channel "${newChannel.displayName}" is already tracked.`);
      }
      // No explicit else, as other cases (like limit reached) are handled by onError.
    },
    onError: (error, newChannel, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(
          queryKeys.trackedChannels(),
          context.previousChannels,
        );
      }
      if (error.message === MAX_CHANNELS_MESSAGE) {
        toast.error(error.message);
      } else {
        toast.error(`Failed to add channel "${newChannel.displayName}".`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trackedChannels() });
    },
  });

  const removeChannelMutation = useMutation<
    TrackedChannel[],
    Error,
    { channelId: string; displayName?: string }, // Pass displayName for toast
    { previousChannels?: TrackedChannel[] }
  >({
    mutationFn: async ({ channelId }) => {
      const currentChannels =
        queryClient.getQueryData<TrackedChannel[]>(
          queryKeys.trackedChannels(),
        ) ?? [];
      const updatedChannels = currentChannels.filter((c) => c.id !== channelId);
      return updatedChannels;
    },
    onMutate: async ({ channelId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.trackedChannels(),
      });
      const previousChannels = queryClient.getQueryData<TrackedChannel[]>(
        queryKeys.trackedChannels(),
      );
      queryClient.setQueryData<TrackedChannel[]>(
        queryKeys.trackedChannels(),
        (old = []) => old.filter((c) => c.id !== channelId),
      );
      return { previousChannels };
    },
    onSuccess: (_data, variables, _context) => {
      const channelName = variables.displayName
        ? `"${variables.displayName}"`
        : "channel";
      toast.success(`Successfully removed ${channelName}.`);
    },
    onError: (_error, variables, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(
          queryKeys.trackedChannels(),
          context.previousChannels,
        );
      }
      const channelName = variables.displayName
        ? `"${variables.displayName}"`
        : "channel";
      toast.error(`Failed to remove ${channelName}.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trackedChannels() });
    },
  });

  const reorderChannelsMutation = useMutation<
    TrackedChannel[], // Type of data returned by mutationFn
    Error, // Type of error
    { activeId: string; overId: string }, // Type of variables passed to mutationFn
    { previousChannels?: TrackedChannel[] } // Type of context
  >({
    mutationFn: async ({ activeId, overId }) => {
      const currentChannels =
        queryClient.getQueryData<TrackedChannel[]>(
          queryKeys.trackedChannels(),
        ) ?? [];
      const oldIndex = currentChannels.findIndex((c) => c.id === activeId);
      const newIndex = currentChannels.findIndex((c) => c.id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return currentChannels; // No change needed or invalid IDs
      }

      const updatedChannels = arrayMove(currentChannels, oldIndex, newIndex);
      TrackedChannelsSchema.parse(updatedChannels); // Validate before returning
      return updatedChannels;
    },
    onMutate: async ({ activeId, overId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.trackedChannels(),
      });
      const previousChannels = queryClient.getQueryData<TrackedChannel[]>(
        queryKeys.trackedChannels(),
      );
      queryClient.setQueryData<TrackedChannel[]>(
        queryKeys.trackedChannels(),
        (old = []) => {
          const oldIndex = old.findIndex((c) => c.id === activeId);
          const newIndex = old.findIndex((c) => c.id === overId);
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
            return old;
          }
          const updated = arrayMove(old, oldIndex, newIndex);
          try {
            TrackedChannelsSchema.parse(updated); // Validate optimistic update
            return updated;
          } catch (e) {
            return old; // Revert if optimistic update is invalid
          }
        },
      );
      return { previousChannels };
    },
    onError: (error, _variables, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(
          queryKeys.trackedChannels(),
          context.previousChannels,
        );
      }
      toast.error("Failed to reorder channels.");
      console.error("Reorder error:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trackedChannels() });
    },
  });

  return {
    trackedChannels,
    addChannel: (
      channel: TrackedChannel,
      // Options are now handled by the mutation's own callbacks for toasts
    ) => addChannelMutation.mutate(channel),
    removeChannel: (channelId: string, displayName?: string) =>
      removeChannelMutation.mutate({ channelId, displayName }),
    isAddingChannel: addChannelMutation.isPending,
    isRemovingChannel: removeChannelMutation.isPending,
    reorderChannels: (variables: { activeId: string; overId: string }) =>
      reorderChannelsMutation.mutate(variables),
  };
}
