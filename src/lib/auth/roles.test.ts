import { describe, it, expect } from "vitest";
import { hasRole, hasAnyRole, hasAllRoles, isValidRole } from "./roles";
import { UserRole } from "@/types/auth";

describe("Server-Side Role Authorization", () => {
  it("correctly identifies valid AgroMarket roles", () => {
    expect(isValidRole("BUYER")).toBe(true);
    expect(isValidRole("FARMER")).toBe(true);
    expect(isValidRole("BUSINESS")).toBe(true);
    expect(isValidRole("ADMIN")).toBe(true);
    expect(isValidRole("RANDOM_ROLE")).toBe(false);
  });

  describe("hasRole", () => {
    it("returns true when user holds the required role", () => {
      const userRoles: UserRole[] = ["BUYER", "FARMER"];
      expect(hasRole(userRoles, "FARMER")).toBe(true);
      expect(hasRole(userRoles, "BUYER")).toBe(true);
      expect(hasRole(userRoles, "EQUIPMENT_OWNER")).toBe(false);
    });

    it("grants access to ADMIN across any required role", () => {
      const adminRoles: UserRole[] = ["ADMIN"];
      expect(hasRole(adminRoles, "FARMER")).toBe(true);
      expect(hasRole(adminRoles, "EXPERT")).toBe(true);
      expect(hasRole(adminRoles, "BUYER")).toBe(true);
    });

    it("handles empty or null roles safely without crashing", () => {
      expect(hasRole([], "BUYER")).toBe(false);
      expect(hasRole(null, "BUYER")).toBe(false);
      expect(hasRole(undefined, "BUYER")).toBe(false);
    });
  });

  describe("hasAnyRole", () => {
    it("returns true if user has at least one matching role", () => {
      const userRoles: UserRole[] = ["SERVICE_PROVIDER", "FARMER"];
      expect(hasAnyRole(userRoles, ["EXPERT", "FARMER"])).toBe(true);
      expect(hasAnyRole(userRoles, ["ADMIN", "JOB_SEEKER"])).toBe(false);
    });
  });

  describe("hasAllRoles", () => {
    it("returns true only when user has all requested roles", () => {
      const userRoles: UserRole[] = ["FARMER", "EQUIPMENT_OWNER", "BUYER"];
      expect(hasAllRoles(userRoles, ["FARMER", "EQUIPMENT_OWNER"])).toBe(true);
      expect(hasAllRoles(userRoles, ["FARMER", "BUSINESS"])).toBe(false);
    });

    it("allows ADMIN to satisfy all role requirements", () => {
      expect(hasAllRoles(["ADMIN"], ["FARMER", "BUSINESS", "EXPERT"])).toBe(true);
    });
  });
});
