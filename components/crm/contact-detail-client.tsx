"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Handshake,
  Mail,
  Megaphone,
  Phone,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { updateContact, deleteContact } from "@/lib/actions/crm";
import { toast } from "sonner";

type Channel = "OUTBOUND" | "CONTENT" | "PAID" | "PARTNERSHIPS" | "SEO" | "EVENTS" | "REFERRAL" | "OTHER";
type Status = "PLANNED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

interface ContactDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  linkedin: string | null;
  icpScore: number | null;
  icpNotes: string | null;
  source: string;
  companyId: string | null;
  company: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  deals: { id: string; name: string; value: number; stage: string }[];
  campaigns: {
    campaignId: string;
    campaign: { id: string; name: string; channel: Channel; status: Status };
  }[];
}

const channelColor: Record<string, string> = {
  OUTBOUND: "#6366f1", CONTENT: "#8b5cf6", PAID: "#f59e0b", PARTNERSHIPS: "#10b981",
  SEO: "#3b82f6", EVENTS: "#ef4444", REFERRAL: "#ec4899", OTHER: "#6b7280",
};

function money(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function icpColor(score: number | null) {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-green-500/10 text-green-700 border-green-200";
  if (score >= 60) return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
  return "bg-red-500/10 text-red-700 border-red-200";
}

export function ContactDetailClient({
  contact,
  companies,
}: {
  contact: ContactDetail;
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [companyId, setCompanyId] = useState<string>(contact.companyId ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    fd.set("companyId", companyId);
    try {
      await updateContact(contact.id, fd);
      toast.success("Saved");
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!confirm(`Delete ${contact.name}?`)) return;
    startTransition(async () => {
      try {
        await deleteContact(contact.id);
        toast.success("Deleted");
        router.push("/crm/contacts");
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/crm/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Contacts
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {/* Hero header */}
      <div className="flex items-start gap-4">
        <Avatar size="lg" className="size-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
          <AvatarFallback className="text-base font-semibold text-foreground/80">
            {initials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{contact.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {contact.title && <span>{contact.title}</span>}
            {contact.company && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <Link
                  href={`/crm/companies/${contact.company.id}`}
                  className="hover:text-foreground inline-flex items-center gap-1"
                >
                  <Building2 className="h-3.5 w-3.5" /> {contact.company.name}
                </Link>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pt-1">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Mail className="h-3.5 w-3.5" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="h-3.5 w-3.5" /> {contact.phone}
              </a>
            )}
            {contact.linkedin && (
              <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
                LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        {contact.icpScore != null && (
          <Badge variant="outline" className={`text-xs gap-1 ${icpColor(contact.icpScore)}`}>
            <Star className="h-3 w-3" />
            ICP {Math.round(contact.icpScore)}
          </Badge>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <SectionCard title="Profile">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name *" name="name" defaultValue={contact.name} required />
              <Field label="Job Title" name="title" defaultValue={contact.title ?? ""} />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Company</Label>
                <Select value={companyId || "__none__"} onValueChange={(v) => setCompanyId(v === "__none__" || !v ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Source" name="source" defaultValue={contact.source} />
            </div>
          </SectionCard>

          <SectionCard title="Contact" subtitle="How to reach them">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" name="email" type="email" defaultValue={contact.email ?? ""} placeholder="name@company.com" />
              <Field label="Phone" name="phone" defaultValue={contact.phone ?? ""} placeholder="+1 555 0100" />
              <Field label="LinkedIn URL" name="linkedin" defaultValue={contact.linkedin ?? ""} placeholder="https://linkedin.com/in/..." />
              <Field label="ICP Score (0-100)" name="icpScore" type="number" defaultValue={contact.icpScore ?? ""} placeholder="—" />
            </div>
          </SectionCard>

          <SectionCard title="Notes & Challenges" subtitle="Pain points, fit notes, conversation history">
            <TextField label="" name="icpNotes" defaultValue={contact.icpNotes ?? ""} rows={8} />
          </SectionCard>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.refresh()}>Reset</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>

        {/* Right rail */}
        <aside className="space-y-6">
          <Card>
            <CardContent className="p-4 grid grid-cols-3 gap-3">
              <Stat icon={<Megaphone className="h-3.5 w-3.5" />} label="Campaigns" value={contact.campaigns.length} />
              <Stat icon={<Handshake className="h-3.5 w-3.5" />} label="Deals" value={contact.deals.length} />
              <Stat icon={<Star className="h-3.5 w-3.5" />} label="ICP" value={contact.icpScore == null ? "—" : Math.round(contact.icpScore)} />
            </CardContent>
          </Card>

          {contact.company && (
            <RailSection title="Company" count={1} empty="">
              <Link
                href={`/crm/companies/${contact.company.id}`}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Avatar size="sm" className="bg-muted">
                  <AvatarFallback className="text-[10px]">{initials(contact.company.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{contact.company.name}</p>
                </div>
              </Link>
            </RailSection>
          )}

          <RailSection title="Campaigns" count={contact.campaigns.length} empty="Not in any campaign yet.">
            <div className="space-y-1.5">
              {contact.campaigns.map((cc) => (
                <Link
                  key={cc.campaignId}
                  href={`/planning/campaigns/${cc.campaign.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <span className="text-sm font-medium truncate">{cc.campaign.name}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 shrink-0"
                    style={{ borderColor: channelColor[cc.campaign.channel] + "60", color: channelColor[cc.campaign.channel] }}
                  >
                    {cc.campaign.channel}
                  </Badge>
                </Link>
              ))}
            </div>
          </RailSection>

          <RailSection title="Deals" count={contact.deals.length} empty="No deals for this contact.">
            <div className="space-y-1.5">
              {contact.deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.stage}</p>
                  </div>
                  <span className="text-sm font-medium">{money(d.value)}</span>
                </div>
              ))}
            </div>
          </RailSection>

          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <p>Created {formatDate(contact.createdAt)}</p>
            <p>Updated {formatDate(contact.updatedAt)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center text-center gap-0.5 py-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xl font-semibold leading-none mt-1">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground/70">{subtitle}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function RailSection({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {title} <span className="text-muted-foreground/60 font-normal">· {count}</span>
      </h3>
      {count === 0
        ? <p className="text-xs text-muted-foreground/70 italic px-1">{empty}</p>
        : children}
    </div>
  );
}

function Field({ label, name, type = "text", required, placeholder, defaultValue }: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  );
}

function TextField({ label, name, rows = 3, defaultValue }: {
  label: string;
  name: string;
  rows?: number;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>}
      <Textarea id={name} name={name} rows={rows} defaultValue={defaultValue} className="resize-y" />
    </div>
  );
}
