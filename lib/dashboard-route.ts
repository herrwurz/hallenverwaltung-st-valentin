const adminRoles = new Set(["SUPER_ADMIN", "MUNICIPAL_ADMIN"]);
const portalRoles = new Set(["ORGANIZATION", "VHS", "SCHOOL", "FACILITY_MANAGER", "CARETAKER"]);

export function getDashboardRoute(roles: string[]) {
  if (roles.some((role) => adminRoles.has(role))) {
    return "/admin";
  }

  if (roles.some((role) => portalRoles.has(role))) {
    return "/portal";
  }

  return "/public";
}
