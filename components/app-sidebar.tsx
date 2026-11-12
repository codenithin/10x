"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  Target,
  Users,
  Briefcase,
  TrendingUp,
  Globe,
  Lightbulb,
  Megaphone,
  LayoutDashboard,
  Upload,
  Zap,
} from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

const nav = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Market Research",
    items: [
      { href: "/market-research/competitors", label: "Competitors", icon: Globe },
      { href: "/market-research/icp", label: "ICP Builder", icon: Lightbulb },
      { href: "/market-research/market-size", label: "Market Sizing", icon: TrendingUp },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/customers", label: "All Customers", icon: Users },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/crm/contacts", label: "Contacts", icon: Users },
      { href: "/crm/contacts/import", label: "Import CSV", icon: Upload },
      { href: "/crm/companies", label: "Companies", icon: Building2 },
      { href: "/crm/deals", label: "Pipeline", icon: Briefcase },
    ],
  },
  {
    label: "Goals & OKRs",
    items: [
      { href: "/goals/okrs", label: "OKRs", icon: Target },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/planning/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/planning/channels", label: "Channels", icon: BarChart3 },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[15px] tracking-tight text-foreground">Nvelop 10x</span>
      </div>

      {/* Org switcher */}
      <div className="px-3 pt-3 pb-2">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-between rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-accent transition-colors",
            },
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {nav.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] font-medium transition-all",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <item.icon
                        className={cn("h-3.5 w-3.5 flex-shrink-0", active ? "text-primary" : "")}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1">
          <UserButton />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">My Account</p>
            <p className="text-[11px] text-muted-foreground">Settings & billing</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
