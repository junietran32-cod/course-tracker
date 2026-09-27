import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Inbox,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const ctaHref = isAuthenticated ? "/dashboard" : "/auth";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background"
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight">CATS</span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                Course Application Tracking
              </span>
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#roles" className="transition-colors hover:text-foreground">Roles</a>
            <a href="#flow" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#categories" className="transition-colors hover:text-foreground">Categories</a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                Open CATS
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")} className="gap-2">
                Sign in
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.45_0.19_268/0.08),transparent_70%)]"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-20 pt-20 text-center sm:pt-28">
          <Badge
            variant="outline"
            className="mb-6 gap-1.5 border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-xs"
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Company intranet · Version 1
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
            Course applications,{" "}
            <span className="text-primary">approved without the paper trail</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            CATS lets employees apply for internal training, external courses and
            professional certifications — and gives managers one clean queue to
            approve or reject with a recorded reason.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="gap-2" onClick={() => navigate(ctaHref)}>
              {isAuthenticated ? "Go to my dashboard" : "Sign in to apply"}
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("flow")?.scrollIntoView({ behavior: "smooth" })}>
              See how it works
            </Button>
          </div>
          <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Building2, label: "Internal training" },
              { icon: CalendarDays, label: "External courses" },
              { icon: BadgeCheck, label: "Certifications" },
              { icon: Wallet, label: "Budget tracking" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-lg border border-border/80 bg-card px-4 py-4 shadow-xs"
              >
                <Icon className="size-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for three roles
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Version 1 ships employee and manager workflows; administrator tools
            for users, hierarchy and catalogue management follow next.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <RoleCard
            icon={BadgeCheck}
            title="Employees"
            points={[
              "Apply for any course in the catalogue",
              "Update requested dates while pending",
              "Withdraw or cancel in one click",
              "See manager's decision reason",
            ]}
            accent="emerald"
          />
          <RoleCard
            icon={ShieldCheck}
            title="Managers"
            points={[
              "One queue of pending applications",
              "Approve or reject with a required reason",
              "Entitlement and budget re-checked at approval",
              "See every decision history",
            ]}
            accent="violet"
          />
          <RoleCard
            icon={GraduationCap}
            title="Administrators"
            points={[
              "Manage users and roles (coming soon)",
              "Approval hierarchy setup (coming soon)",
              "Course catalogue management (coming soon)",
            ]}
            accent="indigo"
          />
        </div>
      </section>

      {/* Flow */}
      <section id="flow" className="border-y border-border/70 bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              From application to approval in four steps
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                title: "Browse the catalogue",
                text: "Filter by internal training, external courses or certifications.",
              },
              {
                n: "02",
                title: "Apply in one click",
                text: "Pick your attendance dates; entitlement and budget are checked instantly.",
              },
              {
                n: "03",
                title: "Manager decides",
                text: "Approve or reject — a reason is always recorded and shown to you.",
              },
              {
                n: "04",
                title: "Attend or cancel",
                text: "Approved plans can be cancelled any time before the course starts.",
              },
            ].map((s, i) => (
              <motion.div key={s.n} {...fadeUp} transition={{ delay: i * 0.06 }}>
                <Card className="card-lift h-full border-border/80 shadow-xs">
                  <CardContent className="flex h-full flex-col gap-2 px-5">
                    <span className="text-xs font-semibold text-primary">{s.n}</span>
                    <p className="text-[15px] font-semibold">{s.title}</p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{s.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Three course categories, clear rules
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              The business layer validates category, dates, entitlement and budget
              before an application is ever submitted.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "Internal training — in-house, free, counted in half days",
                "External courses — fee-paying, full training days, charged to your annual budget",
                "Professional certifications — fee-paying with exam costs, full training days",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="px-6 py-2">
              <div className="flex flex-col divide-y divide-border/70">
                {[
                  ["Course application", "Pending approval"],
                  ["Budget check", "Passed · $950 of $3,000"],
                  ["Entitlement", "3 of 10 days used"],
                  ["Manager decision", "Reason recorded"],
                ].map(([k, v], i) => (
                  <div key={k} className="flex items-center justify-between py-3.5">
                    <span className="text-sm text-muted-foreground">{k}</span>
                    <span
                      className={`text-sm font-medium ${
                        i === 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card px-8 py-12 text-center shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,oklch(0.45_0.19_268/0.09),transparent_70%)]"
          />
          <div className="relative">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to book your next course?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Sign in with your work email and submit your first application in
              under a minute.
            </p>
            <Button size="lg" className="mt-6 gap-2" onClick={() => navigate(ctaHref)}>
              {isAuthenticated ? "Open my dashboard" : "Sign in to CATS"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>CATS · Course Application Tracking System</span>
          <span>Company intranet · Version 1</span>
        </div>
      </footer>
    </motion.div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  points,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  points: string[];
  accent: "emerald" | "violet" | "indigo";
}) {
  const accents = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  } as const;

  return (
    <Card className="card-lift h-full border-border/80 shadow-xs">
      <CardContent className="flex h-full flex-col gap-4 px-6">
        <span
          className={`flex size-10 items-center justify-center rounded-lg ${accents[accent]}`}
        >
          <Icon className="size-5" />
        </span>
        <p className="text-base font-semibold">{title}</p>
        <ul className="flex flex-col gap-2">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500/80" />
              {p}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
