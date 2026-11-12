"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Sparkles, Trash2, TrendingUp, RefreshCw } from "lucide-react";
import { createMarketSize, generateMarketSizeAI, deleteMarketSize } from "@/lib/actions/market-size";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface MarketSize {
  id: string;
  segment: string;
  tam: number | null;
  sam: number | null;
  som: number | null;
  year: number;
  aiSummary: string | null;
  notes: string | null;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function MarketSizeCard({ ms, onDelete }: { ms: MarketSize; onDelete: (id: string) => void }) {
  const [aiText, setAiText] = useState(ms.aiSummary ?? "");
  const [loading, setLoading] = useState(false);

  async function handleAI() {
    setLoading(true);
    try {
      const text = await generateMarketSizeAI(ms.id, ms.segment, ms.notes ?? undefined);
      setAiText(text);
      toast.success("Analysis complete");
    } catch {
      toast.error("AI analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{ms.segment} ({ms.year})</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAI} disabled={loading}>
              {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loading ? "Analyzing..." : aiText ? "Refresh AI" : "AI Estimate"}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(ms.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "TAM", value: ms.tam, color: "text-blue-600", desc: "Total Addressable" },
            { label: "SAM", value: ms.sam, color: "text-purple-600", desc: "Serviceable" },
            { label: "SOM", value: ms.som, color: "text-green-600", desc: "Obtainable" },
          ].map((m) => (
            <div key={m.label} className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{m.desc}</p>
              <p className={`text-xl font-bold ${m.color}`}>{fmt(m.value)}</p>
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
        {ms.notes && <p className="text-sm text-muted-foreground">{ms.notes}</p>}
        {aiText && (
          <div className="border rounded-md p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI Market Analysis
            </p>
            <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
              <ReactMarkdown>{aiText}</ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddMarketSizeDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await createMarketSize(new FormData(e.currentTarget));
      setOpen(false);
      formRef.current?.reset();
      onAdded();
      toast.success("Market segment added");
    } catch {
      toast.error("Failed to add segment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Segment</Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Market Segment</DialogTitle></DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="segment">Segment Name *</Label>
            <Input id="segment" name="segment" required placeholder="B2B SaaS GTM Tools" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tam">TAM ($)</Label>
              <Input id="tam" name="tam" type="number" placeholder="50000000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sam">SAM ($)</Label>
              <Input id="sam" name="sam" type="number" placeholder="5000000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="som">SOM ($)</Label>
              <Input id="som" name="som" type="number" placeholder="500000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year">Year</Label>
            <Input id="year" name="year" type="number" defaultValue={2026} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Assumptions</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Source: industry reports, competitor revenue data..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Add Segment"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function MarketSizeClient({ sizes: initial }: { sizes: MarketSize[] }) {
  const [sizes, setSizes] = useState(initial);

  async function handleDelete(id: string) {
    if (!confirm("Delete this segment?")) return;
    await deleteMarketSize(id);
    setSizes((prev) => prev.filter((s) => s.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
                <AddMarketSizeDialog onAdded={() => window.location.reload()} />
      </div>

      {sizes.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-3">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">No market segments defined</p>
            <p className="text-sm text-muted-foreground">Define your TAM/SAM/SOM or let AI estimate it.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sizes.map((s) => <MarketSizeCard key={s.id} ms={s} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}
