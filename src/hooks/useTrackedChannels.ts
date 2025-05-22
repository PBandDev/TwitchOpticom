import {
  MAX_CHANNELS_MESSAGE,
  TrackedChannelsSchema,
  useTrackedChannelsPersistence,
} from "@/integrations/tanstack-query/queries";
import type { TrackedChannel } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

/**
 * @description Hook for managing tracked channels with TanStack Query persistence
 * @returns {Object} Object containing tracked channels, addChannel, and removeChannel functions
 */
export function useTrackedChannels() {
  const queryClient = useQueryClient();
  const {
    trackedChannels,
    addChannel: addChannelMutation,
    removeChannel: removeChannelMutation,
    isAddingChannel,
    isRemovingChannel,
    reorderChannels: reorderChannelsMutation,
  } = useTrackedChannelsPersistence(queryClient);

  const addChannel = (channel: TrackedChannel) => {
    addChannelMutation(channel);
  };

  const removeChannel = (channelId: string, displayName?: string) => {
    removeChannelMutation(channelId, displayName);
  };

  const reorderChannels = (activeId: string, overId: string) => {
    reorderChannelsMutation({ activeId, overId });
  };

  return {
    trackedChannels,
    addChannel,
    removeChannel,
    reorderChannels,
    isAddingChannel,
    isRemovingChannel,
    TrackedChannelsSchema,
    MAX_CHANNELS_MESSAGE,
  };
}
