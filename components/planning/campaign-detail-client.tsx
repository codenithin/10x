"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ArrowLeft, Building2, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  addCompaniesToCampaign,
  addContactsToCampaign,
  removeCompanyFromCampaign,
  removeContactFromCampaign,
} from "@/lib/actions/planning";

type Channel = "OUTBOUND" | "CONTENT" | "PAID" | "PARTNERSHIPS" | "SEO" | "EVENTS" | "REFERRAL" | "OTHER";
type Status = "PLANNED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

interface CampaignCompanyRow {
  campaignId: string;
  companyId: string;
  company: { id: string; name: string; industry: string | null; country: string | null };
}

interface CampaignContactRow {
  campaignId: string;
  contactId: string;
  contact: {
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    company: { id: string; name: string } | null;
  };
}

interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  channel: Channel;
  status: Status;
  budget: number | null;
  revenue: number | null;
  leads: number | null;
  startDate: string | null;
  endDate: string | null;
  companies: CampaignCompanyRow[];
  contacts: CampaignContactRow[];
}

interface CompanyOption {
  id: string;
  name: string;
}

interface ContactOption {
  id: string;
  name: string;
  title: string | null;
  company: { id: string; name: string } | null;
}

const channelColor: Record<string, string> = {
  OUTBOUND: "#6366f1",
  CONTENT: "#8b5cf6",
  PAID: "#f59e0b",
  PARTNERSHIPS: "#10b981",
  SEO: "#3b82f6",
  EVENTS: "#ef4444",
  REFERRAL: "#ec4899",
  OTHER: "#6b7280",
};

const statusColor: Record<Status, string> = {
  PLANNED: "bg-slate-500/10 text-slate-600",
  ACTIVE: "bg-green-500/10 text-green-700",
  PAUSED: "bg-yellow-500/10 text-yellow-700",
  COMPLETED: "bg-blue-500/10 text-blue-700",
  CANCELLED: "bg-red-500/10 text-red-700",
};

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AddCompaniesDialog({
  campaignId,
  available,
  onAdded,
}: {
  campaignId: string;
  available: CompanyOption[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (selected.size === 0) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        await addCompaniesToCampaign(campaignId, Array.from(selected));
        toast.success(`Added ${selected.size} ${selected.size === 1 ? "company" : "companies"}`);
        setSelected(new Set());
        setOpen(false);
        onAdded();
      } catch {
        toast.error("Failed to add companies");
      }
    });
  }

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)} disabled={available.length === 0}>
        <Plus className="h-3.5 w-3.5" /> Add Companies
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected(new Set()); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Add companies to campaign</DialogTitle>
          </DialogHeader>
          <Command className="rounded-none">
            <CommandInput placeholder="Search companies..." />
            <CommandList className="max-h-80">
              <CommandEmpty>No matching companies.</CommandEmpty>
              <CommandGroup>
                {available.map((c) => {
                  const isChecked = selected.has(c.id);
                  return (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => toggle(c.id)}
                      data-checked={isChecked}
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{c.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {selected.size} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={isPending || selected.size === 0}>
                {isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddContactsDialog({
  campaignId,
  available,
  onAdded,
}: {
  campaignId: string;
  available: ContactOption[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (selected.size === 0) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        await addContactsToCampaign(campaignId, Array.from(selected));
        toast.success(`Added ${selected.size} ${selected.size === 1 ? "contact" : "contacts"}`);
        setSelected(new Set());
        setOpen(false);
        onAdded();
      } catch {
        toast.error("Failed to add contacts");
      }
    });
  }

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)} disabled={available.length === 0}>
        <Plus className="h-3.5 w-3.5" /> Add Contacts
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected(new Set()); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Add contacts to campaign</DialogTitle>
          </DialogHeader>
          <Command className="rounded-none">
            <CommandInput placeholder="Search contacts..." />
            <CommandList className="max-h-80">
              <CommandEmpty>No matching contacts.</CommandEmpty>
              <CommandGroup>
                {available.map((c) => {
                  const isChecked = selected.has(c.id);
                  const subtitle = [c.title, c.company?.name].filter(Boolean).join(" · ");
                  return (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.title ?? ""} ${c.company?.name ?? ""}`}
                      onSelect={() => toggle(c.id)}
                      data-checked={isChecked}
                    >
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {selected.size} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={isPending || selected.size === 0}>
                {isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CampaignDetailClient({
  campaign,
  availableCompanies,
  availableContacts,
}: {
  campaign: CampaignDetail;
  availableCompanies: CompanyOption[];
  availableContacts: ContactOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function removeCompany(companyId: string, name: string) {
    if (!confirm(`Remove ${name} from this campaign?`)) return;
    startTransition(async () => {
      try {
        await removeCompanyFromCampaign(campaign.id, companyId);
        toast.success("Removed");
        refresh();
      } catch {
        toast.error("Failed to remove");
      }
    });
  }

  function removeContact(contactId: string, name: string) {
    if (!confirm(`Remove ${name} from this campaign?`)) return;
    startTransition(async () => {
      try {
        await removeContactFromCampaign(campaign.id, contactId);
        toast.success("Removed");
        refresh();
      } catch {
        toast.error("Failed to remove");
      }
    });
  }

  const startStr = fmt(campaign.startDate);
  const endStr = fmt(campaign.endDate);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <Link
          href="/planning/campaigns"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{campaign.name}</h1>
          <Badge variant="outline" className="text-xs" style={{ borderColor: channelColor[campaign.channel] + "40", color: channelColor[campaign.channel] }}>
            {campaign.channel}
          </Badge>
          <Badge className={`text-xs ${statusColor[campaign.status]}`} variant="outline">
            {campaign.status}
          </Badge>
        </div>
        {campaign.description && <p className="text-sm text-muted-foreground max-w-3xl">{campaign.description}</p>}
        {(startStr || endStr) && (
          <p className="text-xs text-muted-foreground">
            {startStr ?? "—"} → {endStr ?? "—"}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium">Companies <span className="text-muted-foreground text-sm">({campaign.companies.length})</span></h2>
          </div>
          <AddCompaniesDialog campaignId={campaign.id} available={availableCompanies} onAdded={refresh} />
        </div>

        {campaign.companies.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No companies in this campaign yet.</CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Country</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {campaign.companies.map((row) => (
                  <tr key={row.companyId} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{row.company.name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{row.company.industry ?? "—"}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{row.company.country ?? "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => removeCompany(row.companyId, row.company.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium">Contacts <span className="text-muted-foreground text-sm">({campaign.contacts.length})</span></h2>
          </div>
          <AddContactsDialog campaignId={campaign.id} available={availableContacts} onAdded={refresh} />
        </div>

        {campaign.contacts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No contacts in this campaign yet.</CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {campaign.contacts.map((row) => (
                  <tr key={row.contactId} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{row.contact.name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{row.contact.title ?? "—"}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{row.contact.company?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => removeContact(row.contactId, row.contact.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
