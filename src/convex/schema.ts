import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ---------------------------------------------------------------------------
// Roles
// Version 1 supports Employees and Managers. Administrator management is out
// of scope for v1, so the literal exists for forward compatibility only.
// ---------------------------------------------------------------------------
export const ROLES = {
  EMPLOYEE: "employee",
  MANAGER: "manager",
  ADMIN: "admin",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.EMPLOYEE),
  v.literal(ROLES.MANAGER),
  v.literal(ROLES.ADMIN),
);
export type Role = Infer<typeof roleValidator>;

// ---------------------------------------------------------------------------
// Course categories
// Internal training is in-house and free, with half-day duration granularity.
// External courses and professional certifications are fee-paying and charged
// against the employee's annual training budget, counted in full days.
// ---------------------------------------------------------------------------
export const CATEGORIES = {
  INTERNAL: "internal_training",
  EXTERNAL: "external_course",
  CERTIFICATION: "professional_certification",
} as const;

export const categoryValidator = v.union(
  v.literal(CATEGORIES.INTERNAL),
  v.literal(CATEGORIES.EXTERNAL),
  v.literal(CATEGORIES.CERTIFICATION),
);
export type CourseCategory = Infer<typeof categoryValidator>;

// ---------------------------------------------------------------------------
// Application statuses
// pending   — submitted, awaiting a manager decision
// approved  — manager approved
// rejected  — manager rejected (reason required)
// withdrawn — employee pulled the application back while pending
// cancelled — employee cancelled an approved booking before it started
// ---------------------------------------------------------------------------
export const STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
  CANCELLED: "cancelled",
} as const;

export const statusValidator = v.union(
  v.literal(STATUSES.PENDING),
  v.literal(STATUSES.APPROVED),
  v.literal(STATUSES.REJECTED),
  v.literal(STATUSES.WITHDRAWN),
  v.literal(STATUSES.CANCELLED),
);
export type ApplicationStatus = Infer<typeof statusValidator>;

const statusHistoryEntry = v.object({
  status: statusValidator,
  at: v.number(),
  note: v.optional(v.string()),
  actorId: v.optional(v.id("users")),
});

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator),

      // Annual training entitlement (defaults applied when unset)
      annualTrainingBudget: v.optional(v.number()), // fee-paying budget, in $
      annualTrainingEntitlementDays: v.optional(v.number()), // training days per year
    })
      .index("email", ["email"]) // index for the email. do not remove or modify
      .index("by_role", ["role"]),

    // Course catalogue
    courses: defineTable({
      title: v.string(),
      description: v.string(),
      provider: v.optional(v.string()),
      category: categoryValidator,
      fee: v.number(), // 0 for internal training
      startDate: v.string(), // "YYYY-MM-DD"
      endDate: v.string(), // "YYYY-MM-DD"
      durationDays: v.number(), // whole days for external/cert, multiples of 0.5 for internal
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_active", ["isActive"])
      .index("by_category", ["category"]),

    // Course applications
    applications: defineTable({
      courseId: v.id("courses"),
      employeeId: v.id("users"),
      // Optional requested attendance dates; default to the course schedule.
      requestedStartDate: v.optional(v.string()), // "YYYY-MM-DD"
      requestedEndDate: v.optional(v.string()), // "YYYY-MM-DD"
      status: statusValidator,
      statusHistory: v.array(statusHistoryEntry),
      decidedBy: v.optional(v.id("users")),
      decidedAt: v.optional(v.number()),
      decisionReason: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_employee", ["employeeId"])
      .index("by_employee_status", ["employeeId", "status"])
      .index("by_course", ["courseId"])
      .index("by_status", ["status"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
