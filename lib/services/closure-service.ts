export type ClosureTarget = {
  buildingId?: string | null;
  roomId?: string | null;
};

export function validateClosureTarget({ buildingId, roomId }: ClosureTarget) {
  const targets = [buildingId, roomId].filter((value): value is string => Boolean(value));

  if (targets.length !== 1) {
    throw new Error("A closure must reference exactly one building or one room.");
  }
}
