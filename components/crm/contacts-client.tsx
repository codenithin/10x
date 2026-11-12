"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import Link from "next/link";
import { Plus, Users, Trash2, Mail, Phone, Link2, Star } from "lucide-react";
import { createContact, deleteContact } from "@/lib/actions/crm";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  linkedin: string | null;
  icpScore: number | null;
  source: string;
  company: { id: string; name: string } | null;
}

interface Company {
  id: string;
  name: string;
}

function icpColor(score: number | null) {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-green-500/10 text-green-700 border-green-200";
  if (score >= 60) return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
  return "bg-red-500/10 text-red-700 border-red-200";
}

function ContactRow({ contact, onDelete }: { contact: Contact; onDelete: (id: string) => void }) {
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <Link href={`/crm/contacts/${contact.id}`} className="block group">
          <p className="font-medium text-sm group-hover:underline">{contact.name}</p>
          {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
        </Link>
      </td>
      <td className="py-3 px-4">
        {contact.company ? (
          <Link href={`/crm/companies/${contact.company.id}`} className="text-sm hover:underline">
            {contact.company.name}
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-foreground">
              <Mail className="h-3.5 w-3.5" />
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-foreground">
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          {contact.linkedin && (
            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <Link2 className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        {contact.icpScore != null ? (
          <Badge variant="outline" className={`text-xs gap-1 ${icpColor(contact.icpScore)}`}>
            <Star className="h-3 w-3" />
            {Math.round(contact.icpScore)}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not scored</span>
        )}
      </td>
      <td className="py-3 px-4">
        <Badge variant="secondary" className="text-xs capitalize">{contact.source.replace("_", " ")}</Badge>
      </td>
      <td className="py-3 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(contact.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

function AddContactDialog({ companies, onAdded }: { companies: Company[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    if (companyId) fd.set("companyId", companyId);
    try {
      await createContact(fd);
      setOpen(false);
      formRef.current?.reset();
      setCompanyId("");
      onAdded();
      toast.success("Contact added");
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Contact</Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" name="name" required placeholder="Jane Smith" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Job Title</Label>
              <Input id="title" name="title" placeholder="VP Sales" />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={(v) => setCompanyId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="jane@acme.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="+1 555 0100" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Contact"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function ContactsClient({
  contacts: initial,
  companies,
}: {
  contacts: Contact[];
  companies: Company[];
}) {
  const [contacts, setContacts] = useState(initial);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
                <AddContactDialog companies={companies} onAdded={() => window.location.reload()} />
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-3">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">{contacts.length === 0 ? "No contacts yet" : "No matches"}</p>
            <p className="text-sm text-muted-foreground">
              {contacts.length === 0
                ? "Add contacts manually or import from HubSpot/Salesforce CSV."
                : "Try a different search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ICP Score</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <ContactRow key={c.id} contact={c} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
