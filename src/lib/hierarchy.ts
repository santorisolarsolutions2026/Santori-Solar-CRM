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

/**
 * Generates the unified Prisma LeadWhereInput filter for lead visibility across the app:
 * 1. Admin, Director, or users with 'leads:view_all' see all leads.
 * 2. If a lead is ASSIGNED: it is visible ONLY to the assigned employee and everyone ABOVE them in the hierarchy (where assignee is in allowedIds = [userId, ...subordinateIds]).
 * 3. If a lead is UNASSIGNED: it is visible ONLY to the creator (and supervisors above creator, where creator is in allowedIds = [userId, ...subordinateIds]).
 */
export async function getLeadVisibilityCondition(
  userId: number,
  role: string,
  userPermissions: string[]
) {
  const baseRole = role.includes(':') ? role.split(':')[0] : role;
  const isAdminOrDirector = ['admin', 'director'].includes(baseRole) || role.startsWith('admin:');
  const hasViewAll = userPermissions.includes('leads:view_all') || isAdminOrDirector;

  if (hasViewAll) {
    return {};
  }

  const subordinateIds = await getSubordinateIds(userId);
  const allowedIds = [userId, ...subordinateIds];

  const isUnassigned = {
    assignedConsultantId: null,
    assignedTlId: null,
    assignedManagerId: null,
  };

  return {
    OR: [
      // 1. Assigned to user or anyone below user in hierarchy
      { assignedConsultantId: { in: allowedIds } },
      { assignedTlId: { in: allowedIds } },
      { assignedManagerId: { in: allowedIds } },

      // 2. Unassigned lead created by user or anyone below user in hierarchy
      {
        AND: [
          isUnassigned,
          { createdById: { in: allowedIds } }
        ]
      },

      // 3. Draft order rejection fallback for submitter
      {
        order: {
          status: 'draft',
          rejectionReason: { not: null },
          submittedById: userId,
        }
      }
    ]
  };
}



