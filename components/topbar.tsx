"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, { title: string; desc: string }> = {
  "/dashboard": { title: "Dashboard", desc: "Your 10x growth at a glance" },
  "/market-research/competitors": { title: "Competitors", desc: "104 companies tracked · click any row to open detail view" },
  "/market-research/icp": { title: "ICP Builder", desc: "Define who your ideal customer is" },
  "/market-research/market-size": { title: "Market Sizing", desc: "Understand your TAM, SAM, and SOM" },
  "/crm/contacts": { title: "Contacts", desc: "People in your pipeline" },
  "/crm/contacts/import": { title: "Import Contacts", desc: "Bring in leads from HubSpot or Salesforce" },
  "/crm/companies": { title: "Companies", desc: "Organizations in your pipeline" },
  "/crm/deals": { title: "Pipeline", desc: "Deals across every stage" },
  "/goals/okrs": { title: "OKRs", desc: "Objectives and key results for 10x growth" },
  "/planning/campaigns": { title: "Campaigns", desc: "GTM initiatives and their ROI" },
  "/planning/channels": { title: "Channels", desc: "Performance by acquisition channel" },
  "/customers": { title: "Customers", desc: "25 Nordic manufacturing accounts · click any row to open detail" },
};

export function Topbar() {
  const pathname = usePathname();

  // Dynamic match for /market-research/competitors/[id]
  const isCompetitorDetail =
    pathname.startsWith("/market-research/competitors/") &&
    pathname !== "/market-research/competitors";
  const isCustomerDetail =
    pathname.startsWith("/customers/") && pathname !== "/customers";

  const meta = isCompetitorDetail
    ? { title: "Competitor Detail", desc: "Full profile · customers · AI analysis" }
    : isCustomerDetail
    ? { title: "Customer Detail", desc: "Account profile · linked competitors · notes" }
    : (titles[pathname] ?? { title: "Nvelop 10x", desc: "" });

  return (
    <header className="h-14 flex items-center px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-[15px] font-semibold text-foreground leading-tight">{meta.title}</h1>
        {meta.desc && (
          <p className="text-[12px] text-muted-foreground leading-tight">{meta.desc}</p>
        )}
      </div>
    </header>
  );
}
