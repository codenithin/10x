"use client";

import { useState, useRef } from "react";
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
import { Plus, Lightbulb, Trash2, Star } from "lucide-react";
import { createICP, deleteICP } from "@/lib/actions/icp";
import { toast } from "sonner";

interface ICP {
  id: string;
  name: string;
  description: string | null;
  industries: string[];
  companySize: string | null;
  titles: string[];
  geographies: string[];
  painPoints: string[];
  isPrimary: boolean;
}

function ICPCard({ icp, onDelete }: { icp: ICP; onDelete: (id: string) => void }) {
  return (
    <Card className={icp.isPrimary ? "border-primary/50 shadow-sm" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{icp.name}</CardTitle>
            {icp.isPrimary && (
              <Badge variant="default" className="text-xs gap-1">
                <Star className="h-3 w-3" /> Primary
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(icp.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {icp.description && (
          <p className="text-sm text-muted-foreground">{icp.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {icp.industries.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Industries</p>
            <div className="flex flex-wrap gap-1">
              {icp.industries.map((i) => (
                <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
              ))}
            </div>
          </div>
        )}
        {icp.companySize && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Company Size</p>
            <p className="text-sm">{icp.companySize}</p>
          </div>
        )}
        {icp.titles.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Buyer Titles</p>
            <div className="flex flex-wrap gap-1">
              {icp.titles.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        )}
        {icp.geographies.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Geographies</p>
            <div className="flex flex-wrap gap-1">
              {icp.geographies.map((g) => (
                <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
              ))}
            </div>
          </div>
        )}
        {icp.painPoints.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pain Points</p>
            <ul className="space-y-1">
              {icp.painPoints.map((p) => (
                <li key={p} className="text-sm text-muted-foreground flex gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddICPDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await createICP(new FormData(e.currentTarget));
      setOpen(false);
      formRef.current?.reset();
      onAdded();
      toast.success("ICP created");
    } catch {
      toast.error("Failed to create ICP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Define ICP
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Ideal Customer Profile</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Profile Name *</Label>
            <Input id="name" name="name" required placeholder="Primary ICP — Mid-Market SaaS" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Who is this profile and why are they ideal?" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industries">Industries <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
            <Input id="industries" name="industries" placeholder="SaaS, FinTech, HealthTech" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companySize">Company Size</Label>
            <Input id="companySize" name="companySize" placeholder="50-500 employees, Series A-C" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titles">Buyer Titles <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
            <Input id="titles" name="titles" placeholder="VP Sales, Head of Revenue, CRO" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="geographies">Geographies <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
            <Input id="geographies" name="geographies" placeholder="North America, UK, Australia" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="painPoints">Pain Points <span className="text-muted-foreground text-xs">(one per line)</span></Label>
            <Textarea id="painPoints" name="painPoints" rows={4} placeholder={"Scattered CRM data\nNo competitive visibility\nManual OKR tracking"} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPrimary" name="isPrimary" value="true" className="rounded" />
            <Label htmlFor="isPrimary">Mark as Primary ICP</Label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create ICP"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function ICPClient({ icps: initial }: { icps: ICP[] }) {
  const [icps, setIcps] = useState(initial);

  async function handleDelete(id: string) {
    if (!confirm("Delete this ICP?")) return;
    await deleteICP(id);
    setIcps((prev) => prev.filter((i) => i.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
                <AddICPDialog onAdded={() => window.location.reload()} />
      </div>

      {icps.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-3">
            <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">No ICPs defined yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Define who your ideal customer is. This will be used to automatically score CRM contacts and imports.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {icps.map((icp) => (
            <ICPCard key={icp.id} icp={icp} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
