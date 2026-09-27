import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { roleValidator, ROLES } from "./schema";

export const DEFAULT_ANNUAL_BUDGET = 3000; // USD per year for fee-paying courses
export const DEFAULT_ENTITLEMENT_DAYS = 10; // training days per year

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * Bootstrap the CATS profile for a newly signed-up user.
 *
 * The user picks Employee or Manager at sign-up (Administrator management is a
 * later version). Existing profiles are left untouched, so signing in again
 * never resets a role or entitlement. Applies the company default annual
 * training budget and day entitlement.
 */
export const ensureProfile = mutation({
  args: { role: roleValidator },
  handler: async (ctx, { role }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Signed-in user record not found.");

    // Already has a profile — keep it exactly as it is.
    if (user.role) return user.role;

    await ctx.db.patch(userId, {
      role,
      annualTrainingBudget:
        user.annualTrainingBudget ?? DEFAULT_ANNUAL_BUDGET,
      annualTrainingEntitlementDays:
        user.annualTrainingEntitlementDays ?? DEFAULT_ENTITLEMENT_DAYS,
    });
    return role;
  },
});

/** True when the current user holds the manager role (admin included). */
export const isManager = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const user = await ctx.db.get(userId);
    return user?.role === ROLES.MANAGER || user?.role === ROLES.ADMIN;
  },
});
