import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ROLES, categoryValidator, CATEGORIES } from "./schema";
import type { Doc, Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Business rules
// - Internal training: free, duration in half-day granularity (0.5 day steps).
// - External courses & professional certifications: fee-paying, duration in
//   full training days only.
// - Course dates must be valid (start <= end). Version 1 seeds the catalogue;
//   administrator course management arrives in a later version, so the seed
//   mutation requires the admin role.
// ---------------------------------------------------------------------------

/** Validate category-specific duration/date rules. Throws on violation. */
export function validateCourseBusinessRules(
  category: Doc<"courses">["category"],
  fee: number,
  durationDays: number,
  startDate: string,
  endDate: string,
): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Course dates must be in YYYY-MM-DD format.");
  }
  if (endDate < startDate) {
    throw new Error("Course end date must be on or after the start date.");
  }
  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    throw new Error("Duration must be a positive number of training days.");
  }
  if (!Number.isFinite(fee) || fee < 0) {
    throw new Error("Course fee cannot be negative.");
  }
  if (category === CATEGORIES.INTERNAL) {
    // In-house training is free and counted in half days.
    if (fee !== 0) {
      throw new Error("Internal training carries no course fee.");
    }
    if (Math.abs(durationDays * 2 - Math.round(durationDays * 2)) > 1e-9) {
      throw new Error("Internal training duration is counted in half days.");
    }
  } else {
    // Fee-paying categories are counted in full training days.
    if (category === CATEGORIES.CERTIFICATION && fee <= 0) {
      throw new Error("Professional certifications must carry a course fee.");
    }
    if (!Number.isInteger(durationDays)) {
      throw new Error(
        "Duration for external courses and certifications is counted in full training days.",
      );
    }
  }
}

/** Seed the course catalogue. Admin-only; idempotent on course title. */
export const seedCourses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId !== null) {
      const user = await ctx.db.get(userId);
      if (user?.role !== ROLES.ADMIN) {
        throw new Error("Only administrators can seed the catalogue.");
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    // Stagger course windows across the coming months so every flow
    // (apply now, cancel before start, entitlement across the year) is usable.
    const inDays = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const seed: Array<{
      title: string;
      description: string;
      provider: string;
      category: Doc<"courses">["category"];
      fee: number;
      startDate: string;
      endDate: string;
      durationDays: number;
    }> = [
      {
        title: "Safe Work Practices Refresher",
        description:
          "Mandatory in-house refresher covering workplace safety, incident reporting and emergency drills.",
        provider: "In-house",
        category: CATEGORIES.INTERNAL,
        fee: 0,
        startDate: inDays(3),
        endDate: inDays(3),
        durationDays: 0.5,
      },
      {
        title: "Effective Business Writing",
        description:
          "Half-day workshop on clear emails, minutes and reports for internal communication.",
        provider: "In-house",
        category: CATEGORIES.INTERNAL,
        fee: 0,
        startDate: inDays(10),
        endDate: inDays(10),
        durationDays: 0.5,
      },
      {
        title: "Introduction to SQL & Relational Databases",
        description:
          "Hands-on in-house introduction to SQL queries, schema design and reporting basics over two mornings.",
        provider: "In-house",
        category: CATEGORIES.INTERNAL,
        fee: 0,
        startDate: inDays(17),
        endDate: inDays(18),
        durationDays: 1,
      },
      {
        title: "Data Analysis with Excel Power Query",
        description:
          "Practical external course on Power Query, pivot modelling and dashboarding for analysts.",
        provider: "Metro Training Institute",
        category: CATEGORIES.EXTERNAL,
        fee: 480,
        startDate: inDays(21),
        endDate: inDays(22),
        durationDays: 2,
      },
      {
        title: "Project Management Fundamentals (PMBOK)",
        description:
          "External course covering project lifecycles, scheduling, budgeting and stakeholder management.",
        provider: "Metro Training Institute",
        category: CATEGORIES.EXTERNAL,
        fee: 950,
        startDate: inDays(28),
        endDate: inDays(30),
        durationDays: 3,
      },
      {
        title: "Customer Service Excellence",
        description:
          "External programme on service recovery, communication under pressure and complaint handling.",
        provider: "ServiceFirst Academy",
        category: CATEGORIES.EXTERNAL,
        fee: 620,
        startDate: inDays(35),
        endDate: inDays(36),
        durationDays: 2,
      },
      {
        title: "AWS Certified Cloud Practitioner",
        description:
          "Professional certification preparation covering cloud fundamentals, billing and security basics. Exam fee included.",
        provider: "Amazon Web Services",
        category: CATEGORIES.CERTIFICATION,
        fee: 1500,
        startDate: inDays(42),
        endDate: inDays(46),
        durationDays: 5,
      },
      {
        title: "Certified ScrumMaster (CSM)",
        description:
          "Professional certification for agile practitioners; includes exam attempt and two-year membership.",
        provider: "Scrum Alliance",
        category: CATEGORIES.CERTIFICATION,
        fee: 1200,
        startDate: inDays(49),
        endDate: inDays(50),
        durationDays: 2,
      },
    ];

    let created = 0;
    let refreshed = 0;
    for (const c of seed) {
      const existing = await ctx.db
        .query("courses")
        .withIndex("by_category", (q) => q.eq("category", c.category))
        .collect();
      const match = existing.find((e) => e.title === c.title);
      if (match) {
        // Keep scheduled windows current for demo/seed data.
        if (match.startDate !== c.startDate || match.endDate !== c.endDate) {
          await ctx.db.patch(match._id, {
            startDate: c.startDate,
            endDate: c.endDate,
          });
          refreshed++;
        }
        continue;
      }
      await ctx.db.insert("courses", {
        ...c,
        isActive: true,
        createdAt: Date.now(),
      });
      created++;
    }
    return { created, refreshed };
  },
});

/** A course by id (used by application views). */
export const getCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => ctx.db.get(courseId),
});

/** Full active catalogue for the main screen. */
export const listActiveCourses = query({
  args: {},
  handler: async (ctx) => {
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    courses.sort((a, b) => a.title.localeCompare(b.title));
    return courses;
  },
});

/** Small helper reused by other modules. */
export function courseFeeIsFree(course: Doc<"courses">): boolean {
  return course.category === CATEGORIES.INTERNAL || course.fee === 0;
}

export type CourseDoc = Doc<"courses">;
export type CourseId = Id<"courses">;
