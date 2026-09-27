import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/cats/StatusBadge";
import {
  CATEGORY_META,
  type ApplicationStatus,
  formatDateRange,
  formatDuration,
  formatFee,
} from "@/lib/cats";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  CalendarDays,
  Building2,
  Clock3,
  GraduationCap,
  Loader2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Course = Doc<"courses">;

interface CourseCatalogueProps {
  courses: Course[] | undefined;
  myApplications: { courseId: Id<"courses">; status: string }[] | undefined;
  isManager: boolean;
}

const CATEGORY_ORDER = [
  "internal_training",
  "external_course",
  "professional_certification",
] as const;

export function CourseCatalogue({ courses, myApplications, isManager }: CourseCatalogueProps) {
  const [filter, setFilter] = useState<string>("all");
  const [applyCourse, setApplyCourse] = useState<Course | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyMutation = useMutation(api.applications.apply);

  const filtered = useMemo(() => {
    if (!courses) return [];
    return filter === "all"
      ? courses
      : courses.filter((c) => c.category === filter);
  }, [courses, filter]);

  const activeByCourse = useMemo(() => {
    const map = new Map<Id<"courses">, ApplicationStatus>();
    for (const a of myApplications ?? []) {
      if (a.status === "pending" || a.status === "approved") {
        map.set(a.courseId, a.status);
      }
    }
    return map;
  }, [myApplications]);

  const openApplyDialog = (course: Course) => {
    setApplyCourse(course);
    setStartDate(course.startDate);
    setEndDate(course.endDate);
  };

  const resetApplyState = () => {
    setApplyCourse(null);
    setStartDate("");
    setEndDate("");
  };

  const handleApply = async () => {
    if (!applyCourse) return;
    setIsSubmitting(true);
    try {
      await applyMutation({
        courseId: applyCourse._id,
        ...(startDate && endDate ? { requestedStartDate: startDate, requestedEndDate: endDate } : {}),
      });
      toast.success("Application submitted", {
        description: `${applyCourse.title} — awaiting your manager's approval.`,
      });
      resetApplyState();
    } catch (err) {
      toast.error("Couldn't submit application", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dateInvalid =
    applyCourse !== null &&
    Boolean(startDate && endDate) &&
    (startDate > endDate ||
      startDate < applyCourse.startDate ||
      endDate > applyCourse.endDate);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Course catalogue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse company-sponsored training and apply in one click.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
          />
          {CATEGORY_ORDER.map((cat) => (
            <FilterChip
              key={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
              label={CATEGORY_META[cat].short}
            />
          ))}
        </div>
      </div>

      {courses === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-0" />
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <GraduationCap className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No courses in this category yet.
          </p>
        </Card>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const activeStatus = activeByCourse.get(course._id);
            return (
              <Card
                key={course._id}
                className="card-lift gap-4 border-border/80 py-5 shadow-xs"
              >
                <CardHeader className="gap-2.5 px-5">
                  <div className="flex items-center justify-between gap-2">
                    <CategoryChip category={course.category} />
                    {activeStatus ? (
                      <StatusBadge status={activeStatus} />
                    ) : null}
                  </div>
                  <CardTitle className="text-[15px] leading-snug">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-[13px] leading-relaxed">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 px-5 text-[13px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-3.5 shrink-0" />
                    {formatDateRange(course.startDate, course.endDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-3.5 shrink-0" />
                    {formatDuration(course.durationDays)}
                    {course.category === "internal_training" ? " (half-day)" : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="size-3.5 shrink-0" />
                    {formatFee(course.fee)}
                    {course.fee > 0 ? (
                      <span className="text-muted-foreground/70">· against budget</span>
                    ) : null}
                  </div>
                  {course.provider ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 shrink-0" />
                      {course.provider}
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="px-5">
                  {activeStatus ? (
                    <Button variant="outline" size="sm" disabled className="w-full">
                      {activeStatus === "pending" ? "Pending your manager" : "Approved"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => openApplyDialog(course)}
                    >
                      Apply
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Apply dialog */}
      <Dialog
        open={applyCourse !== null}
        onOpenChange={(open) => {
          if (!open) resetApplyState();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {applyCourse ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <CategoryChip category={applyCourse.category} />
                </div>
                <DialogTitle className="text-left leading-snug">
                  {applyCourse.title}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {applyCourse.description}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 text-[13px]">
                <Row label="Provider" value={applyCourse.provider ?? "—"} />
                <Row
                  label="Schedule"
                  value={formatDateRange(applyCourse.startDate, applyCourse.endDate)}
                />
                <Row
                  label="Duration"
                  value={`${formatDuration(applyCourse.durationDays)}${
                    applyCourse.category === "internal_training" ? " · half-day granularity" : ""
                  }`}
                />
                <Row
                  label="Fee"
                  value={`${formatFee(applyCourse.fee)}${
                    applyCourse.fee > 0 ? " · charged to your annual budget" : ""
                  }`}
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="apply-start" className="text-xs text-muted-foreground">
                      Attend from
                    </Label>
                    <Input
                      id="apply-start"
                      type="date"
                      value={startDate}
                      min={applyCourse.startDate}
                      max={applyCourse.endDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="apply-end" className="text-xs text-muted-foreground">
                      Attend until
                    </Label>
                    <Input
                      id="apply-end"
                      type="date"
                      value={endDate}
                      min={applyCourse.startDate}
                      max={applyCourse.endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                {dateInvalid ? (
                  <p className="text-xs text-destructive">
                    Dates must fall within the course window and end after the start.
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetApplyState} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleApply} disabled={isSubmitting || dateInvalid}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit application"
                  )}
                </Button>
                <p className="mt-1 w-full text-center text-[11px] text-muted-foreground">
                  Your manager will review this application. You can update or withdraw
                  it while it's pending.
                </p>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
      )}
    >
      {label}
      {active ? "" : ""}
    </button>
  );
}

function CategoryChip({ category }: { category: Course["category"] }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.short}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
