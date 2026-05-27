export type RoomCompositionLink = {
  parentRoomId: string;
  childRoomId: string;
};

export function validateRoomCompositionChain(
  roomId: string,
  parentRoomId: string,
  existingLinks: RoomCompositionLink[],
) {
  const parentByChild = new Map(
    existingLinks
      .filter((link) => link.childRoomId !== roomId)
      .map((link) => [link.childRoomId, link.parentRoomId]),
  );

  const visited = new Set([roomId]);
  let currentRoomId: string | undefined = parentRoomId;

  while (currentRoomId) {
    if (visited.has(currentRoomId)) {
      throw new Error("Die Parent-Room-Zuordnung darf keinen Zyklus bilden.");
    }

    visited.add(currentRoomId);
    currentRoomId = parentByChild.get(currentRoomId);
  }
}
