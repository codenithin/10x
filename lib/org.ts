import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getOrCreateOrg() {
  const { orgId, orgSlug, userId } = await auth();

  // Use active org, or fall back to personal workspace keyed to userId
  const key = orgId ?? (userId ? `user_${userId}` : null);
  if (!key || !userId) throw new Error("Not authenticated");

  let org = await prisma.organization.findUnique({
    where: { clerkOrgId: key },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        clerkOrgId: key,
        name: orgSlug ?? (orgId ? orgId : "Personal Workspace"),
      },
    });
  }

  return org;
}

export async function requireOrg() {
  return getOrCreateOrg();
}
