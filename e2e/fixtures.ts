export const e2eUsers = {
  admin: {
    email: "phase14.admin@example.test",
    password: "Phase14AdminPassword!",
    name: "Phase 14 Admin",
  },
  portal: {
    email: "phase14.portal@example.test",
    password: "Phase14PortalPassword!",
    name: "Phase 14 Portal User",
  },
} as const;

export const e2eCatalog = {
  organizationTypeCode: "E2E_ASSOCIATION",
  tariffGroupCode: "E2E_NON_PROFIT",
  organizationName: "E2E Testverein St. Valentin",
  buildingCode: "E2E_BUILDING",
  buildingName: "E2E Testgebaeude",
  roomCode: "E2E_ROOM",
  roomName: "E2E Testraum",
  usageTypeCode: "E2E_TRAINING",
  usageTypeName: "E2E Training",
} as const;
