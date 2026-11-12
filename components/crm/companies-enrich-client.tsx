"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { enrichAndApplyCompany, type BulkEnrichResult } from "@/lib/actions/ai-enrich";
import { toast } from "sonner";

interface CompanyLite {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  country: string | null;
  employeeCount: number | null;
  revenue: number | null;
  description: string | null;
  sourcingSolution: string | null;
  sourcingNotes: string | null;
  erpSolution: string | null;
  erpNotes: string | null;
}

const CONCURRENCY = 10;

type RowStatus = "queued" | "running" | "applied" | "no_changes" | "error";

interface RowState {
  status: RowStatus;
  result?: BulkEnrichResult;
}

function isStackMissing(c: CompanyLite): boolean {
  const empty = (s: string | null) => !s || s.trim() === "";
  return empty(c.sourcingSolution) || empty(c.erpSolution);
}

function emptyFieldsCount(c: CompanyLite): number {
  let n = 0;
  if (!c.website) n++;
  if (!c.industry) n++;
  if (!c.country) n++;
  if (c.employeeCount == null) n++;
  if (c.revenue == null) n++;
  if (!c.description) n++;
  if (!c.sourcingSolution) n++;
  if (!c.sourcingNotes) n++;
  if (!c.erpSolution) n++;
  if (!c.erpNotes) n++;
  return n;
}

export function CompaniesEnrichClient({ companies }: { companies: CompanyLite[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState(false);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const cancelRef = useRef(false);

  // Default: pre-select companies missing stack info
  useEffect(() => {
    const next = new Set<string>();
    for (const c of companies) if (isStackMissing(c)) next.add(c.id);
    setSelected(next);
  }, [companies]);

  const filtered = useMemo(
    () =>
      companies.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [companies, search],
  );

  const counts = useMemo(() => {
    const totals = { applied: 0, no_changes: 0, error: 0, running: 0, queued: 0 };
    for (const id of Object.keys(rowState)) {
      const s = rowState[id].status;
      if (s in totals) totals[s as keyof typeof totals]++;
    }
    return totals;
  }, [rowState]);

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  function selectMissingStack() {
    const next = new Set<string>();
    for (const c of filtered) if (isStackMissing(c)) next.add(c.id);
    setSelected(next);
  }

  function selectEmptyFields() {
    const next = new Set<string>();
    for (const c of filtered) if (emptyFieldsCount(c) > 0) next.add(c.id);
    setSelected(next);
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    cancelRef.current = false;
    setRunning(true);
    const initial: Record<string, RowState> = {};
    for (const id of ids) initial[id] = { status: "queued" };
    setRowState(initial);

    let cursor = 0;
    const workerCount = Math.min(CONCURRENCY, ids.length);

    async function worker() {
      while (true) {
        if (cancelRef.current) return;
        const i = cursor++;
        if (i >= ids.length) return;
        const id = ids[i];
        setRowState((prev) => ({ ...prev, [id]: { status: "running" } }));
        const result = await enrichAndApplyCompany(id).catch((e): BulkEnrichResult => ({
          companyId: id,
          companyName: companies.find((c) => c.id === id)?.name ?? "?",
          status: "error",
          error: e instanceof Error ? e.message : "Unknown error",
        }));
        setRowState((prev) => ({
          ...prev,
          [id]: { status: result.status as RowStatus, result },
        }));
      }
    }

    await Promise.all(Array.from({ length: workerCount }, worker));
    setRunning(false);
    router.refresh(); // pick up updated DB values into the server-rendered list
    toast.success("Enrichment run complete");
  }

  function cancel() {
    cancelRef.current = true;
    toast.message("Cancelling… in-flight requests will finish");
  }

  const processed = counts.applied + counts.no_changes + counts.error;
  const total = Object.keys(rowState).length;
  const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/crm/companies"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Companies
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Bulk Enrichment</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Researches each selected company via Claude + web search, then fills in
          missing fields only (never overwrites existing data). Runs {CONCURRENCY} at a time.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectMissingStack} disabled={running}>
              Select missing stack
            </Button>
            <Button variant="outline" size="sm" onClick={selectEmptyFields} disabled={running}>
              Select any incomplete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())} disabled={running}>
              Clear selection
            </Button>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selected.size}</span> selected of {companies.length}
            </span>
            {running ? (
              <Button variant="outline" size="sm" onClick={cancel} className="gap-1.5">
                Cancel
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={run}
                disabled={selected.size === 0}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Enrich {selected.size}
              </Button>
            )}
          </div>

          {total > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {processed} / {total} processed
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-green-600">✓ {counts.applied} applied</span>
                  <span className="text-muted-foreground">— {counts.no_changes} no changes</span>
                  {counts.error > 0 && <span className="text-red-600">✗ {counts.error} errors</span>}
                  {counts.running > 0 && (
                    <span className="text-blue-600 inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> {counts.running} running
                    </span>
                  )}
                </div>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      <Input
        placeholder="Search companies..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
        disabled={running}
      />

      {/* Companies list */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="py-2.5 px-4 w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  disabled={running}
                  className="size-4"
                />
              </th>
              <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current stack</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empty fields</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-72">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const state = rowState[c.id];
              const empty = emptyFieldsCount(c);
              return (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors align-top">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleRow(c.id)}
                      disabled={running}
                      className="size-4"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/crm/companies/${c.id}`} className="text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {c.sourcingSolution || <em>no sourcing</em>}
                    {" · "}
                    {c.erpSolution || <em>no ERP</em>}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {empty === 0 ? (
                      <span className="text-muted-foreground">complete</span>
                    ) : (
                      <Badge variant="outline" className="text-xs">{empty} / 10 empty</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusCell state={state} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusCell({ state }: { state?: RowState }) {
  if (!state) return <span className="text-xs text-muted-foreground">—</span>;
  switch (state.status) {
    case "queued":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className="h-3 w-3" /> Queued
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" /> Researching…
        </span>
      );
    case "applied":
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Applied {state.result?.fieldsApplied?.length ?? 0} fields
            {state.result?.confidence && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{state.result.confidence}</Badge>
            )}
          </span>
          {state.result?.fieldsApplied && state.result.fieldsApplied.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {state.result.fieldsApplied.join(", ")}
            </p>
          )}
        </div>
      );
    case "no_changes":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" /> No empty fields to fill
        </span>
      );
    case "error":
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
            <XCircle className="h-3 w-3" /> Error
          </span>
          {state.result?.error && (
            <p className="text-[11px] text-muted-foreground">{state.result.error}</p>
          )}
        </div>
      );
  }
}
