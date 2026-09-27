import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { GraduationCap, LogOut } from "lucide-react";
import { useNavigate } from "react-router";

export function AppHeader({ pendingCount }: { pendingCount?: number }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const roleLabel =
    user?.role === "manager"
      ? "Manager"
      : user?.role === "admin"
        ? "Administrator"
        : "Employee";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-5" />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="text-[15px] font-semibold tracking-tight">Course Tracker</span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              Training applications and approvals
            </span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          {pendingCount ? (
            <Badge className="hidden border-amber-200/70 bg-amber-50 text-amber-700 sm:inline-flex dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {pendingCount} awaiting approval
            </Badge>
          ) : null}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">
              {user?.name ?? "Signed in"}
            </p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="gap-2"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
