import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { CATEGORY_META, formatDateRange, formatFee, formatRelative } from "@/lib/cats";
import { api } from "@/convex/_generated/api";
import type { ApplicationView } from "@/convex/applications";
import { useMutation } from "convex/react";
import { Loader2, PencilLine, XCircle, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MyApplicationsProps {
  applications: ApplicationView[] | undefined;
}

export function MyApplications({ applications }: MyApplicationsProps) {
  const withdrawMutation = useMutation(api.applications.withdraw);
  const cancelMutation = useMutation(api.applications.cancel);
  const updateMutation = useMutation(api.applications.update);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [updateApp, setUpdateApp] = useState<ApplicationView | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runAction = async (
    id: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusyId(id);
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      toast.error("Couldn't complete the action", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const openUpdate = (app: ApplicationView) => {
    setUpdateApp(app);
    const course = app.course;
    setStartDate(app.requestedStartDate ?? course?.startDate ?? "");
    setEndDate(app.requestedEndDate ?? course?.endDate ?? "");
  };

  const handleUpdate = async () => {
    if (!updateApp) return;
    setIsSubmitting(true);
    try {
      await updateMutation({
        applicationId: updateApp._id,
        requestedStartDate: startDate,
        requestedEndDate: endDate,
      });
      toast.success("Application updated", {
        description: "Your requested dates have been saved.",
      });
      setUpdateApp(null);
    } catch (err) {
      toast.error("Couldn't update application", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (applications === undefined) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse py-4">
            <CardContent className="px-5" />
          </Card>
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="items-center py-10 text-center">
        <p className="text-sm text-muted-foreground">
          You haven't applied for any courses yet. Browse the catalogue above to get
          started.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map((app) => {
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
                  <StatusBadge status={app.status} />
                </div>
                <p className="mt-2 truncate text-[15px] font-semibold tracking-tight">
                  {course?.title ?? "Course removed"}
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {course
                    ? `Scheduled ${formatDateRange(course.startDate, course.endDate)} · ${formatFee(course.fee)}`
                    : ""}
                  {app.requestedStartDate && course
                    ? ` · attending ${formatDateRange(app.requestedStartDate, app.requestedEndDate ?? app.requestedStartDate)}`
                    : ""}
                </p>
                {app.decisionReason ? (
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    <span className="font-medium text-foreground">Manager:</span>{" "}
                    {app.decisionReason}
                  </p>
                  ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="mr-1 hidden text-xs text-muted-foreground sm:block">
                  {formatRelative(app.updatedAt)}
                </span>
                {app.status === "pending" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => openUpdate(app)}
                    >
                      <PencilLine className="size-3.5" />
                      Update
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() =>
                        runAction(
                          app._id,
                          () => withdrawMutation({ applicationId: app._id }),
                          "Application withdrawn",
                        )
                      }
                    >
                      {isBusy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Undo2 className="size-3.5" />
                      )}
                      Withdraw
                    </Button>
                  </>
                ) : null}
                {app.status === "approved" && course && course.startDate > todayISO() ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() =>
                      runAction(
                        app._id,
                        () => cancelMutation({ applicationId: app._id }),
                        "Application cancelled",
                      )
                    }
                  >
                    {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Update dialog */}
      <Dialog open={updateApp !== null} onOpenChange={(open) => !open && setUpdateApp(null)}>
        <DialogContent className="sm:max-w-md">
          {updateApp ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">Update requested dates</DialogTitle>
                <DialogDescription className="text-left">
                  {updateApp.course?.title}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="update-start" className="text-xs text-muted-foreground">
                    Attend from
                  </Label>
                  <Input
                    id="update-start"
                    type="date"
                    value={startDate}
                    min={updateApp.course?.startDate}
                    max={updateApp.course?.endDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="update-end" className="text-xs text-muted-foreground">
                    Attend until
                  </Label>
                  <Input
                    id="update-end"
                    type="date"
                    value={endDate}
                    min={updateApp.course?.startDate}
                    max={updateApp.course?.endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUpdateApp(null)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
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

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
