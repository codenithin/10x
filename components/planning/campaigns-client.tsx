"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Megaphone, Trash2 } from "lucide-react";
import { createCampaign, updateCampaignStatus, deleteCampaign } from "@/lib/actions/planning";
import { toast } from "sonner";

type Channel = "OUTBOUND" | "CONTENT" | "PAID" | "PARTNERSHIPS" | "SEO" | "EVENTS" | "REFERRAL" | "OTHER";
type Status = "PLANNED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

const CHANNELS: Channel[] = ["OUTBOUND", "CONTENT", "PAID", "PARTNERSHIPS", "SEO", "EVENTS", "REFERRAL", "OTHER"];
const STATUSES: Status[] = ["PLANNED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"];

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  channel: Channel;
  status: Status;
  budget: number | null;
  revenue: number | null;
  leads: number | null;
  startDate: string | null;
  endDate: string | null;
  _count?: { companies: number; contacts: number };
}

function fmt(n: number | null) {
  if (n == null) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

const statusColor: Record<Status, string> = {
  PLANNED: "bg-slate-500/10 text-slate-600",
  ACTIVE: "bg-green-500/10 text-green-700",
  PAUSED: "bg-yellow-500/10 text-yellow-700",
  COMPLETED: "bg-blue-500/10 text-blue-700",
  CANCELLED: "bg-red-500/10 text-red-700",
};

const channelColor: Record<string, string> = {
  OUTBOUND: "#6366f1",
  CONTENT: "#8b5cf6",
  PAID: "#f59e0b",
  PARTNERSHIPS: "#10b981",
  SEO: "#3b82f6",
  EVENTS: "#ef4444",
  REFERRAL: "#ec4899",
  OTHER: "#6b7280",
};

function CampaignRow({ campaign, onStatusChange, onDelete }: {
  campaign: Campaign;
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
}) {
  const roi = campaign.budget && campaign.revenue
    ? ((campaign.revenue - campaign.budget) / campaign.budget * 100).toFixed(0)
    : null;

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <Link href={`/planning/campaigns/${campaign.id}`} className="block group">
          <p className="font-medium text-sm group-hover:underline">{campaign.name}</p>
          {campaign.description && <p className="text-xs text-muted-foreground line-clamp-1">{campaign.description}</p>}
        </Link>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className="text-xs" style={{ borderColor: channelColor[campaign.channel] + "40", color: channelColor[campaign.channel] }}>
          {campaign.channel}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Select value={campaign.status} onValueChange={(v) => onStatusChange(campaign.id, v as Status)}>
          <SelectTrigger className="h-7 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="py-3 px-4 text-sm">{campaign._count?.companies ?? 0}</td>
      <td className="py-3 px-4 text-sm">{campaign._count?.contacts ?? 0}</td>
      <td className="py-3 px-4 text-sm">{fmt(campaign.budget)}</td>
      <td className="py-3 px-4 text-sm text-green-600 font-medium">{fmt(campaign.revenue)}</td>
      <td className="py-3 px-4 text-sm">{campaign.leads ?? "—"}</td>
      <td className="py-3 px-4 text-sm">{roi != null ? `${roi}%` : "—"}</td>
      <td className="py-3 px-4">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(campaign.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

function AddCampaignDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<Channel>("OUTBOUND");
  const [status, setStatus] = useState<Status>("PLANNED");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("channel", channel);
    fd.set("status", status);
    try {
      await createCampaign(fd);
      setOpen(false);
      formRef.current?.reset();
      onAdded();
      toast.success("Campaign created");
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Campaign</Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Campaign Name *</Label>
            <Input name="name" required placeholder="Q2 Outbound Blitz" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => v && setChannel(v as Channel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Budget ($)</Label>
              <Input name="budget" type="number" placeholder="5000" />
            </div>
            <div className="space-y-1.5">
              <Label>Revenue ($)</Label>
              <Input name="revenue" type="number" placeholder="25000" />
            </div>
            <div className="space-y-1.5">
              <Label>Leads</Label>
              <Input name="leads" type="number" placeholder="50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input name="startDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input name="endDate" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea name="description" rows={2} placeholder="What's the goal of this campaign?" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Campaign"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function CampaignsClient({ campaigns: initial }: { campaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initial);

  async function handleStatusChange(id: string, status: Status) {
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    await updateCampaignStatus(id, status as Parameters<typeof updateCampaignStatus>[1]);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign?")) return;
    await deleteCampaign(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Deleted");
  }

  const chartData = CHANNELS.map((ch) => {
    const channelCampaigns = campaigns.filter((c) => c.channel === ch);
    return {
      channel: ch.charAt(0) + ch.slice(1).toLowerCase(),
      budget: channelCampaigns.reduce((s, c) => s + (c.budget ?? 0), 0),
      revenue: channelCampaigns.reduce((s, c) => s + (c.revenue ?? 0), 0),
    };
  }).filter((d) => d.budget > 0 || d.revenue > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
                <AddCampaignDialog onAdded={() => window.location.reload()} />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">Budget vs Revenue by Channel</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, ""]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="budget" fill="#94a3b8" name="Budget" radius={[2, 2, 0, 0]} />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {campaigns.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-3">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm text-muted-foreground">Create your first GTM campaign and track its budget, leads, and revenue.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left">
                {["Campaign", "Channel", "Status", "Companies", "Contacts", "Budget", "Revenue", "Leads", "ROI", ""].map((h) => (
                  <th key={h} className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <CampaignRow key={c.id} campaign={c} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
