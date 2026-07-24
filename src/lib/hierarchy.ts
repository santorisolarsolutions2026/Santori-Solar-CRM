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



