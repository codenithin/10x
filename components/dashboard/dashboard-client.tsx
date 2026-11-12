"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Users, Building2, Globe, TrendingUp, Target } from "lucide-react";
import Link from "next/link";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function pct(current: number, target: number) {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

interface Props {
  wonRevenue: number;
  pipelineValue: number;
  contactCount: number;
  companyCount: number;
  competitorCount: number;
  objectives: Array<{
    id: string;
    title: string;
    quarter: string;
    status: string;
    keyResults: Array<{
      id: string;
      title: string;
      current: number;
      target: number;
      unit: string;
    }>;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    channel: string;
    status: string;
    budget: number | null;
    revenue: number | null;
  }>;
}

const statusColor: Record<string, string> = {
  ON_TRACK: "bg-green-500/10 text-green-600 border-green-200",
  AT_RISK: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  BEHIND: "bg-red-500/10 text-red-600 border-red-200",
  COMPLETED: "bg-blue-500/10 text-blue-600 border-blue-200",
};

export function DashboardClient({
  wonRevenue,
  pipelineValue,
  contactCount,
  companyCount,
  competitorCount,
  objectives,
  campaigns,
}: Props) {
  const stats = [
    { label: "Closed ARR", value: fmt(wonRevenue), icon: DollarSign, href: "/crm/deals", color: "text-green-600" },
    { label: "Pipeline Value", value: fmt(pipelineValue), icon: TrendingUp, href: "/crm/deals", color: "text-blue-600" },
    { label: "Contacts", value: contactCount.toString(), icon: Users, href: "/crm/contacts", color: "text-purple-600" },
    { label: "Companies", value: companyCount.toString(), icon: Building2, href: "/crm/companies", color: "text-orange-600" },
    { label: "Competitors Tracked", value: competitorCount.toString(), icon: Globe, href: "/market-research/competitors", color: "text-rose-600" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-all transition-shadow cursor-pointer group border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">{s.label}</p>
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OKRs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Top OKRs
            </CardTitle>
            <Link href="/goals/okrs" className="text-xs text-muted-foreground hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectives.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No OKRs yet. <Link href="/goals/okrs" className="underline">Create your first</Link></p>
            ) : (
              objectives.map((obj) => (
                <div key={obj.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{obj.title}</p>
                    <Badge variant="outline" className={`text-xs ${statusColor[obj.status] ?? ""}`}>
                      {obj.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {obj.keyResults.slice(0, 2).map((kr) => (
                    <div key={kr.id} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{kr.title}</span>
                        <span>{kr.current} / {kr.target} {kr.unit}</span>
                      </div>
                      <Progress value={pct(kr.current, kr.target)} className="h-1.5" />
                    </div>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Active Campaigns</CardTitle>
            <Link href="/planning/campaigns" className="text-xs text-muted-foreground hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active campaigns. <Link href="/planning/campaigns" className="underline">Create one</Link></p>
            ) : (
              <div className="divide-y divide-border">
                {campaigns.map((c) => (
                  <div key={c.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{c.channel.toLowerCase()}</p>
                    </div>
                    <div className="text-right">
                      {c.revenue != null && <p className="text-sm font-medium text-green-600">{fmt(c.revenue)}</p>}
                      {c.budget != null && <p className="text-xs text-muted-foreground">Budget: {fmt(c.budget)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/market-research/competitors", label: "Add Competitor", desc: "Track & analyze" },
          { href: "/crm/deals", label: "Update Pipeline", desc: "Move deals forward" },
          { href: "/goals/okrs", label: "Check In on OKRs", desc: "Record progress" },
          { href: "/planning/campaigns", label: "Launch Campaign", desc: "New GTM initiative" },
        ].map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4">
                <p className="font-medium text-sm">{l.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
