import { prisma } from './db';

/**
 * Recursively fetches all subordinate user IDs (direct and indirect) for a given supervisor ID.
 * This runs in a single database round-trip by fetching active users and traversing in memory.
 */
export async function getSubordinateIds(userId: number): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, reportsTo: true }
  });

  const subordinateMap = new Map<number, number[]>();
  for (const u of users) {
    if (u.reportsTo !== null) {
      if (!subordinateMap.has(u.reportsTo)) {
        subordinateMap.set(u.reportsTo, []);
      }
      subordinateMap.get(u.reportsTo)!.push(u.id);
    }
  }

  const result: number[] = [];
  const queue = [userId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const directSubs = subordinateMap.get(current) || [];
    for (const subId of directSubs) {
      if (!result.includes(subId)) {
        result.push(subId);
        queue.push(subId);
      }
    }
  }

  return result;
}

/**
 * Recursively fetches all ancestor user IDs (direct and indirect supervisors) up to the root.
 * This runs in a single database round-trip by fetching active users and traversing in memory.
 */
export async function getAncestorIds(userId: number): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, reportsTo: true }
  });

  const parentMap = new Map<number, number | null>();
  for (const u of users) {
    parentMap.set(u.id, u.reportsTo);
  }

  const result: number[] = [];
  let currentId = userId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const parentId = parentMap.get(currentId);
    if (parentId !== undefined && parentId !== null) {
      result.push(parentId);
      currentId = parentId;
    } else {
      break;
    }
  }

  return result;
}

export interface LeadAssigneeUser {
  id: number;
  name: string;
  role?: string | null;
}

export interface LeadAssignmentTarget {
  assignedManagerId?: number | null;
  assignedTlId?: number | null;
  assignedConsultantId?: number | null;
  manager?: LeadAssigneeUser | null;
  tl?: LeadAssigneeUser | null;
  consultant?: LeadAssigneeUser | null;
}

export interface CurrentUserTarget {
  id: number;
  role?: string | null;
}

/**
 * Returns the single assignee to display for a lead based on the viewer's position in the hierarchy.
 * - Manager sees the TL they assigned to (or Manager if unassigned down).
 * - TL sees the Consultant they assigned to (or TL if unassigned down).
 * - Consultant sees the Consultant.
 * - Admin/Director (who allotted to Manager) sees the Manager.
 */
export function getLeadAssignedDisplay(
  lead: LeadAssignmentTarget | null | undefined,
  currentUser: CurrentUserTarget | null | undefined
): LeadAssigneeUser | null {
  if (!lead) return null;

  const currentUserId = currentUser?.id;
  const roleLower = (currentUser?.role || '').toLowerCase().trim();

  // 1. Direct ID matches
  if (currentUserId) {
    if (lead.assignedConsultantId && currentUserId === lead.assignedConsultantId) {
      return lead.consultant || lead.tl || lead.manager || null;
    }
    if (lead.assignedTlId && currentUserId === lead.assignedTlId) {
      return lead.consultant || lead.tl || lead.manager || null;
    }
    if (lead.assignedManagerId && currentUserId === lead.assignedManagerId) {
      return lead.tl || lead.consultant || lead.manager || null;
    }
  }

  // 2. Role-based fallback
  if (['consultant', 'psa'].includes(roleLower)) {
    return lead.consultant || lead.tl || lead.manager || null;
  }
  if (['tl', 'psa_tl'].includes(roleLower)) {
    return lead.consultant || lead.tl || lead.manager || null;
  }
  if (['manager', 'sales_head'].includes(roleLower)) {
    return lead.tl || lead.consultant || lead.manager || null;
  }

  // 3. Top-level / Admin / Director / IT / Default fallback:
  return lead.manager || lead.tl || lead.consultant || null;
}


