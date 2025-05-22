import ChannelListItem from "@/components/ChannelListItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrackedChannels } from "@/hooks/useTrackedChannels";
import { useChannelStatus } from "@/integrations/tanstack-query/queries";
import type {
  Channel as ChannelData,
  TrackedChannel as ChannelInfoFromHook,
} from "@/lib/types";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSwappingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

interface ChannelListProps {
  accessToken: string | null;
}

export default function ChannelList({ accessToken }: ChannelListProps) {
  const { trackedChannels, removeChannel, reorderChannels } =
    useTrackedChannels();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    data: statusMap = {},
    isLoading,
    error,
  } = useChannelStatus({
    trackedChannels: trackedChannels as ChannelInfoFromHook[],
    accessToken,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderChannels(active.id as string, over.id as string);
    }
  };

  if (trackedChannels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] text-center">
        <img
          src="/saitama.png"
          alt="Saitama from One Punch Man indicating no channels"
          className="w-48 h-48 object-contain mb-6"
        />
        <h2 className="text-2xl font-semibold mb-2">No Channels... Yet!</h2>
        <p className="text-muted-foreground">
          Looks like you haven't added any Twitch channels to track.
        </p>
      </div>
    );
  }

  if (isLoading && trackedChannels.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {trackedChannels.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-md border p-3 h-[62px] bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-[32px] h-[32px] rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-sm text-destructive">
        Error loading channel statuses: {error.message}
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={trackedChannels.map((c) => c.id)}
        strategy={rectSwappingStrategy}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {trackedChannels.map((c: ChannelInfoFromHook) => {
            const channelData = statusMap[c.id];
            if (!channelData) {
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border p-3 h-[62px] bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-[32px] h-[32px] rounded-full flex-shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24 rounded" />
                      <p className="text-sm text-muted-foreground mt-1.5">
                        Loading status...
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <ChannelListItem
                key={c.id}
                channel={channelData as ChannelData}
                onRemove={removeChannel}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
