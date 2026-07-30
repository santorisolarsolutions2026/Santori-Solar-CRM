import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const targetUserId = parseInt(id, 10);
    if (isNaN(targetUserId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    }

    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        designation: { select: { name: true } },
        department: { select: { name: true } }
      }
    });

    const rootUser = allUsers.find(u => u.id === targetUserId);
    if (!rootUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Recursively build the organization tree
    const buildTree = (parentId: number): any[] => {
      const children = allUsers.filter(u => u.reportsTo === parentId);
      return children.map(child => ({
        id: child.id,
        name: child.name,
        email: child.email,
        designation: child.designation?.name || child.role,
        department: child.department?.name,
        children: buildTree(child.id)
      }));
    };

    const tree = {
      id: rootUser.id,
      name: rootUser.name,
      email: rootUser.email,
      designation: rootUser.designation?.name || rootUser.role,
      department: rootUser.department?.name,
      children: buildTree(rootUser.id)
    };

    return NextResponse.json({ success: true, tree });
  } catch (error: any) {
    console.error('Hierarchy fetch error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
