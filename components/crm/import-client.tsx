"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type State = "idle" | "uploading" | "done" | "error";

export function ImportClient() {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setState("uploading");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
      setState("done");
      toast.success(`Imported ${data.created} contacts`);
    } catch {
      setState("error");
      toast.error("Import failed");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
    else toast.error("Please upload a CSV file");
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">CSV Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>We auto-detect HubSpot and Salesforce column names. Supported fields:</p>
          <div className="grid grid-cols-2 gap-1">
            {[
              "First Name / Last Name / Full Name",
              "Email",
              "Phone",
              "Job Title / Title / Role",
              "Company / Account / Organization",
              "Industry / Sector",
              "Employees / Headcount",
              "Annual Revenue / ARR",
              "LinkedIn Profile",
              "Country",
            ].map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-xs">{f}</span>
              </div>
            ))}
          </div>
          <p className="text-xs pt-1">Up to 500 contacts per import. Each contact is scored against your Primary ICP.</p>
        </CardContent>
      </Card>

      {state === "idle" && (
        <div
          className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium">Drop CSV here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">HubSpot · Salesforce · Any CSV with contact columns</p>
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {state === "uploading" && (
        <Card className="py-12">
          <CardContent className="text-center space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="font-medium">Importing {fileName}...</p>
            <p className="text-sm text-muted-foreground">AI is scoring each contact against your ICP. This may take a moment.</p>
          </CardContent>
        </Card>
      )}

      {state === "done" && result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-semibold">Import complete</p>
                <p className="text-sm text-muted-foreground">{result.created} contacts imported and ICP-scored</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {result.errors.length} rows skipped
                </p>
                {result.errors.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-5">{e}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Link href="/crm/contacts">
                <Button>View Contacts</Button>
              </Link>
              <Button variant="outline" onClick={() => { setState("idle"); setResult(null); setFileName(null); }}>
                Import Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === "error" && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="font-medium">Import failed</p>
            <Button variant="outline" onClick={() => setState("idle")}>Try Again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
