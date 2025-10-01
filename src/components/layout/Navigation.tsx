"use client";

import {
  Calendar,
  CheckSquare,
  Settings,
  Home,
  Users,
  HelpCircle,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { withCircularReveal } from "@/lib/view-transitions";
import * as React from "react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

// Mock collaborators data
const collaborators = [
  { id: "1", name: "John Doe", avatar: "JD", status: "online" },
  { id: "2", name: "Sara Smith", avatar: "SS", status: "online" },
  { id: "3", name: "Mike Johnson", avatar: "MJ", status: "offline" },
];

export function Navigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const cycleTheme = async () => {
    const themeSequence: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    const currentIndex = themeSequence.indexOf(theme);
    const nextTheme = themeSequence[(currentIndex + 1) % themeSequence.length];

    // Use View Transition API for smooth theme change
    await withCircularReveal(() => {
      setTheme(nextTheme);
    }, buttonRef.current);
  };

  // Get theme icon and label
  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5 flex-shrink-0" />;
      case "dark":
        return <Moon className="h-5 w-5 flex-shrink-0" />;
      case "system":
        return <Monitor className="h-5 w-5 flex-shrink-0" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light Mode";
      case "dark":
        return "Dark Mode";
      case "system":
        return "System Mode";
    }
  };

  return (
    <nav className="flex flex-col h-full bg-background">
      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 my-2 border-t" />

        {/* Collaborators Section */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Collaborators
            </h3>
            <button
              className="p-1 rounded hover:bg-accent transition-colors"
              aria-label="Manage collaborators"
            >
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-1">
            {collaborators.map((collab) => (
              <button
                key={collab.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent transition-colors text-sm"
              >
                <div className="relative">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {collab.avatar}
                  </div>
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-background",
                      collab.status === "online"
                        ? "bg-green-500"
                        : "bg-muted-foreground"
                    )}
                  />
                </div>
                <span className="flex-1 text-left truncate">{collab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t p-3 space-y-1">
        {/* Enhanced Theme Toggle */}
        <button
          ref={buttonRef}
          onClick={cycleTheme}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          title={`Current: ${getThemeLabel()}. Click to cycle themes.`}
        >
          {getThemeIcon()}
          <span>{getThemeLabel()}</span>
        </button>

        {/* Help & Docs */}
        <Link
          href="/help"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          <span>Help & Docs</span>
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span>Settings</span>
        </Link>

        {/* User Profile */}
        <div className="pt-2 border-t">
          <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
              DU
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="font-medium truncate">Demo User</div>
              <div className="text-xs text-muted-foreground truncate">
                demo@dayflow.app
              </div>
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
}
