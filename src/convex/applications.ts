import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import { v } from "convex/values";
import { ROLES, STATUSES, CATEGORIES, statusValidator } from "./schema";
import type { Doc, Id } from "./_generated/dataModel";

type MutationCtx = GenericMutationCtx<DataModel>;
type QueryCtx = GenericQueryCtx<DataModel>;

// ---------------------------------------------------------------------------
// Status machine (v1)
//   pending -> approved | rejected (manager decision, reason required)
//   pending -> withdrawn (employee pulls it back)
//   approved -> cancelled (employee cancels before the course starts)
// ---------------------------------------------------------------------------

/** Checkpoint of today in a local YYYY-MM-DD form for date comparisons. */
function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function pushHistory(
  entries: Doc<"applications">["statusHistory"],
  status: Doc<"applications">["status"],
  at: number,
  note?: string,
  actorId?: Id<"users">,
): Doc<"applications">["statusHistory"] {
  const entry: {
    status: Doc<"applications">["status"];
    at: number;
    note?: string;
    actorId?: Id<"users">;
  } = { status, at };
  if (note !== undefined) entry.note = note;
  if (actorId !== undefined) entry.actorId = actorId;
  entries.push(entry);
  return entries;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate the requested attendance dates for an application:
 * valid format, end >= start, and inside the course's scheduled window.
 */
function validateRequestedDates(
  course: Doc<"courses">,
  startDate: string,
  endDate: string,
): void {
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    throw new Error("Dates must be in YYYY-MM-DD format.");
  }
  if (endDate < startDate) {
    throw new Error("The end date must be on or after the start date.");
  }
  if (startDate < course.startDate || endDate > course.endDate) {
    throw new Error(
      `Requested dates must fall within the course window (${course.startDate} to ${course.endDate}).`,
    );
  }
}

/**
 * Business layer shared by apply/approve: validates course category state,
 * course dates, training entitlement (days/year) and budget eligibility
 * (fee-paying categories only). Throws with a clear message on any violation.
 */
async function validateForSubmission(
  ctx: MutationCtx,
  employee: Doc<"users">,
  course: Doc<"courses">,
  opts: { currentApplicationId?: Id<"applications"> } = {},
): Promise<void> {
  if (!course.isActive) {
    throw new Error("This course is no longer available.");
  }

  // Course dates: must still be open.
  const today = todayISO();
  if (course.endDate < today) {
    throw new Error("This course has already finished and cannot be applied for.");
  }
  if (course.startDate < today) {
    throw new Error("This course has already started; applications are closed.");
  }

  // Category sanity: internal training is free; the other categories carry a fee.
  if (course.category === CATEGORIES.INTERNAL && course.fee !== 0) {
    throw new Error("Internal training should carry no course fee.");
  }
  if (course.category !== CATEGORIES.INTERNAL && course.fee <= 0) {
    throw new Error("This course is missing a valid course fee.");
  }

  // One active application per course per employee.
  const mine = await ctx.db
    .query("applications")
    .withIndex("by_employee", (q) => q.eq("employeeId", employee._id))
    .collect();
  const duplicate = mine.some(
    (a) =>
      a.courseId === course._id &&
      a._id !== opts.currentApplicationId &&
      (a.status === STATUSES.PENDING || a.status === STATUSES.APPROVED),
  );
  if (duplicate) {
    throw new Error("You already have an active application for this course.");
  }

  // Approved courses in the same calendar year count against entitlements.
  const yearPrefix = today.slice(0, 4);
  const approvedThisYear: { course: Doc<"courses"> }[] = [];
  for (const a of mine) {
    if (a.status !== STATUSES.APPROVED) continue;
    const c = await ctx.db.get(a.courseId);
    if (!c || !c.startDate.startsWith(yearPrefix)) continue;
    approvedThisYear.push({ course: c });
  }

  // --- Entitlement: training days per calendar year -------------------------
  const entitlementDays = employee.annualTrainingEntitlementDays ?? 0;
  const usedDays = approvedThisYear.reduce((sum, a) => sum + a.course.durationDays, 0);
  const newTotalDays = usedDays + course.durationDays;
  if (newTotalDays > entitlementDays) {
    throw new Error(
      `Training entitlement exceeded: this course is ${course.durationDays} day(s); ` +
        `you have already used ${usedDays} of your ${entitlementDays} approved training day(s) this year.`,
    );
  }

  // --- Budget: fee-paying categories charge the annual training budget ------
  if (course.category !== CATEGORIES.INTERNAL) {
    const budget = employee.annualTrainingBudget ?? 0;
    const usedFee = approvedThisYear
      .filter((a) => a.course.category !== CATEGORIES.INTERNAL)
      .reduce((sum, a) => sum + a.course.fee, 0);
    const remaining = budget - usedFee;
    if (usedFee + course.fee > budget) {
      throw new Error(
        `Budget eligibility exceeded: this course costs $${course.fee.toLocaleString()} ` +
          `but only $${Math.max(remaining, 0).toLocaleString()} remains of your $${budget.toLocaleString()} annual training budget.`,
      );
    }
  }
}

/** Employee: submit a new course application. */
export const apply = mutation({
  args: {
    courseId: v.id("courses"),
    requestedStartDate: v.optional(v.string()),
    requestedEndDate: v.optional(v.string()),
  },
  handler: async (ctx, { courseId, requestedStartDate, requestedEndDate }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to apply for courses.");
    const employee = await ctx.db.get(userId);
    if (!employee) throw new Error("Signed-in user record not found.");
    if (employee.role !== ROLES.EMPLOYEE && employee.role !== ROLES.MANAGER) {
      throw new Error("Complete your profile before applying for courses.");
    }

    const course = await ctx.db.get(courseId);
    if (!course) throw new Error("Course not found.");

    await validateForSubmission(ctx, employee, course);

    let reqStart: string | undefined;
    let reqEnd: string | undefined;
    if (requestedStartDate && requestedEndDate) {
      validateRequestedDates(course, requestedStartDate, requestedEndDate);
      reqStart = requestedStartDate;
      reqEnd = requestedEndDate;
    }

    const now = Date.now();
    const history: Doc<"applications">["statusHistory"] = [
      { status: STATUSES.PENDING, at: now },
    ];
    const insert: Omit<Doc<"applications">, "_id" | "_creationTime"> = {
      courseId,
      employeeId: userId,
      status: STATUSES.PENDING,
      statusHistory: history,
      createdAt: now,
      updatedAt: now,
    };
    if (reqStart) insert.requestedStartDate = reqStart;
    if (reqEnd) insert.requestedEndDate = reqEnd;
    return await ctx.db.insert("applications", insert);
  },
});

/** Employee: update the requested dates of a pending application. */
export const update = mutation({
  args: {
    applicationId: v.id("applications"),
    requestedStartDate: v.string(),
    requestedEndDate: v.string(),
  },
  handler: async (ctx, { applicationId, requestedStartDate, requestedEndDate }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to update applications.");
    const app = await ctx.db.get(applicationId);
    if (!app) throw new Error("Application not found.");
    if (app.employeeId !== userId) {
      throw new Error("You can only update your own applications.");
    }
    if (app.status !== STATUSES.PENDING) {
      throw new Error("Only pending applications can be updated.");
    }

    const course = await ctx.db.get(app.courseId);
    if (!course) throw new Error("Course not found.");

    const today = todayISO();
    if (requestedStartDate < today) {
      throw new Error("Requested dates cannot be in the past.");
    }
    validateRequestedDates(course, requestedStartDate, requestedEndDate);

    const now = Date.now();
    const history = pushHistory(
      app.statusHistory,
      STATUSES.PENDING,
      now,
      "Requested dates updated",
      userId,
    );
    await ctx.db.patch(app._id, {
      requestedStartDate,
      requestedEndDate,
      statusHistory: history,
      updatedAt: now,
    });
    return app._id;
  },
});

/** Employee: withdraw a pending application. */
export const withdraw = mutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to withdraw applications.");
    const app = await ctx.db.get(applicationId);
    if (!app) throw new Error("Application not found.");
    if (app.employeeId !== userId) {
      throw new Error("You can only withdraw your own applications.");
    }
    if (app.status !== STATUSES.PENDING) {
      throw new Error("Only pending applications can be withdrawn.");
    }
    const now = Date.now();
    const history = pushHistory(app.statusHistory, STATUSES.WITHDRAWN, now, undefined, userId);
    await ctx.db.patch(app._id, {
      status: STATUSES.WITHDRAWN,
      statusHistory: history,
      updatedAt: now,
    });
    return app._id;
  },
});

/** Employee: cancel an approved application before the course starts. */
export const cancel = mutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to cancel applications.");
    const app = await ctx.db.get(applicationId);
    if (!app) throw new Error("Application not found.");
    if (app.employeeId !== userId) {
      throw new Error("You can only cancel your own applications.");
    }
    if (app.status !== STATUSES.APPROVED) {
      throw new Error("Only approved applications can be cancelled.");
    }
    const course = await ctx.db.get(app.courseId);
    if (!course) throw new Error("Course not found.");
    if (course.startDate <= todayISO()) {
      throw new Error("The course has already started and can no longer be cancelled.");
    }
    const now = Date.now();
    const history = pushHistory(app.statusHistory, STATUSES.CANCELLED, now, undefined, userId);
    await ctx.db.patch(app._id, {
      status: STATUSES.CANCELLED,
      statusHistory: history,
      updatedAt: now,
    });
    return app._id;
  },
});

/** Manager: approve or reject a pending application. A reason is required. */
export const decide = mutation({
  args: {
    applicationId: v.id("applications"),
    decision: v.union(v.literal("approve"), v.literal("reject")),
    reason: v.string(),
  },
  handler: async (ctx, { applicationId, decision, reason }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to review applications.");
    const manager = await ctx.db.get(userId);
    if (!manager || (manager.role !== ROLES.MANAGER && manager.role !== ROLES.ADMIN)) {
      throw new Error("Only managers can approve or reject applications.");
    }

    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      throw new Error("Please state a decision reason (at least 5 characters).");
    }

    const app = await ctx.db.get(applicationId);
    if (!app) throw new Error("Application not found.");
    if (app.status !== STATUSES.PENDING) {
      throw new Error("This application has already been decided.");
    }
    const course = await ctx.db.get(app.courseId);
    if (!course) throw new Error("Course not found.");

    if (decision === "approve") {
      // Re-check entitlement & budget at decision time.
      const employee = await ctx.db.get(app.employeeId);
      if (!employee) throw new Error("Applicant record not found.");
      try {
        await validateForSubmission(ctx, employee, course, {
          currentApplicationId: app._id,
        });
      } catch (err) {
        throw new Error(
          `Cannot approve: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const newStatus = decision === "approve" ? STATUSES.APPROVED : STATUSES.REJECTED;
    const now = Date.now();
    const history = pushHistory(app.statusHistory, newStatus, now, trimmed, userId);
    await ctx.db.patch(app._id, {
      status: newStatus,
      decidedBy: userId,
      decidedAt: now,
      decisionReason: trimmed,
      statusHistory: history,
      updatedAt: now,
    });
    return app._id;
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type ApplicationView = Doc<"applications"> & {
  course: Doc<"courses"> | null;
  employeeName?: string;
  employeeEmail?: string;
};

async function toView(
  ctx: QueryCtx,
  app: Doc<"applications">,
  includeEmployee = false,
): Promise<ApplicationView> {
  const course = await ctx.db.get(app.courseId);
  let employeeName: string | undefined;
  let employeeEmail: string | undefined;
  if (includeEmployee) {
    const emp = await ctx.db.get(app.employeeId);
    employeeName = emp?.name ?? undefined;
    employeeEmail = emp?.email ?? undefined;
  }
  return { ...app, course: course ?? null, employeeName, employeeEmail };
}

/** Employee: own application history, newest first. */
export const listMine = query({
  args: {},
  handler: async (ctx): Promise<ApplicationView[]> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_employee", (q) => q.eq("employeeId", userId))
      .collect();
    apps.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(apps.map((a) => toView(ctx, a)));
  },
});

/** Manager: all pending applications awaiting a decision, oldest first. */
export const listPendingForApproval = query({
  args: {},
  handler: async (ctx): Promise<ApplicationView[]> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const manager = await ctx.db.get(userId);
    if (!manager || (manager.role !== ROLES.MANAGER && manager.role !== ROLES.ADMIN)) {
      return [];
    }
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_status", (q) => q.eq("status", STATUSES.PENDING))
      .collect();
    apps.sort((a, b) => a.createdAt - b.createdAt);
    return Promise.all(apps.map((a) => toView(ctx, a, true)));
  },
});

/** Manager: decision history across all employees. */
export const listAll = query({
  args: {},
  handler: async (ctx): Promise<ApplicationView[]> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const manager = await ctx.db.get(userId);
    if (!manager || (manager.role !== ROLES.MANAGER && manager.role !== ROLES.ADMIN)) {
      return [];
    }
    const apps = await ctx.db.query("applications").collect();
    apps.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(apps.map((a) => toView(ctx, a, true)));
  },
});
