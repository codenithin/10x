"use server";

import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { generateText } from "@/lib/ai";
import { z } from "zod";

const ObjectiveSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  quarter: z.string().min(1),
  year: z.coerce.number().default(2026),
});

const KeyResultSchema = z.object({
  objectiveId: z.string().min(1),
  title: z.string().min(1),
  target: z.coerce.number(),
  unit: z.string().default("units"),
  dueDate: z.string().optional(),
});

export async function createObjective(formData: FormData) {
  const org = await requireOrg();
  const data = ObjectiveSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    quarter: formData.get("quarter"),
    year: formData.get("year") || 2026,
  });
  const obj = await prisma.objective.create({ data: { ...data, orgId: org.id } });
  revalidatePath("/dashboard/goals/okrs");
  return obj;
}

export async function createKeyResult(formData: FormData) {
  const org = await requireOrg();
  const data = KeyResultSchema.parse({
    objectiveId: formData.get("objectiveId"),
    title: formData.get("title"),
    target: formData.get("target"),
    unit: formData.get("unit") || "units",
    dueDate: formData.get("dueDate") || undefined,
  });

  const obj = await prisma.objective.findFirst({
    where: { id: data.objectiveId, orgId: org.id },
  });
  if (!obj) throw new Error("Objective not found");

  const kr = await prisma.keyResult.create({
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
  revalidatePath("/dashboard/goals/okrs");
  return kr;
}

export async function createCheckIn(keyResultId: string, value: number, note: string) {
  const org = await requireOrg();

  const kr = await prisma.keyResult.findFirst({
    where: { id: keyResultId, objective: { orgId: org.id } },
  });
  if (!kr) throw new Error("Key result not found");

  await prisma.keyResult.update({ where: { id: keyResultId }, data: { current: value } });

  let aiCoaching: string | undefined;
  try {
    const progress = kr.target > 0 ? Math.round((value / kr.target) * 100) : 0;
    aiCoaching = await generateText({
      system: "You are an executive coach helping a B2B SaaS founder hit aggressive growth targets. Be concise and action-oriented.",
      prompt: `Key Result: "${kr.title}"
Target: ${kr.target} ${kr.unit ?? ""}
Current: ${value} ${kr.unit ?? ""} (${progress}% complete)
Note: ${note || "none"}

In 2-3 sentences: Is this on track? What's the single most important action to accelerate progress? Be direct.`,
      maxTokens: 200,
    });
  } catch {
    // AI coaching is optional
  }

  const checkIn = await prisma.checkIn.create({
    data: { keyResultId, value, note: note || undefined, aiCoaching },
  });

  revalidatePath("/dashboard/goals/okrs");
  return checkIn;
}

export async function deleteObjective(id: string) {
  const org = await requireOrg();
  await prisma.objective.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/dashboard/goals/okrs");
}
