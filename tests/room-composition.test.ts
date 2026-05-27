import assert from "node:assert/strict";
import test from "node:test";
import { validateRoomCompositionChain } from "../lib/services/admin/room-composition";

test("accepts a new multi-stage parent chain without a cycle", () => {
  assert.doesNotThrow(() =>
    validateRoomCompositionChain("room-c", "room-b", [
      { parentRoomId: "room-a", childRoomId: "room-b" },
    ]),
  );
});

test("rejects a cycle through an existing multi-stage parent chain", () => {
  assert.throws(
    () =>
      validateRoomCompositionChain("room-a", "room-c", [
        { parentRoomId: "room-a", childRoomId: "room-b" },
        { parentRoomId: "room-b", childRoomId: "room-c" },
      ]),
    /keinen Zyklus/,
  );
});

test("ignores the prior direct parent when replacing an assignment", () => {
  assert.doesNotThrow(() =>
    validateRoomCompositionChain("room-c", "room-d", [
      { parentRoomId: "room-b", childRoomId: "room-c" },
      { parentRoomId: "room-a", childRoomId: "room-d" },
    ]),
  );
});
