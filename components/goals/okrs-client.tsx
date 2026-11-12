"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Target, Sparkles, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { createObjective, createKeyResult, createCheckIn, deleteObjective } from "@/lib/actions/goals";
import { toast } from "sonner";

interface CheckIn {
  id: string;
  value: number;
  note: string | null;
  aiCoaching: string | null;
  createdAt: string;
}

interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  dueDate: string | null;
  checkIns: CheckIn[];
}

interface Objective {
  id: string;
  title: string;
  description: string | null;
  quarter: string;
  year: number;
  status: string;
  keyResults: KeyResult[];
}

const statusColor: Record<string, string> = {
  ON_TRACK: "bg-green-500/10 text-green-700 border-green-300",
  AT_RISK: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  BEHIND: "bg-red-500/10 text-red-700 border-red-300",
  COMPLETED: "bg-blue-500/10 text-blue-700 border-blue-300",
};

function pct(current: number, target: number) {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function CheckInModal({ keyResult, onCheckedIn }: { keyResult: KeyResult; onCheckedIn: (value: number, note: string, coaching: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(keyResult.current));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const checkIn = await createCheckIn(keyResult.id, parseFloat(value), note);
      onCheckedIn(parseFloat(value), note, checkIn.aiCoaching ?? undefined);
      setOpen(false);
      setNote("");
      toast.success("Check-in saved");
    } catch {
      toast.error("Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" /> Check In
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Check In: {keyResult.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current Value ({keyResult.unit})</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              step="any"
              required
            />
            <p className="text-xs text-muted-foreground">Target: {keyResult.target} {keyResult.unit}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What happened this week?" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-1">
              {loading ? <><Sparkles className="h-3 w-3 animate-pulse" /> Getting coaching...</> : "Save & Get Coaching"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

function KeyResultCard({ kr, onChange }: { kr: KeyResult; onChange: (updated: KeyResult) => void }) {
  const [expanded, setExpanded] = useState(false);
  const progress = pct(kr.current, kr.target);
  const latestCoaching = kr.checkIns[0]?.aiCoaching;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{kr.title}</p>
        <CheckInModal
          keyResult={kr}
          onCheckedIn={(value, note, coaching) => {
            onChange({
              ...kr,
              current: value,
              checkIns: [{ id: Date.now().toString(), value, note, aiCoaching: coaching ?? null, createdAt: new Date().toISOString() }, ...kr.checkIns].slice(0, 5),
            });
          }}
        />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{kr.current} / {kr.target} {kr.unit}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      {latestCoaching && (
        <div>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            <Sparkles className="h-3 w-3" />
            AI Coaching
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {expanded && (
            <p className="text-xs text-muted-foreground mt-1 pl-4 border-l-2 border-primary/30">
              {latestCoaching}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AddKeyResultDialog({ objectiveId, onAdded }: { objectiveId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("objectiveId", objectiveId);
    try {
      await createKeyResult(fd);
      setOpen(false);
      formRef.current?.reset();
      onAdded();
      toast.success("Key result added");
    } catch {
      toast.error("Failed to add key result");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" /> Add Key Result
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Key Result</DialogTitle></DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input name="title" required placeholder="Reach $1M ARR" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Target *</Label>
              <Input name="target" type="number" required placeholder="1000000" step="any" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input name="unit" placeholder="$ ARR, customers, %" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input name="dueDate" type="date" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

function AddObjectiveDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quarter, setQuarter] = useState("Q2");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("quarter", quarter);
    try {
      await createObjective(fd);
      setOpen(false);
      formRef.current?.reset();
      onAdded();
      toast.success("Objective created");
    } catch {
      toast.error("Failed to create objective");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Objective</Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create Objective</DialogTitle></DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Objective *</Label>
            <Input name="title" required placeholder="10x our ARR" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea name="description" rows={2} placeholder="What does success look like?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quarter</Label>
              <Select value={quarter} onValueChange={(v) => setQuarter(v ?? "Q2")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Q1", "Q2", "Q3", "Q4"].map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input name="year" type="number" defaultValue={2026} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function OKRsClient({ objectives: initial }: { objectives: Objective[] }) {
  const [objectives, setObjectives] = useState(initial);

  function updateKR(objId: string, krId: string, updated: KeyResult) {
    setObjectives((prev) =>
      prev.map((o) =>
        o.id === objId
          ? { ...o, keyResults: o.keyResults.map((kr) => (kr.id === krId ? updated : kr)) }
          : o
      )
    );
  }

  async function handleDeleteObj(id: string) {
    if (!confirm("Delete this objective and all its key results?")) return;
    await deleteObjective(id);
    setObjectives((prev) => prev.filter((o) => o.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
                <AddObjectiveDialog onAdded={() => window.location.reload()} />
      </div>

      {objectives.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-3">
            <Target className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">No objectives yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create your first objective. Add key results with measurable targets, then check in weekly for AI coaching.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {objectives.map((obj) => {
            const allKRs = obj.keyResults;
            const overallPct = allKRs.length > 0
              ? Math.round(allKRs.reduce((s, kr) => s + pct(kr.current, kr.target), 0) / allKRs.length)
              : 0;

            return (
              <Card key={obj.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{obj.title}</CardTitle>
                        <Badge variant="outline" className="text-xs">{obj.quarter} {obj.year}</Badge>
                        <Badge variant="outline" className={`text-xs ${statusColor[obj.status] ?? ""}`}>
                          {obj.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {obj.description && (
                        <p className="text-sm text-muted-foreground">{obj.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-bold text-primary">{overallPct}%</span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteObj(obj.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {allKRs.length > 0 && (
                    <Progress value={overallPct} className="h-1.5 mt-2" />
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {allKRs.map((kr) => (
                    <KeyResultCard
                      key={kr.id}
                      kr={kr}
                      onChange={(updated) => updateKR(obj.id, kr.id, updated)}
                    />
                  ))}
                  <AddKeyResultDialog objectiveId={obj.id} onAdded={() => window.location.reload()} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
