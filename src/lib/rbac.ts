import type { UserRole } from "@/shared/types/domain";

export const APP_ROLES: ReadonlyArray<UserRole> = [
  "admin",
  "manager",
  "dispatcher",
  "accountant",
  "driver",
  "viewer",
];

export const DEFAULT_ROLE: UserRole = "viewer";

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && APP_ROLES.includes(value as UserRole);
}

export function normalizeUserRole(value: unknown): UserRole {
  if (isUserRole(value)) {
    return value;
  }
  return DEFAULT_ROLE;
}
