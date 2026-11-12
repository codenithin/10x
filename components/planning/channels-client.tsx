"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Channel = "OUTBOUND" | "CONTENT" | "PAID" | "PARTNERSHIPS" | "SEO" | "EVENTS" | "REFERRAL" | "OTHER";

interface Campaign {
  id: string;
  channel: Channel;
  status: string;
  budget: number | null;
  revenue: number | null;
  leads: number | null;
}

const COLORS: Record<Channel, string> = {
  OUTBOUND: "#6366f1",
  CONTENT: "#8b5cf6",
  PAID: "#f59e0b",
  PARTNERSHIPS: "#10b981",
  SEO: "#3b82f6",
  EVENTS: "#ef4444",
  REFERRAL: "#ec4899",
  OTHER: "#6b7280",
};

const CHANNELS: Channel[] = ["OUTBOUND", "CONTENT", "PAID", "PARTNERSHIPS", "SEO", "EVENTS", "REFERRAL", "OTHER"];

function fmt(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export function ChannelsClient({ campaigns }: { campaigns: Campaign[] }) {
  const channelStats = CHANNELS.map((ch) => {
    const cc = campaigns.filter((c) => c.channel === ch);
    const budget = cc.reduce((s, c) => s + (c.budget ?? 0), 0);
    const revenue = cc.reduce((s, c) => s + (c.revenue ?? 0), 0);
    const leads = cc.reduce((s, c) => s + (c.leads ?? 0), 0);
    const roi = budget > 0 ? ((revenue - budget) / budget) * 100 : 0;
    return { channel: ch, label: ch.charAt(0) + ch.slice(1).toLowerCase(), budget, revenue, leads, roi, count: cc.length };
  });

  const activeChannels = channelStats.filter((c) => c.count > 0);
  const totalRevenue = activeChannels.reduce((s, c) => s + c.revenue, 0);
  const totalBudget = activeChannels.reduce((s, c) => s + c.budget, 0);
  const totalLeads = activeChannels.reduce((s, c) => s + c.leads, 0);

  const pieData = activeChannels
    .filter((c) => c.revenue > 0)
    .map((c) => ({ name: c.label, value: c.revenue, color: COLORS[c.channel] }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {campaigns.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center text-muted-foreground">
            <p>No campaign data yet. Add campaigns to see channel performance.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Revenue", value: fmt(totalRevenue), color: "text-green-600" },
              { label: "Total Budget", value: fmt(totalBudget), color: "text-blue-600" },
              { label: "Total Leads", value: totalLeads.toString(), color: "text-purple-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activeChannels} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, ""]} />
                    <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]}>
                      {activeChannels.map((entry) => (
                        <Cell key={entry.channel} fill={COLORS[entry.channel]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie chart */}
            {pieData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Revenue Mix</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Channel table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Channel Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    {["Channel", "Campaigns", "Budget", "Revenue", "Leads", "ROI"].map((h) => (
                      <th key={h} className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeChannels.map((ch) => (
                    <tr key={ch.channel} className="border-t border-border">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[ch.channel] }} />
                          <Badge variant="outline" className="text-xs" style={{ borderColor: COLORS[ch.channel] + "40", color: COLORS[ch.channel] }}>
                            {ch.label}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{ch.count}</td>
                      <td className="py-3 px-4 text-sm">{ch.budget > 0 ? fmt(ch.budget) : "—"}</td>
                      <td className="py-3 px-4 text-sm font-medium text-green-600">{ch.revenue > 0 ? fmt(ch.revenue) : "—"}</td>
                      <td className="py-3 px-4 text-sm">{ch.leads > 0 ? ch.leads : "—"}</td>
                      <td className="py-3 px-4 text-sm">
                        {ch.roi !== 0 ? (
                          <span className={ch.roi > 0 ? "text-green-600" : "text-red-600"}>
                            {ch.roi > 0 ? "+" : ""}{ch.roi.toFixed(0)}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
