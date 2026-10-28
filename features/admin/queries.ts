import { db } from "@/lib/db";

// Lecturas de administración. Proyecciones explícitas: jamás passwordHash
// ni tokens. Solo las consume UI con requireAdmin previo (layout).

export async function getAdminMetrics(): Promise<{
  users: number;
  sellers: number;
  listingsByStatus: Record<string, number>;
  openReports: number;
  comparisons: number;
}> {
  // groupBy tipa _count como unión incómoda; 6 counts indexados en 1 transacción.
  const statuses = ["DRAFT", "PENDING", "PUBLISHED", "SOLD", "REJECTED", "ARCHIVED"] as const;
  const [users, sellers, openReports, comparisons] = await db.$transaction([
    db.user.count(),
    db.seller.count(),
    db.report.count({ where: { status: "OPEN" } }),
    db.comparison.count(),
  ]);
  const statusCounts = await db.$transaction(
    statuses.map((status) => db.listing.count({ where: { status } })),
  );
  const listingsByStatus: Record<string, number> = {};
  statuses.forEach((s, i) => {
    listingsByStatus[s] = statusCounts[i] ?? 0;
  });
  return { users, sellers, listingsByStatus, openReports, comparisons };
}

export async function getPendingListings(): Promise<
  Array<{
    id: string;
    title: string;
    year: number;
    priceMXN: number | null;
    city: string | null;
    createdAt: Date;
    brand: { name: string };
    carModel: { name: string };
    sellerEmail: string | null;
    photoCount: number;
  }>
> {
  const rows = await db.listing.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      year: true,
      priceMXN: true,
      city: true,
      createdAt: true,
      brand: { select: { name: true } },
      carModel: { select: { name: true } },
      seller: { select: { user: { select: { email: true } } } },
      _count: { select: { images: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    year: r.year,
    priceMXN: r.priceMXN,
    city: r.city,
    createdAt: r.createdAt,
    brand: r.brand,
    carModel: r.carModel,
    sellerEmail: r.seller.user.email,
    photoCount: r._count.images,
  }));
}

export async function getAdminUsers(): Promise<
  Array<{
    id: string;
    email: string;
    role: "USER" | "SELLER" | "ADMIN";
    status: "ACTIVE" | "BLOCKED";
    createdAt: Date;
    listings: number;
  }>
> {
  const rows = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      seller: { select: { _count: { select: { listings: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    status: r.status,
    createdAt: r.createdAt,
    listings: r.seller?._count.listings ?? 0,
  }));
}

export async function getAdminReports(): Promise<
  Array<{
    id: string;
    reason: string;
    detail: string | null;
    status: string;
    createdAt: Date;
    listingTitle: string;
    listingSlug: string;
    reporterEmail: string | null;
  }>
> {
  const rows = await db.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      reason: true,
      detail: true,
      status: true,
      createdAt: true,
      listing: { select: { title: true, slug: true } },
      reporter: { select: { email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    createdAt: r.createdAt,
    listingTitle: r.listing.title,
    listingSlug: r.listing.slug,
    reporterEmail: r.reporter?.email ?? null,
  }));
}

export async function getAuditLog(): Promise<
  Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    reason: string | null;
    createdAt: Date;
    adminEmail: string;
  }>
> {
  const rows = await db.adminAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      reason: true,
      createdAt: true,
      admin: { select: { email: true } },
    },
  });
  return rows.map((r) => ({ ...r, adminEmail: r.admin.email }));
}
