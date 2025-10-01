import Link from "next/link";
import { Calendar, CheckSquare, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">
          Welcome to <span className="text-primary">DayFlow</span>
        </h1>

        <p className="text-xl text-muted-foreground">
          Your comprehensive daily task and calendar planner
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
          <div className="rounded-lg border bg-card p-6 text-left">
            <Calendar className="h-8 w-8 mb-4 text-primary" />
            <h3 className="font-semibold mb-2">Calendar Management</h3>
            <p className="text-sm text-muted-foreground">
              Organize your events with hourly time blocks and week view
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 text-left">
            <CheckSquare className="h-8 w-8 mb-4 text-primary" />
            <h3 className="font-semibold mb-2">Task Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Manage tasks with priorities, categories, and subtasks
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Get Started
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </main>
  );
}
