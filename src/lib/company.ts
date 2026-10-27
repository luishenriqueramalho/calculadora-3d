import "server-only";

import type { Document, Filter } from "mongodb";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

type CompanyUserDocument = {
  id: string;
  name: string;
  email: string;
  storeName: string;
  role?: "owner" | "member";
  companyId?: string;
};

export async function getCompanyContext() {
  const session = await getSession();
  if (!session) return null;
  const db = await getDatabase();
  const user = await db.collection<CompanyUserDocument>("users").findOne({ id: session.userId });
  if (!user) return null;
  return {
    db,
    user,
    companyId: typeof user.companyId === "string" ? user.companyId : user.id,
  };
}

export function companyFilter(companyId: string): Filter<Document> {
  return { $or: [{ companyId }, { ownerId: companyId }] };
}
