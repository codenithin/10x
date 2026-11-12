"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus, Sparkles, Trash2, Globe, RefreshCw,
  ExternalLink, LayoutGrid, List, Search,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { createCompetitor, deleteCompetitor } from "@/lib/actions/competitors";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Customer {
  id: string;
  name: string;
  identifier: string | null;
}

interface Competitor {
  id: string;
  name: string;
  website: string | null;
  positioning: string | null;
  pricing: string | null;
  strengths: string | null;
  weaknesses: string | null;
  aiSummary: string | null;
  lastAnalyzedAt: string | null;
  customers: { customerId: string; customer: Customer }[];
}

type SortKey = "name" | "hq" | "funding" | "founded";
type SortDir = "asc" | "desc";

// Positioning stored as "Focus · HQ: Location · Funding: Amount · Founded: Year"
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

// Extract numeric funding value for sorting (e.g. "$5M Seed" → 5_000_000)
function fundingToNumber(funding: string | null): number {
  if (!funding || funding === "—") return -1;
  const lower = funding.toLowerCase();
  const match = lower.match(/([\d.]+)\s*([bm])/);
  if (!match) return 0;
  const n = parseFloat(match[1]);
  return match[2] === "b" ? n * 1_000_000_000 : n * 1_000_000;
}

function domainFromUrl(website: string | null): string | null {
  if (!website) return null;
  return website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
}

// ─── Logo with Clearbit fallback to initials ──────────────────────────────────

function CompanyLogo({ name, website }: { name: string; website: string | null }) {
  const [failed, setFailed] = useState(false);
  const domain = domainFromUrl(website);
  const initials = name.slice(0, 2).toUpperCase();
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(1 % name.length) * 13) % 360;

  if (!domain || failed) {
    return (
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
        style={{ backgroundColor: `hsl(${hue} 55% 52%)` }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="w-7 h-7 rounded-md border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
      <Image
        src={`https://logo.clearbit.com/${domain}`}
        alt={name}
        width={28}
        height={28}
        className="object-contain"
        onError={() => setFailed(true)}
        unoptimized
      />
    </div>
  );
}

// ─── AI analysis ─────────────────────────────────────────────────────────────

function useAIAnalysis(competitor: Competitor) {
  const [aiText, setAiText] = useState(competitor.aiSummary ?? "");
  const [streaming, setStreaming] = useState(false);

  async function runAnalysis() {
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
      toast.error("Analysis failed. Check API key.");
    } finally {
      setStreaming(false);
    }
  }

  return { aiText, streaming, runAnalysis };
}

// ─── Card view ────────────────────────────────────────────────────────────────

function CompetitorCard({ competitor, onDelete }: { competitor: Competitor; onDelete: (id: string) => void }) {
  const { aiText, streaming, runAnalysis } = useAIAnalysis(competitor);
  const [expanded, setExpanded] = useState(false);
  const { focus, hq, funding, founded } = parsePositioning(competitor.positioning);

  return (
    <Card className="flex flex-col border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <CompanyLogo name={competitor.name} website={competitor.website} />
            <div className="min-w-0">
              <CardTitle className="text-[14px] font-semibold truncate">{competitor.name}</CardTitle>
              {competitor.website && (
                <a href={competitor.website} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 transition-colors truncate">
                  {domainFromUrl(competitor.website)}
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="outline" size="sm" onClick={runAnalysis} disabled={streaming}
              className="h-6 text-[11px] gap-1 px-2">
              {streaming ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
              {streaming ? "..." : aiText ? "Refresh" : "Analyze"}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(competitor.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 space-y-2 flex-1">
        {focus && <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{focus}</p>}
        <div className="flex flex-wrap gap-1">
          {hq && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{hq}</Badge>}
          {funding && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/20">{funding}</Badge>}
          {founded && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{founded}</Badge>}
        </div>
        {aiText && (
          <div className="border rounded-lg p-2.5 bg-muted/30 mt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-primary" />
                AI Analysis {streaming && <span className="animate-pulse">...</span>}
              </span>
              <button onClick={() => setExpanded(!expanded)} className="text-[11px] text-muted-foreground hover:text-foreground">
                {expanded ? "Collapse" : "Expand"}
              </button>
            </div>
            <div className={`prose prose-sm max-w-none text-[12px] overflow-hidden transition-all ${expanded ? "" : "max-h-24"}`}>
              <ReactMarkdown>{aiText}</ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function CompetitorRow({ competitor, onDelete }: { competitor: Competitor; onDelete: (id: string) => void }) {
  const router = useRouter();
  const { aiText, streaming, runAnalysis } = useAIAnalysis(competitor);
  const [expanded, setExpanded] = useState(false);
  const { focus, hq, funding, founded } = parsePositioning(competitor.positioning);

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/30 transition-colors group cursor-pointer"
        onClick={() => router.push(`/market-research/competitors/${competitor.id}`)}
      >
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-2.5">
            <CompanyLogo name={competitor.name} website={competitor.website} />
            <div>
              <p className="text-[13px] font-medium group-hover:text-primary transition-colors">{competitor.name}</p>
              {competitor.website && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {domainFromUrl(competitor.website)}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="py-2.5 px-4 max-w-xs">
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">{focus ?? "—"}</p>
        </td>
        <td className="py-2.5 px-4 text-[12px] text-muted-foreground whitespace-nowrap">{hq ?? "—"}</td>
        <td className="py-2.5 px-4">
          {funding && funding !== "—"
            ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/20 whitespace-nowrap">{funding}</Badge>
            : <span className="text-[12px] text-muted-foreground">—</span>}
        </td>
        <td className="py-2.5 px-4 text-[12px] text-muted-foreground">{founded ?? "—"}</td>
        <td className="py-2.5 px-4">
          <div className="flex flex-wrap gap-1">
            {competitor.customers.slice(0, 3).map(({ customer }) => (
              <span key={customer.id} className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-medium">
                {customer.identifier ?? customer.name.slice(0, 8)}
              </span>
            ))}
            {competitor.customers.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{competitor.customers.length - 3}</span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {aiText && (
              <button onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-primary hover:underline whitespace-nowrap">
                {expanded ? "Hide AI" : "Show AI"}
              </button>
            )}
            <Button variant="outline" size="sm" onClick={runAnalysis} disabled={streaming}
              className="h-6 text-[11px] gap-1 px-2 whitespace-nowrap">
              {streaming ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
              {streaming ? "..." : aiText ? "Refresh" : "Analyze"}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(competitor.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && aiText && (
        <tr className="border-b border-border bg-muted/10">
          <td colSpan={6} className="px-4 py-3 pl-16">
            <div className="flex items-start gap-2">
              <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <div className="prose prose-sm max-w-none text-[12px]">
                <ReactMarkdown>{aiText}</ReactMarkdown>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortHeader({
  label, sortKey, active, dir, onClick,
}: {
  label: string; sortKey: SortKey; active: boolean; dir: SortDir; onClick: (k: SortKey) => void;
}) {
  return (
    <th
      className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onClick(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active
          ? dir === "asc"
            ? <ChevronUp className="h-3 w-3 text-primary" />
            : <ChevronDown className="h-3 w-3 text-primary" />
          : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </div>
    </th>
  );
}

// ─── Add dialog ───────────────────────────────────────────────────────────────

function AddCompetitorDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await createCompetitor(new FormData(e.currentTarget));
      setOpen(false);
      formRef.current?.reset();
      onAdded();
      toast.success("Competitor added");
    } catch {
      toast.error("Failed to add competitor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-1.5 h-8 text-[13px]" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add Competitor
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Competitor</DialogTitle></DialogHeader>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" name="name" required placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://acme.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="positioning">Focus / Positioning</Label>
              <Textarea id="positioning" name="positioning" placeholder="What they do and who they target..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pricing">Pricing</Label>
              <Input id="pricing" name="pricing" placeholder="$99/mo, enterprise, freemium..." />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Competitor"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CompetitorsClient({
  competitors: initial,
  customers,
}: {
  competitors: Competitor[];
  customers: Customer[];
}) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initial);
  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = [...competitors];

    if (q) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.positioning?.toLowerCase().includes(q)
      );
    }

    if (customerFilter) {
      list = list.filter((c) => c.customers.some((cc) => cc.customerId === customerFilter));
    }

    list.sort((a, b) => {
      const pa = parsePositioning(a.positioning);
      const pb = parsePositioning(b.positioning);
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "hq") cmp = (pa.hq ?? "").localeCompare(pb.hq ?? "");
      else if (sortKey === "funding") cmp = fundingToNumber(pa.funding) - fundingToNumber(pb.funding);
      else if (sortKey === "founded") cmp = parseInt(pa.founded ?? "0") - parseInt(pb.founded ?? "0");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [competitors, search, sortKey, sortDir, customerFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this competitor?")) return;
    await deleteCompetitor(id);
    setCompetitors((prev: Competitor[]) => prev.filter((c: Competitor) => c.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="p-6 space-y-3 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search competitors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-[13px]"
          />
        </div>
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
          {filtered.length} of {competitors.length}
        </span>
        <div className="flex-1" />
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button onClick={() => setView("list")}
            className={`px-2.5 py-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView("grid")}
            className={`px-2.5 py-1.5 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
        <AddCompetitorDialog onAdded={() => window.location.reload()} />
      </div>

      {/* Customer filter chips */}
      {customers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mr-1">Filter by customer:</span>
          <button
            onClick={() => setCustomerFilter(null)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${!customerFilter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
          >
            All
          </button>
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => setCustomerFilter(customerFilter === c.id ? null : c.id)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium ${customerFilter === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
            >
              {c.identifier ? `${c.name} · ${c.identifier}` : c.name}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card className="py-16">
          <CardContent className="text-center space-y-2">
            <Globe className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="font-medium text-sm">{competitors.length === 0 ? "No competitors yet" : "No matches"}</p>
            <p className="text-[12px] text-muted-foreground">
              {competitors.length === 0 ? "Add your first competitor." : "Try a different search or filter."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* List view */}
      {view === "list" && filtered.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <SortHeader label="Company" sortKey="name" active={sortKey === "name"} dir={sortDir} onClick={handleSort} />
                <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Focus</th>
                <SortHeader label="HQ" sortKey="hq" active={sortKey === "hq"} dir={sortDir} onClick={handleSort} />
                <SortHeader label="Funding" sortKey="funding" active={sortKey === "funding"} dir={sortDir} onClick={handleSort} />
                <SortHeader label="Founded" sortKey="founded" active={sortKey === "founded"} dir={sortDir} onClick={handleSort} />
                <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customers</th>
                <th className="py-2 px-4 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CompetitorRow key={c.id} competitor={c} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CompetitorCard key={c.id} competitor={c} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
