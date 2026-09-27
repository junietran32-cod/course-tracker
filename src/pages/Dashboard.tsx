import { AppHeader } from "@/components/cats/AppHeader";
import { CourseCatalogue } from "@/components/cats/CourseCatalogue";
import { MyApplications } from "@/components/cats/MyApplications";
import { ManagerApprovals } from "@/components/cats/ManagerApprovals";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import {
  CalendarClock,
  ClipboardList,
  Inbox,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const ensureProfile = useMutation(api.users.ensureProfile);

  const courses = useQuery(api.courses.listActiveCourses);
  const myApplications = useQuery(api.applications.listMine);
  const isManager =
    user?.role === "manager" || user?.role === "admin";
  const pending = useQuery(
    api.applications.listPendingForApproval,
    isManager ? {} : "skip",
  );
  const decided = useQuery(
    api.applications.listAll,
    isManager ? {} : "skip",
  );

  const budget = user?.annualTrainingBudget ?? 0;
  const entitlementDays = user?.annualTrainingEntitlementDays ?? 0;

  const usage = useMemo(() => {
    const year = new Date().getFullYear().toString();
    let usedDays = 0;
    let usedFee = 0;
    for (const app of myApplications ?? []) {
      if (app.status !== "approved") continue;
      const c = app.course;
      if (!c || !c.startDate.startsWith(year)) continue;
      usedDays += c.durationDays;
      if (c.category !== "internal_training") usedFee += c.fee;
    }
    return { usedDays, usedFee };
  }, [myApplications]);

  const remainingFee = Math.max(budget - usage.usedFee, 0);
  const remainingDays = Math.max(entitlementDays - usage.usedDays, 0);
  const pendingCount = pending?.length ?? 0;

  const needsRole = user !== null && user !== undefined && user.role === undefined;

  const handleRolePick = async (role: "employee" | "manager") => {
    try {
      await ensureProfile({ role });
      toast.success(
        role === "manager" ? "Manager profile ready" : "Employee profile ready",
      );
    } catch (err) {
      toast.error("Couldn't set up your profile", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  if (needsRole) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-20 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Inbox className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Set up your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose how you'll use CATS. This sets your default training budget and
            entitlement.
          </p>
          <div className="mt-6 flex w-full flex-col gap-3">
            <Button onClick={() => handleRolePick("employee")} className="w-full">
              I'm an employee
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRolePick("manager")}
              className="w-full"
            >
              I'm a manager
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pendingCount={isManager ? pendingCount : undefined} />

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {/* Greeting + entitlement summary */}
        <section className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {user?.name ? `Welcome back, ${firstName(user.name)}` : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Apply for courses, track approvals, and keep an eye on your training
            entitlement.
          </p>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={<Wallet className="size-4" />}
            label="Budget remaining"
            value={`$${remainingFee.toLocaleString()}`}
            hint={`of $${budget.toLocaleString()} annual training budget`}
            progress={budget > 0 ? usage.usedFee / budget : 0}
          />
          <SummaryCard
            icon={<CalendarClock className="size-4" />}
            label="Training days left"
            value={`${remainingDays}`}
            hint={`of ${entitlementDays} approved day(s) this year`}
            progress={entitlementDays > 0 ? usage.usedDays / entitlementDays : 0}
          />
          <SummaryCard
            icon={<ClipboardList className="size-4" />}
            label="My applications"
            value={`${countActive(myApplications)}`}
            hint="pending or approved this year"
            progress={undefined}
          />
        </section>

        {/* Main screen: the course catalogue comes first */}
        <div className="mt-8">
          <CourseCatalogue
            courses={courses}
            myApplications={myApplications}
            isManager={Boolean(isManager)}
          />
        </div>

        {/* Employee history + manager workspace */}
        <Tabs defaultValue="mine" className="mt-10">
          <TabsList className="h-10 w-full justify-start gap-1 rounded-lg bg-muted/70 p-1 sm:w-fit">
            <TabsTrigger value="mine" className="gap-2 rounded-md px-4">
              <ClipboardList className="size-3.5" />
              My applications
              {myApplications?.length ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">
                  {myApplications.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            {isManager ? (
              <TabsTrigger value="approvals" className="gap-2 rounded-md px-4">
                <Inbox className="size-3.5" />
                Approvals
                {pendingCount > 0 ? (
                  <Badge className="ml-1 h-5 border-amber-200/70 bg-amber-50 px-1.5 text-[11px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    {pendingCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="mine" className="mt-4">
            <MyApplications applications={myApplications} />
          </TabsContent>
          {isManager ? (
            <TabsContent value="approvals" className="mt-4">
              <ManagerApprovals pending={pending} decided={decided} />
            </TabsContent>
          ) : null}
        </Tabs>
      </main>
    </div>
  );
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

function countActive(apps: { status: string }[] | undefined): number {
  if (!apps) return 0;
  return apps.filter((a) => a.status === "pending" || a.status === "approved").length;
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  progress?: number;
}) {
  return (
    <Card className="card-lift gap-3 border-border/80 py-4 shadow-xs">
      <CardContent className="flex flex-col gap-2 px-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
          <span className="text-[13px] font-medium">{label}</span>
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        {progress !== undefined ? (
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70 transition-all"
              style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
