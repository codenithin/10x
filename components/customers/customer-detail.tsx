"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Globe, ExternalLink, MapPin, Users, Banknote,
  Calendar, Building2, Phone, Link2, Plus, X, Check, Pencil,
  Sparkles, Tag,
} from "lucide-react";
import { linkCustomerToCompetitor, unlinkCustomerFromCompetitor, updateCompetitorNotes } from "@/lib/actions/customers";
import { toast } from "sonner";

const COUNTRY_FLAGS: Record<string, string> = {
  Denmark: "🇩🇰", Finland: "🇫🇮", Sweden: "🇸🇪", Norway: "🇳🇴",
  Iceland: "🇮🇸", Germany: "🇩🇪", Netherlands: "🇳🇱",
};

function fmt(n: number | null) {
  if (!n) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function domain(url: string | null) {
  return url?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? null;
}

interface CompetitorLink {
  competitorId: string;
  competitor: { id: string; name: string; website: string | null; positioning: string | null };
}

interface Customer {
  id: string;
  name: string;
  identifier: string | null;
  website: string | null;
  industry: string | null;
  employees: number | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  annualRevenue: number | null;
  foundedYear: number | null;
  logoUrl: string | null;
  linkedinUrl: string | null;
  accountOwner: string | null;
  accountStage: string | null;
  description: string | null;
  notes: string | null;
  competitors: CompetitorLink[];
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ customer }: { customer: Customer }) {
  const [failed, setFailed] = useState(false);
  const hue = (customer.name.charCodeAt(0) * 37 + (customer.name.charCodeAt(1) ?? 0) * 13) % 360;

  if (!customer.logoUrl || failed) {
    return (
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
        style={{ backgroundColor: `hsl(${hue} 55% 52%)` }}>
        {customer.name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="w-16 h-16 rounded-2xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
      <Image src={customer.logoUrl} alt={customer.name} width={64} height={64}
        className="object-contain" onError={() => setFailed(true)} unoptimized />
    </div>
  );
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

function Tile({ icon: Icon, label, children, className = "", action }: {
  icon: React.ElementType; label: string; children: React.ReactNode; className?: string; action?: React.ReactNode;
}) {
  return (
    <div className={`bg-card rounded-2xl border border-border/60 p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <div className="text-[13px] font-medium mt-0.5">{value ?? "—"}</div>
      </div>
    </div>
  );
}

// ─── Notes tile ───────────────────────────────────────────────────────────────

function NotesTile({ customerId, initialNotes }: { customerId: string; initialNotes: string | null }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      // Re-use competitor notes action signature via a server action
      // For now use a direct fetch — we'll add a customer notes action
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditing(false);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tile icon={Sparkles} label="Internal Notes"
      action={
        editing ? (
          <div className="flex gap-1.5">
            <Button size="sm" className="h-6 px-2 text-[11px] gap-1" onClick={save} disabled={saving}>
              <Check className="h-3 w-3" />{saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => { setEditing(false); setNotes(initialNotes ?? ""); }}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1 text-muted-foreground" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )
      }
    >
      {editing ? (
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this account..." rows={5} className="text-sm resize-none" autoFocus />
      ) : notes ? (
        <p className="text-sm whitespace-pre-wrap">{notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No notes yet. Click Edit to add.</p>
      )}
    </Tile>
  );
}

// ─── Competitor links tile ────────────────────────────────────────────────────

function CompetitorsTile({ customerId, linked, allCompetitors }: {
  customerId: string;
  linked: CompetitorLink[];
  allCompetitors: { id: string; name: string; website: string | null }[];
}) {
  const [links, setLinks] = useState(linked);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);

  const linkedIds = new Set(links.map((l) => l.competitorId));
  const available = allCompetitors.filter((c) => !linkedIds.has(c.id));

  async function handleLink() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await linkCustomerToCompetitor(selectedId, customerId);
      const comp = allCompetitors.find((c) => c.id === selectedId)!;
      setLinks((prev) => [...prev, { competitorId: selectedId, competitor: { ...comp, positioning: null } }]);
      setSelectedId("");
      setAddOpen(false);
      toast.success("Competitor linked");
    } catch { toast.error("Failed"); } finally { setLoading(false); }
  }

  async function handleUnlink(competitorId: string) {
    try {
      await unlinkCustomerFromCompetitor(competitorId, customerId);
      setLinks((prev) => prev.filter((l) => l.competitorId !== competitorId));
      toast.success("Removed");
    } catch { toast.error("Failed"); }
  }

  return (
    <Tile icon={Building2} label="Competing Tools Evaluated"
      action={
        available.length > 0 && (
          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="h-3 w-3" /> Link
          </Button>
        )
      }
    >
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No competitors linked yet.</p>
      ) : (
        <div className="space-y-2">
          {links.map(({ competitor, competitorId }) => (
            <div key={competitorId} className="flex items-center justify-between group rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/30 transition-colors">
              <Link href={`/market-research/competitors/${competitorId}`} className="text-[13px] font-medium hover:text-primary transition-colors">
                {competitor.name}
              </Link>
              <button onClick={() => handleUnlink(competitorId)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Link Competitor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select competitor..." /></SelectTrigger>
              <SelectContent>
                {available.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleLink} disabled={!selectedId || loading}>{loading ? "Linking..." : "Link"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tile>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CustomerDetailClient({ customer, allCompetitors }: {
  customer: Customer;
  allCompetitors: { id: string; name: string; website: string | null }[];
}) {
  const flag = COUNTRY_FLAGS[customer.country ?? ""] ?? "";
  const stageColor: Record<string, string> = {
    Cold: "bg-blue-500/10 text-blue-700 border-blue-200",
    Warm: "bg-orange-500/10 text-orange-700 border-orange-200",
    Hot: "bg-red-500/10 text-red-700 border-red-200",
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/customers" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> All Customers
        </Link>

        <div className="flex items-start gap-5">
          <Logo customer={customer} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
              {customer.accountStage && (
                <Badge variant="outline" className={`text-[11px] ${stageColor[customer.accountStage] ?? ""}`}>
                  {customer.accountStage}
                </Badge>
              )}
            </div>
            {customer.identifier && (
              <p className="text-[12px] font-mono text-muted-foreground mt-0.5">{customer.identifier}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {customer.country && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <MapPin className="h-3 w-3" />{flag} {customer.city ? `${customer.city}, ` : ""}{customer.country}
                </Badge>
              )}
              {customer.industry && (
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <Tag className="h-3 w-3" />{customer.industry}
                </Badge>
              )}
              {customer.employees && (
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <Users className="h-3 w-3" />{customer.employees.toLocaleString()} employees
                </Badge>
              )}
              {customer.foundedYear && (
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <Calendar className="h-3 w-3" />Est. {customer.foundedYear}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 1 — About + Financials + Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile icon={Building2} label="About" className="md:col-span-2">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {customer.description ?? <span className="italic">No description available.</span>}
          </p>
        </Tile>

        <Tile icon={Banknote} label="Financials & Contact">
          <div className="space-y-4">
            {customer.annualRevenue && (
              <InfoRow icon={Banknote} label="Annual Revenue" value={<span className="text-green-600 font-semibold">{fmt(customer.annualRevenue)}</span>} />
            )}
            {customer.employees && (
              <InfoRow icon={Users} label="Employees" value={customer.employees.toLocaleString()} />
            )}
            {customer.phone && (
              <InfoRow icon={Phone} label="Phone" value={<a href={`tel:${customer.phone}`} className="hover:text-primary transition-colors">{customer.phone}</a>} />
            )}
            {customer.website && (
              <InfoRow icon={Globe} label="Website"
                value={
                  <a href={customer.website} target="_blank" rel="noopener noreferrer"
                    className="hover:text-primary transition-colors flex items-center gap-1">
                    {domain(customer.website)} <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
            {customer.linkedinUrl && (
              <InfoRow icon={Link2} label="LinkedIn"
                value={
                  <a href={customer.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="hover:text-primary transition-colors flex items-center gap-1">
                    View profile <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
            {customer.accountOwner && (
              <InfoRow icon={Users} label="Account Owner" value={customer.accountOwner} />
            )}
          </div>
        </Tile>
      </div>

      {/* Row 2 — Competitors + Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CompetitorsTile
          customerId={customer.id}
          linked={customer.competitors}
          allCompetitors={allCompetitors}
        />
        <NotesTile customerId={customer.id} initialNotes={customer.notes} />
      </div>
    </div>
  );
}
