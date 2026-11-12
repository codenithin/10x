"use client";

import { useEffect, useState, useTransition } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Globe,
  Handshake,
  Loader2,
  Megaphone,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { updateCompany, deleteCompany } from "@/lib/actions/crm";
import { enrichCompany, applyEnrichment, type CompanyEnrichment } from "@/lib/actions/ai-enrich";
import { toast } from "sonner";

type EnrichField =
  | "website"
  | "industry"
  | "country"
  | "employeeCount"
  | "revenue"
  | "description"
  | "sourcingSolution"
  | "sourcingNotes"
  | "erpSolution"
  | "erpNotes";

const ENRICH_FIELDS: { key: EnrichField; label: string; multiline?: boolean; isNumber?: boolean; isCurrency?: boolean }[] = [
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
  { key: "employeeCount", label: "Employees", isNumber: true },
  { key: "revenue", label: "Revenue", isNumber: true, isCurrency: true },
  { key: "description", label: "Description", multiline: true },
  { key: "sourcingSolution", label: "Sourcing Solution" },
  { key: "sourcingNotes", label: "Sourcing Notes", multiline: true },
  { key: "erpSolution", label: "ERP" },
  { key: "erpNotes", label: "ERP Notes", multiline: true },
];

function formatNumberDisplay(raw: string, isCurrency: boolean): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (isCurrency) {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n}`;
  }
  return n.toLocaleString();
}

function currentValueAsString(company: CompanyDetail, key: EnrichField): string {
  const v = company[key];
  if (v == null) return "";
  return String(v);
}

type Channel = "OUTBOUND" | "CONTENT" | "PAID" | "PARTNERSHIPS" | "SEO" | "EVENTS" | "REFERRAL" | "OTHER";
type Status = "PLANNED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

interface CompanyDetail {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  employeeCount: number | null;
  revenue: number | null;
  country: string | null;
  description: string | null;
  sourcingSolution: string | null;
  sourcingNotes: string | null;
  erpSolution: string | null;
  erpNotes: string | null;
  createdAt: string;
  updatedAt: string;
  contacts: { id: string; name: string; title: string | null; email: string | null }[];
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

function money(n: number | null) {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
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

export function CompanyDetailClient({ company }: { company: CompanyDetail }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [enriching, setEnriching] = useState(false);
  const [enrichment, setEnrichment] = useState<CompanyEnrichment | null>(null);

  async function handleEnrich() {
    setEnriching(true);
    try {
      const result = await enrichCompany(company.id);
      setEnrichment(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Enrichment failed";
      toast.error(msg);
    } finally {
      setEnriching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCompany(company.id, new FormData(e.currentTarget));
      toast.success("Saved");
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!confirm(`Delete ${company.name}? Contacts and deals stay but become orphaned.`)) return;
    startTransition(async () => {
      try {
        await deleteCompany(company.id);
        toast.success("Deleted");
        router.push("/crm/companies");
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
          href="/crm/companies"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Companies
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={handleEnrich}
            disabled={enriching}
          >
            {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {enriching ? "Researching..." : "Enrich with AI"}
          </Button>
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
      </div>

      {/* Hero header */}
      <div className="flex items-start gap-4">
        <Avatar size="lg" className="size-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
          <AvatarFallback className="text-base font-semibold text-foreground/80">
            {initials(company.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{company.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {company.industry && <span>{company.industry}</span>}
            {company.country && <><span className="text-muted-foreground/40">·</span><span>{company.country}</span></>}
            {company.employeeCount != null && (
              <><span className="text-muted-foreground/40">·</span><span>{company.employeeCount.toLocaleString()} employees</span></>
            )}
            {company.revenue != null && (
              <><span className="text-muted-foreground/40">·</span><span>{money(company.revenue)} revenue</span></>
            )}
            {company.website && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {company.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <SectionCard title="Profile">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company Name *" name="name" defaultValue={company.name} required />
              <Field label="Website" name="website" type="url" defaultValue={company.website ?? ""} placeholder="https://acme.com" />
              <Field label="Industry" name="industry" defaultValue={company.industry ?? ""} />
              <Field label="Country" name="country" defaultValue={company.country ?? ""} />
              <Field label="Employees" name="employeeCount" type="number" defaultValue={company.employeeCount ?? ""} />
              <Field label="Revenue ($)" name="revenue" type="number" defaultValue={company.revenue ?? ""} />
            </div>
            <TextField label="Description" name="description" defaultValue={company.description ?? ""} rows={2} />
          </SectionCard>

          <SectionCard title="Current Stack" subtitle="What they use today">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Field label="Sourcing Solution" name="sourcingSolution" defaultValue={company.sourcingSolution ?? ""} placeholder="Coupa, Jaggaer, Ivalua..." />
                <TextField label="Sourcing Notes" name="sourcingNotes" defaultValue={company.sourcingNotes ?? ""} rows={5} />
              </div>
              <div className="space-y-4">
                <Field label="ERP" name="erpSolution" defaultValue={company.erpSolution ?? ""} placeholder="SAP, Oracle, NetSuite..." />
                <TextField label="ERP Notes" name="erpNotes" defaultValue={company.erpNotes ?? ""} rows={5} />
              </div>
            </div>
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
              <Stat icon={<UserRound className="h-3.5 w-3.5" />} label="Contacts" value={company.contacts.length} />
              <Stat icon={<Megaphone className="h-3.5 w-3.5" />} label="Campaigns" value={company.campaigns.length} />
              <Stat icon={<Handshake className="h-3.5 w-3.5" />} label="Deals" value={company.deals.length} />
            </CardContent>
          </Card>

          <RailSection title="Campaigns" count={company.campaigns.length} empty="Not in any campaign yet.">
            <div className="space-y-1.5">
              {company.campaigns.map((cc) => (
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

          <RailSection title="Contacts" count={company.contacts.length} empty="No contacts at this company.">
            <div className="space-y-1">
              {company.contacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/crm/contacts/${c.id}`}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Avatar size="sm" className="bg-muted">
                    <AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.title && <p className="text-xs text-muted-foreground truncate">{c.title}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </RailSection>

          <RailSection title="Deals" count={company.deals.length} empty="No deals associated.">
            <div className="space-y-1.5">
              {company.deals.map((d) => (
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
            <p>Created {formatDate(company.createdAt)}</p>
            <p>Updated {formatDate(company.updatedAt)}</p>
          </div>
        </aside>
      </div>

      <EnrichReviewDialog
        company={company}
        enrichment={enrichment}
        onClose={() => setEnrichment(null)}
        onApplied={() => {
          setEnrichment(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function EnrichReviewDialog({
  company,
  enrichment,
  onClose,
  onApplied,
}: {
  company: CompanyDetail;
  enrichment: CompanyEnrichment | null;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [selected, setSelected] = useState<Set<EnrichField>>(new Set());
  const [applying, setApplying] = useState(false);

  // Default-select fields where the AI proposed a non-empty value AND
  // the current value is empty (most useful diff)
  useEffect(() => {
    if (!enrichment) {
      setSelected(new Set());
      return;
    }
    const next = new Set<EnrichField>();
    for (const { key } of ENRICH_FIELDS) {
      const proposed = enrichment[key];
      const current = currentValueAsString(company, key);
      if (proposed && proposed.trim() !== "" && current.trim() === "") next.add(key);
    }
    setSelected(next);
  }, [enrichment, company]);

  function toggle(key: EnrichField) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function apply() {
    if (!enrichment) return;
    if (selected.size === 0) {
      onClose();
      return;
    }
    setApplying(true);
    const payload: Record<string, string> = {};
    for (const key of selected) payload[key] = enrichment[key];
    try {
      await applyEnrichment(company.id, payload);
      toast.success(`Applied ${selected.size} ${selected.size === 1 ? "field" : "fields"}`);
      onApplied();
    } catch {
      toast.error("Failed to apply");
    } finally {
      setApplying(false);
    }
  }

  const confidenceColor =
    enrichment?.confidence === "high"
      ? "bg-green-500/10 text-green-700 border-green-200"
      : enrichment?.confidence === "medium"
        ? "bg-yellow-500/10 text-yellow-700 border-yellow-200"
        : "bg-red-500/10 text-red-700 border-red-200";

  return (
    <Dialog open={enrichment !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Research Results
          </DialogTitle>
        </DialogHeader>

        {enrichment && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className={`text-xs ${confidenceColor}`}>
                Confidence: {enrichment.confidence}
              </Badge>
              <p className="text-xs text-muted-foreground flex-1 min-w-0">{enrichment.reasoning}</p>
            </div>

            <div className="space-y-3">
              {ENRICH_FIELDS.map(({ key, label, multiline, isNumber, isCurrency }) => {
                const proposedRaw = enrichment[key] ?? "";
                const currentRaw = currentValueAsString(company, key);
                const isChecked = selected.has(key);
                const hasProposal = proposedRaw.trim() !== "";
                const proposedDisplay = isNumber && hasProposal
                  ? formatNumberDisplay(proposedRaw, isCurrency ?? false)
                  : proposedRaw;
                const currentDisplay = isNumber && currentRaw
                  ? formatNumberDisplay(currentRaw, isCurrency ?? false)
                  : currentRaw;
                const isDifferent = currentRaw.trim() !== "" && currentRaw !== proposedRaw;
                return (
                  <div
                    key={key}
                    className={`rounded-lg border p-3 transition-colors ${
                      isChecked ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!hasProposal}
                        onChange={() => toggle(key)}
                        className="mt-1 size-4 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{label}</p>
                          {!hasProposal && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              No evidence
                            </span>
                          )}
                        </div>
                        {hasProposal && (
                          <div className={`text-sm ${multiline ? "whitespace-pre-wrap" : ""}`}>
                            {proposedDisplay}
                          </div>
                        )}
                        {isDifferent && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Current:</span>{" "}
                            <span className={multiline ? "whitespace-pre-wrap" : ""}>{currentDisplay}</span>
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>

            {enrichment.sources.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources</p>
                <ul className="space-y-1">
                  {enrichment.sources.map((src, i) => (
                    <li key={i} className="text-xs">
                      <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 break-all"
                      >
                        {src}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={applying}>Cancel</Button>
          <Button onClick={apply} disabled={applying || selected.size === 0}>
            {applying ? "Applying..." : `Apply ${selected.size} field${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <Textarea id={name} name={name} rows={rows} defaultValue={defaultValue} className="resize-y" />
    </div>
  );
}
