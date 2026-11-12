"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Building2, Trash2, Globe, ExternalLink, Sparkles } from "lucide-react";
import { createCompany, deleteCompany } from "@/lib/actions/crm";
import { toast } from "sonner";

interface Company {
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
  _count: { contacts: number; deals: number };
}

function fmt(n: number | null) {
  if (n == null) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function CompanyRow({ company, onDelete }: { company: Company; onDelete: (id: string) => void }) {
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors align-top">
      <td className="py-3 px-4">
        <Link href={`/crm/companies/${company.id}`} className="block group">
          <p className="font-medium text-sm group-hover:underline">{company.name}</p>
          {company.website && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" />{company.website.replace(/^https?:\/\//, "")}
            </span>
          )}
        </Link>
      </td>
      <td className="py-3 px-4">
        {company.industry ? <Badge variant="secondary" className="text-xs">{company.industry}</Badge> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="py-3 px-4 text-sm">{company.employeeCount?.toLocaleString() ?? "—"}</td>
      <td className="py-3 px-4 text-sm">{fmt(company.revenue) ?? "—"}</td>
      <td className="py-3 px-4 text-sm">{company.country ?? "—"}</td>
      <td className="py-3 px-4 text-sm">{company.sourcingSolution ?? <span className="text-muted-foreground">—</span>}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground max-w-[260px]">
        {company.sourcingNotes
          ? <span className="line-clamp-3 whitespace-pre-wrap">{company.sourcingNotes}</span>
          : "—"}
      </td>
      <td className="py-3 px-4 text-sm">{company.erpSolution ?? <span className="text-muted-foreground">—</span>}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground max-w-[260px]">
        {company.erpNotes
          ? <span className="line-clamp-3 whitespace-pre-wrap">{company.erpNotes}</span>
          : "—"}
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{company._count.contacts} contacts</span>
          <span>{company._count.deals} deals</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(company.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

function AddCompanyDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await createCompany(new FormData(e.currentTarget));
      setOpen(false);
      formRef.current?.reset();
      onAdded();
      toast.success("Company added");
    } catch {
      toast.error("Failed to add company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Company</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" name="name" required placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://acme.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" placeholder="SaaS, FinTech..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" placeholder="USA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="employeeCount">Employees</Label>
                <Input id="employeeCount" name="employeeCount" type="number" placeholder="150" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revenue">Revenue ($)</Label>
                <Input id="revenue" name="revenue" type="number" placeholder="5000000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sourcingSolution">Current Sourcing Solution</Label>
              <Input id="sourcingSolution" name="sourcingSolution" placeholder="Coupa, Jaggaer, Ivalua..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sourcingNotes">Sourcing Notes</Label>
              <Textarea id="sourcingNotes" name="sourcingNotes" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="erpSolution">Current ERP</Label>
              <Input id="erpSolution" name="erpSolution" placeholder="SAP, Oracle, NetSuite..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="erpNotes">ERP Notes</Label>
              <Textarea id="erpNotes" name="erpNotes" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} placeholder="What they do..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Company"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CompaniesClient({ companies: initial }: { companies: Company[] }) {
  const [companies, setCompanies] = useState(initial);
  const [search, setSearch] = useState("");

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this company?")) return;
    await deleteCompany(id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-end gap-2">
        <Link href="/crm/companies/enrich">
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" /> Bulk Enrich
          </Button>
        </Link>
        <AddCompanyDialog onAdded={() => window.location.reload()} />
      </div>

      <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {filtered.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-3">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">{companies.length === 0 ? "No companies yet" : "No matches"}</p>
            <p className="text-sm text-muted-foreground">Add companies manually or import via CSV.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead>
              <tr className="bg-muted/50 text-left">
                {[
                  "Company",
                  "Industry",
                  "Employees",
                  "Revenue",
                  "Country",
                  "Sourcing Solution",
                  "Sourcing Notes",
                  "ERP",
                  "ERP Notes",
                  "CRM",
                  "",
                ].map((h) => (
                  <th key={h} className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CompanyRow key={c.id} company={c} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
