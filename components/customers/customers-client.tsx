"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, Users, ChevronUp, ChevronDown, ChevronsUpDown,
  Building2, MapPin, Globe, ExternalLink,
} from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  website: string | null;
}

interface Customer {
  id: string;
  name: string;
  identifier: string | null;
  website: string | null;
  industry: string | null;
  employees: number | null;
  country: string | null;
  city: string | null;
  annualRevenue: number | null;
  foundedYear: number | null;
  logoUrl: string | null;
  accountOwner: string | null;
  accountStage: string | null;
  description: string | null;
  competitors: { competitor: Competitor }[];
}

type SortKey = "name" | "industry" | "country" | "employees" | "revenue";
type SortDir = "asc" | "desc";

const COUNTRY_FLAGS: Record<string, string> = {
  Denmark: "🇩🇰", Finland: "🇫🇮", Sweden: "🇸🇪", Norway: "🇳🇴",
  Iceland: "🇮🇸", Germany: "🇩🇪", Netherlands: "🇳🇱",
};

function fmtRevenue(n: number | null) {
  if (!n) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function fmtEmployees(n: number | null) {
  if (!n) return "—";
  return n.toLocaleString();
}

function CustomerLogo({ name, logoUrl, size = 8 }: { name: string; logoUrl: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const hue = (name.charCodeAt(0) * 37 + (name.charCodeAt(1) ?? 0) * 13) % 360;
  const px = size * 4;

  if (!logoUrl || failed) {
    return (
      <div
        className="rounded-lg flex items-center justify-center text-white font-bold shrink-0"
        style={{ width: px, height: px, fontSize: size > 8 ? 18 : 11, backgroundColor: `hsl(${hue} 55% 52%)` }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: px, height: px }}>
      <Image src={logoUrl} alt={name} width={px} height={px} className="object-contain" onError={() => setFailed(true)} unoptimized />
    </div>
  );
}

function SortHeader({ label, sortKey, active, dir, onClick }: {
  label: string; sortKey: SortKey; active: boolean; dir: SortDir; onClick: (k: SortKey) => void;
}) {
  return (
    <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onClick(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {active ? dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />
          : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </div>
    </th>
  );
}

const STAGE_COLORS: Record<string, string> = {
  Cold: "bg-blue-500/10 text-blue-700 border-blue-200",
  Warm: "bg-orange-500/10 text-orange-700 border-orange-200",
  Hot: "bg-red-500/10 text-red-700 border-red-200",
  Active: "bg-green-500/10 text-green-700 border-green-200",
};

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const countries = useMemo(() => [...new Set(customers.map((c) => c.country).filter(Boolean))].sort() as string[], [customers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = [...customers];
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q));
    if (countryFilter) list = list.filter((c) => c.country === countryFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "industry") cmp = (a.industry ?? "").localeCompare(b.industry ?? "");
      else if (sortKey === "country") cmp = (a.country ?? "").localeCompare(b.country ?? "");
      else if (sortKey === "employees") cmp = (a.employees ?? 0) - (b.employees ?? 0);
      else if (sortKey === "revenue") cmp = (a.annualRevenue ?? 0) - (b.annualRevenue ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [customers, search, countryFilter, sortKey, sortDir]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-[13px]" />
        </div>
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
          {filtered.length} of {customers.length}
        </span>
      </div>

      {/* Country filter chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mr-1">Country:</span>
        <button onClick={() => setCountryFilter(null)}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${!countryFilter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
          All
        </button>
        {countries.map((c) => (
          <button key={c} onClick={() => setCountryFilter(countryFilter === c ? null : c)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${countryFilter === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
            {COUNTRY_FLAGS[c] ?? ""} {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-2">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="text-sm font-medium">No customers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <SortHeader label="Company" sortKey="name" active={sortKey === "name"} dir={sortDir} onClick={handleSort} />
                <SortHeader label="Industry" sortKey="industry" active={sortKey === "industry"} dir={sortDir} onClick={handleSort} />
                <SortHeader label="Country" sortKey="country" active={sortKey === "country"} dir={sortDir} onClick={handleSort} />
                <SortHeader label="Employees" sortKey="employees" active={sortKey === "employees"} dir={sortDir} onClick={handleSort} />
                <SortHeader label="Revenue" sortKey="revenue" active={sortKey === "revenue"} dir={sortDir} onClick={handleSort} />
                <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Competitors</th>
                <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}
                  className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/customers/${c.id}`)}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <CustomerLogo name={c.name} logoUrl={c.logoUrl} />
                      <div>
                        <p className="text-[13px] font-medium group-hover:text-primary transition-colors">{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground">{c.identifier}</span>
                          {c.accountStage && (
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${STAGE_COLORS[c.accountStage] ?? ""}`}>
                              {c.accountStage}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[12px] text-muted-foreground capitalize">{c.industry ?? "—"}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[12px] text-muted-foreground">
                      {COUNTRY_FLAGS[c.country ?? ""] ?? ""} {c.city ? `${c.city}, ` : ""}{c.country ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[12px] text-muted-foreground">{fmtEmployees(c.employees)}</td>
                  <td className="py-3 px-4 text-[12px] font-medium">{fmtRevenue(c.annualRevenue)}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {c.competitors.slice(0, 3).map(({ competitor }) => (
                        <span key={competitor.id} className="text-[10px] bg-muted rounded px-1.5 py-0.5">
                          {competitor.name.slice(0, 12)}
                        </span>
                      ))}
                      {c.competitors.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{c.competitors.length - 3}</span>
                      )}
                      {c.competitors.length === 0 && <span className="text-[11px] text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[12px] text-muted-foreground">{c.accountOwner?.split("@")[0] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
