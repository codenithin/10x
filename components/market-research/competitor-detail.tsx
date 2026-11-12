"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
  ArrowLeft, ExternalLink, Sparkles, RefreshCw,
  Plus, X, Users, MapPin, Banknote, Calendar,
  Target, ShieldAlert, TrendingUp, Zap,
  Globe, StickyNote, Check, Pencil,
} from "lucide-react";
import { linkCustomerToCompetitor, unlinkCustomerFromCompetitor, createCustomer, updateCompetitorNotes } from "@/lib/actions/customers";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Customer {
  id: string;
  name: string;
  identifier: string | null;
  website: string | null;
  industry: string | null;
}

interface CompetitorCustomerLink {
  customerId: string;
  customer: Customer;
}

interface Competitor {
  id: string;
  name: string;
  website: string | null;
  positioning: string | null;
  pricing: string | null;
  strengths: string | null;
  weaknesses: string | null;
  opportunities: string | null;
  threats: string | null;
  notes: string | null;
  aiSummary: string | null;
  lastAnalyzedAt: string | null;
  customers: CompetitorCustomerLink[];
}

function parsePositioning(positioning: string | null) {
  if (!positioning) return { focus: null, hq: null, funding: null, founded: null };
  const parts = positioning.split(" · ");
  const get = (prefix: string) => {
    const p = parts.find((s) => s.startsWith(prefix));
    return p ? p.replace(prefix, "").trim() : null;
  };
  return {
    hq: get("HQ: "),
    funding: get("Funding: "),
    founded: get("Founded: "),
    focus: parts.find((s) => !s.startsWith("HQ:") && !s.startsWith("Funding:") && !s.startsWith("Founded:")) ?? null,
  };
}

function domainFromUrl(url: string | null) {
  if (!url) return null;
  return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
}

function CompanyLogo({ name, website, size = 12 }: { name: string; website: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const domain = domainFromUrl(website);
  const initials = name.slice(0, 2).toUpperCase();
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(1 % name.length) * 13) % 360;
  const px = size * 4;

  if (!domain || failed) {
    return (
      <div
        className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-white font-bold shrink-0`}
        style={{ backgroundColor: `hsl(${hue} 55% 52%)`, fontSize: size > 10 ? 18 : 12, width: px, height: px }}
      >
        {initials}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: px, height: px }}>
      <Image src={`https://logo.clearbit.com/${domain}`} alt={name} width={px} height={px}
        className="object-contain" onError={() => setFailed(true)} unoptimized />
    </div>
  );
}

// ─── Info tile ────────────────────────────────────────────────────────────────

function Tile({
  icon: Icon, label, children, className = "", action,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
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

// ─── Bullet list tile content ─────────────────────────────────────────────────

function BulletList({ text, emptyMsg }: { text: string | null; emptyMsg: string }) {
  if (!text) return <p className="text-sm text-muted-foreground italic">{emptyMsg}</p>;
  const lines = text.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  return (
    <ul className="space-y-2">
      {lines.map((l, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Editable notes tile ──────────────────────────────────────────────────────

function NotesTile({ competitorId, initialNotes }: { competitorId: string; initialNotes: string | null }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateCompetitorNotes(competitorId, notes);
      setEditing(false);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tile icon={StickyNote} label="Internal Notes"
      action={
        editing
          ? <div className="flex gap-1.5">
              <Button size="sm" className="h-6 px-2 text-[11px] gap-1" onClick={save} disabled={saving}>
                <Check className="h-3 w-3" />{saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => { setEditing(false); setNotes(initialNotes ?? ""); }}>
                Cancel
              </Button>
            </div>
          : <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1 text-muted-foreground" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
      }
    >
      {editing ? (
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this competitor..."
          rows={5}
          className="text-sm resize-none"
          autoFocus
        />
      ) : notes ? (
        <p className="text-sm whitespace-pre-wrap">{notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No notes yet. Click Edit to add.</p>
      )}
    </Tile>
  );
}

// ─── Customers tile ───────────────────────────────────────────────────────────

function CustomersTile({
  competitorId,
  linked,
  allCustomers,
}: {
  competitorId: string;
  linked: CompetitorCustomerLink[];
  allCustomers: Customer[];
}) {
  const [customers, setCustomers] = useState(linked);
  const [addOpen, setAddOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const linkedIds = new Set(customers.map((c) => c.customerId));
  const available = allCustomers.filter((c) => !linkedIds.has(c.id));

  async function handleLink() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await linkCustomerToCompetitor(competitorId, selectedId);
      const cust = allCustomers.find((c) => c.id === selectedId)!;
      setCustomers((prev) => [...prev, { customerId: selectedId, customer: cust }]);
      setSelectedId("");
      setAddOpen(false);
      toast.success("Customer linked");
    } catch {
      toast.error("Failed to link");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlink(customerId: string) {
    try {
      await unlinkCustomerFromCompetitor(competitorId, customerId);
      setCustomers((prev) => prev.filter((c) => c.customerId !== customerId));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  }

  async function handleCreateAndLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const newCust = await createCustomer(fd);
      await linkCustomerToCompetitor(competitorId, newCust.id);
      setCustomers((prev) => [...prev, { customerId: newCust.id, customer: newCust as Customer }]);
      setNewOpen(false);
      formRef.current?.reset();
      toast.success("Customer created and linked");
    } catch {
      toast.error("Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tile icon={Users} label="Customers Evaluating This"
      action={
        <div className="flex gap-1">
          {available.length > 0 && (
            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3" /> Link
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" onClick={() => setNewOpen(true)}>
            <Plus className="h-3 w-3" /> New
          </Button>
        </div>
      }
    >
      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No customers linked yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {customers.map(({ customer, customerId }) => (
            <div key={customerId}
              className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5 group">
              <div>
                <p className="text-[12px] font-medium leading-tight">{customer.name}</p>
                {customer.identifier && (
                  <p className="text-[10px] text-muted-foreground font-mono">{customer.identifier}</p>
                )}
              </div>
              <button
                onClick={() => handleUnlink(customerId)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link existing */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Link Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
              <SelectContent>
                {available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.identifier ? ` · ${c.identifier}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleLink} disabled={!selectedId || loading}>
                {loading ? "Linking..." : "Link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create new */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
          <form ref={formRef} onSubmit={handleCreateAndLink} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input name="name" required placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label>Identifier <span className="text-muted-foreground text-xs">(unique short code)</span></Label>
              <Input name="identifier" placeholder="ACME-001" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input name="industry" placeholder="SaaS, Retail..." />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input name="website" type="url" placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} placeholder="Context about this customer..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create & Link"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Tile>
  );
}

// ─── AI analysis tile ─────────────────────────────────────────────────────────

function AITile({ competitor }: { competitor: Competitor }) {
  const [aiText, setAiText] = useState(competitor.aiSummary ?? "");
  const [streaming, setStreaming] = useState(false);

  async function run() {
    setStreaming(true);
    setAiText("");
    try {
      const res = await fetch("/api/ai/market-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorId: competitor.id,
          competitorName: competitor.name,
          website: competitor.website,
        }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiText(text);
      }
      toast.success("Analysis complete");
    } catch {
      toast.error("Analysis failed");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Tile icon={Sparkles} label="AI Analysis"
      action={
        <Button size="sm" variant={aiText ? "outline" : "default"} className="h-7 text-[12px] gap-1.5" onClick={run} disabled={streaming}>
          {streaming ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {streaming ? "Analyzing..." : aiText ? "Refresh Analysis" : "Generate Analysis"}
        </Button>
      }
    >
      {aiText ? (
        <div className="prose prose-sm max-w-none text-[13px] leading-relaxed">
          <ReactMarkdown>{aiText}</ReactMarkdown>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">No analysis yet</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Click Generate to get Claude's full competitive intelligence on {competitor.name}
            </p>
          </div>
        </div>
      )}
    </Tile>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CompetitorDetail({
  competitor,
  allCustomers,
}: {
  competitor: Competitor;
  allCustomers: Customer[];
}) {
  const { focus, hq, funding, founded } = parsePositioning(competitor.positioning);
  const domain = domainFromUrl(competitor.website);
  const lastAnalyzed = competitor.lastAnalyzedAt
    ? new Date(competitor.lastAnalyzedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/market-research/competitors"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> All Competitors
        </Link>

        <div className="flex items-start gap-5">
          <CompanyLogo name={competitor.name} website={competitor.website} size={16} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{competitor.name}</h1>
            {competitor.website && (
              <a href={competitor.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mt-0.5">
                <Globe className="h-3.5 w-3.5" />
                {domain}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {hq && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <MapPin className="h-3 w-3" />{hq}
                </Badge>
              )}
              {funding && funding !== "—" && (
                <Badge variant="outline" className="gap-1 text-[11px] text-primary border-primary/30">
                  <Banknote className="h-3 w-3" />{funding}
                </Badge>
              )}
              {founded && (
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <Calendar className="h-3 w-3" />Est. {founded}
                </Badge>
              )}
              {lastAnalyzed && (
                <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" />Analyzed {lastAnalyzed}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 1 — Focus + Pricing + Customers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile icon={Globe} label="Focus & Positioning">
          <p className="text-sm leading-relaxed">{focus ?? <span className="text-muted-foreground italic">Not specified</span>}</p>
        </Tile>

        <Tile icon={Banknote} label="Pricing">
          <p className="text-sm leading-relaxed">
            {competitor.pricing ?? <span className="text-muted-foreground italic">Unknown pricing</span>}
          </p>
        </Tile>

        <CustomersTile
          competitorId={competitor.id}
          linked={competitor.customers}
          allCustomers={allCustomers}
        />
      </div>

      {/* Row 2 — Strengths + Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Tile icon={TrendingUp} label="Strengths">
          <BulletList text={competitor.strengths} emptyMsg="No strengths recorded yet." />
        </Tile>
        <Tile icon={ShieldAlert} label="Weaknesses">
          <BulletList text={competitor.weaknesses} emptyMsg="No weaknesses recorded yet." />
        </Tile>
      </div>

      {/* Row 3 — Opportunities + Threats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Tile icon={Zap} label="Opportunities for Nvelop">
          <BulletList text={competitor.opportunities} emptyMsg="Run AI analysis to surface opportunities." />
        </Tile>
        <Tile icon={Target} label="Threats to Nvelop">
          <BulletList text={competitor.threats} emptyMsg="Run AI analysis to surface threats." />
        </Tile>
      </div>

      {/* Row 4 — Notes + AI full width */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NotesTile competitorId={competitor.id} initialNotes={competitor.notes} />
        <AITile competitor={competitor} />
      </div>
    </div>
  );
}
