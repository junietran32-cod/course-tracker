import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/cats/StatusBadge";
import { CATEGORY_META, formatDateRange, formatFee, formatRelative } from "@/lib/cats";
import { api } from "@/convex/_generated/api";
import type { ApplicationView } from "@/convex/applications";
import { useMutation } from "convex/react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ManagerApprovalsProps {
  pending: ApplicationView[] | undefined;
  decided: ApplicationView[] | undefined;
}

export function ManagerApprovals({ pending, decided }: ManagerApprovalsProps) {
  const decideMutation = useMutation(api.applications.decide);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [decideApp, setDecideApp] = useState<ApplicationView | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openDecide = (app: ApplicationView, kind: "approve" | "reject") => {
    setDecideApp(app);
    setDecision(kind);
    setReason("");
  };

  const submitDecision = async () => {
    if (!decideApp) return;
    setIsSubmitting(true);
    try {
      await decideMutation({
        applicationId: decideApp._id,
        decision,
        reason,
      });
      toast.success(
        decision === "approve" ? "Application approved" : "Application rejected",
        { description: decideApp.course?.title },
      );
      setDecideApp(null);
    } catch (err) {
      toast.error("Couldn't record the decision", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Awaiting your decision
          </h3>
          {pending && pending.length > 0 ? (
            <Badge className="border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {pending.length} pending
            </Badge>
          ) : null}
        </div>

        {pending === undefined ? (
          <Card className="animate-pulse py-6">
            <CardContent className="px-5" />
          </Card>
        ) : pending.length === 0 ? (
          <Card className="items-center py-10 text-center">
            <CheckCircle2 className="mb-2 size-7 text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              You're all caught up — no applications waiting for approval.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((app) => {
              const course = app.course;
              const meta = course ? CATEGORY_META[course.category] : null;
              const isBusy = busyId === app._id;
              return (
                <Card key={app._id} className="gap-0 py-0 shadow-xs">
                  <CardContent className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {meta ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
                          >
                            <span className={`size-1.5 rounded-full ${meta.dot}`} />
                            {meta.short}
                          </span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {app.employeeName ?? "Employee"} · applied{" "}
                          {formatRelative(app.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-[15px] font-semibold tracking-tight">
                        {course?.title ?? "Course removed"}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {course
                          ? `${formatDateRange(course.startDate, course.endDate)} · ${formatFee(course.fee)}${
                              app.requestedStartDate
                                ? ` · requested ${formatDateRange(app.requestedStartDate, app.requestedEndDate ?? app.requestedStartDate)}`
                                : ""
                            }`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => openDecide(app, "reject")}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => openDecide(app, "approve")}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          Recent decisions
        </h3>
        {decided === undefined ? (
          <Card className="animate-pulse py-6">
            <CardContent className="px-5" />
          </Card>
        ) : decided.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {decided
              .filter((a) => a.status !== "pending")
              .slice(0, 8)
              .map((app) => (
              <div
                key={app._id}
                className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {app.course?.title ?? "Course removed"}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {app.employeeName ?? "Employee"}
                    </span>
                  </p>
                  {app.decisionReason ? (
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                      “{app.decisionReason}”
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={app.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(app.decidedAt ?? app.updatedAt)}
                  </span>
                </div>
              </div>
              ))}
          </div>
        )}
      </section>

      {/* Decision dialog */}
      <Dialog open={decideApp !== null} onOpenChange={(open) => !open && setDecideApp(null)}>
        <DialogContent className="sm:max-w-md">
          {decideApp ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">
                  {decision === "approve" ? "Approve application" : "Reject application"}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {decideApp.employeeName ?? "Employee"} —{" "}
                  {decideApp.course?.title}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="decision-reason"
                  className="text-xs text-muted-foreground"
                >
                  Reason (required, shown to the employee)
                </label>
                <Textarea
                  id="decision-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    decision === "approve"
                      ? "e.g. Aligned with Q4 development goals and within budget."
                      : "e.g. Team capacity is fully committed this quarter; reapply next cycle."
                  }
                  rows={3}
                />
                {reason.trim().length > 0 && reason.trim().length < 5 ? (
                  <p className="text-xs text-destructive">
                    Please write a slightly longer reason (at least 5 characters).
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDecideApp(null)}
                  disabled={isSubmitting}
                >
                  Keep as pending
                </Button>
                <Button
                  onClick={submitDecision}
                  disabled={isSubmitting || reason.trim().length < 5}
                  className={
                    decision === "reject"
                      ? "bg-destructive text-white hover:bg-destructive/90"
                      : undefined
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : decision === "approve" ? (
                    "Confirm approval"
                  ) : (
                    "Confirm rejection"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
