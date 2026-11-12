"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Plus, Briefcase, Trash2, DollarSign } from "lucide-react";
import { createDeal, updateDealStage, deleteDeal } from "@/lib/actions/crm";
import { toast } from "sonner";

type DealStage =
  | "PROSPECT"
  | "QUALIFIED"
  | "DEMO"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: "PROSPECT", label: "Prospect", color: "border-t-slate-400" },
  { id: "QUALIFIED", label: "Qualified", color: "border-t-blue-400" },
  { id: "DEMO", label: "Demo", color: "border-t-purple-400" },
  { id: "PROPOSAL", label: "Proposal", color: "border-t-orange-400" },
  { id: "NEGOTIATION", label: "Negotiation", color: "border-t-yellow-400" },
  { id: "CLOSED_WON", label: "Closed Won", color: "border-t-green-500" },
  { id: "CLOSED_LOST", label: "Closed Lost", color: "border-t-red-400" },
];

interface Deal {
  id: string;
  name: string;
  value: number;
  stage: DealStage;
  closeDate: string | null;
  notes: string | null;
  contact: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
}

function fmt(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function DealCard({
  deal,
  onStageChange,
  onDelete,
}: {
  deal: Deal;
  onStageChange: (id: string, stage: DealStage) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between gap-1">
          <p className="font-medium text-sm leading-tight">{deal.name}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onDelete(deal.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {deal.value > 0 && (
          <p className="text-base font-bold text-green-600">{fmt(deal.value)}</p>
        )}
        {deal.company && (
          <p className="text-xs text-muted-foreground">{deal.company.name}</p>
        )}
        {deal.contact && (
          <p className="text-xs text-muted-foreground">{deal.contact.name}</p>
        )}
        {deal.closeDate && (
          <p className="text-xs text-muted-foreground">
            Close: {new Date(deal.closeDate).toLocaleDateString()}
          </p>
        )}
        <Select
          value={deal.stage}
          onValueChange={(v) => v && onStageChange(deal.id, v as DealStage)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

function AddDealDialog({
  contacts,
  companies,
  onAdded,
}: {
  contacts: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [stage, setStage] = useState<DealStage>("PROSPECT");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("stage", stage);
    if (contactId) fd.set("contactId", contactId);
    if (companyId) fd.set("companyId", companyId);
    try {
      await createDeal(fd);
      setOpen(false);
      formRef.current?.reset();
      setContactId("");
      setCompanyId("");
      setStage("PROSPECT");
      onAdded();
      toast.success("Deal created");
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Deal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Deal</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Deal Name *</Label>
            <Input id="name" name="name" required placeholder="Acme Corp — Enterprise" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="value">Value ($)</Label>
              <Input id="value" name="value" type="number" placeholder="25000" />
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Select value={contactId} onValueChange={(v) => setContactId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={(v) => setCompanyId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closeDate">Expected Close Date</Label>
            <Input id="closeDate" name="closeDate" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Key details..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function DealsClient({
  deals: initial,
  contacts,
  companies,
}: {
  deals: Deal[];
  contacts: { id: string; name: string }[];
  companies: { id: string; name: string }[];
}) {
  const [deals, setDeals] = useState(initial);

  const totalPipeline = deals
    .filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage))
    .reduce((s, d) => s + d.value, 0);

  const wonRevenue = deals
    .filter((d) => d.stage === "CLOSED_WON")
    .reduce((s, d) => s + d.value, 0);

  async function handleStageChange(id: string, stage: DealStage) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    try {
      await updateDealStage(id, stage as Parameters<typeof updateDealStage>[1]);
    } catch {
      toast.error("Failed to update stage");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this deal?")) return;
    await deleteDeal(id);
    setDeals((prev) => prev.filter((d) => d.id !== id));
    toast.success("Deleted");
  }

  const stageDeals = (stage: DealStage) => deals.filter((d) => d.stage === stage);
  const stageValue = (stage: DealStage) =>
    stageDeals(stage).reduce((s, d) => s + d.value, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between">
                <AddDealDialog contacts={contacts} companies={companies} onAdded={() => window.location.reload()} />
      </div>

      {deals.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-3">
            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">No deals yet</p>
            <p className="text-sm text-muted-foreground">Create your first deal to start tracking your pipeline.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageList = stageDeals(stage.id);
              const val = stageValue(stage.id);
              return (
                <div key={stage.id} className="w-56 flex-shrink-0">
                  <div className={`rounded-t-lg border-t-4 ${stage.color} bg-muted/50 px-3 py-2 mb-2`}>
                    <p className="font-semibold text-sm">{stage.label}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{stageList.length} deals</span>
                      {val > 0 && (
                        <span className="text-xs font-medium flex items-center gap-0.5">
                          <DollarSign className="h-3 w-3" />{fmt(val).replace("$", "")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {stageList.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onStageChange={handleStageChange}
                        onDelete={handleDelete}
                      />
                    ))}
                    {stageList.length === 0 && (
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground">No deals</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
