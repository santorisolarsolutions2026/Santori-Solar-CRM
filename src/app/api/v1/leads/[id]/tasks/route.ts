import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    const tasks = await prisma.leadTask.findMany({
      where: { leadId },
      include: {
        completedBy: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('Fetch lead tasks error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    const body = await req.json();
    const { taskId, isCompleted } = body;
    if (taskId === undefined || isCompleted === undefined) {
      return NextResponse.json({ success: false, message: 'Task ID and isCompleted value are required.' }, { status: 400 });
    }

    const task = await prisma.leadTask.findUnique({
      where: { id: parseInt(taskId, 10) },
    });
    if (!task || task.leadId !== leadId) {
      return NextResponse.json({ success: false, message: 'Task not found for this lead.' }, { status: 404 });
    }

    const updatedTask = await prisma.leadTask.update({
      where: { id: task.id },
      data: {
        isCompleted: !!isCompleted,
        completedById: isCompleted ? userPayload.id : null,
        completedAt: isCompleted ? new Date() : null,
      },
      include: {
        completedBy: { select: { id: true, name: true } },
      },
    });

    // Write to audit log
    await prisma.auditLog.create({
      data: {
        leadId,
        tableName: 'LeadTask',
        recordId: task.id,
        fieldName: 'isCompleted',
        oldValue: task.isCompleted ? 'Completed' : 'Pending',
        newValue: isCompleted ? 'Completed' : 'Pending',
        userId: userPayload.id,
      },
    });

    // Write to LeadActivityLog
    await prisma.leadActivityLog.create({
      data: {
        leadId,
        userId: userPayload.id,
        toStatus: (await prisma.lead.findUnique({ where: { id: leadId }, select: { status: true } }))?.status || 1,
        remark: `[TASK UPDATE] Mandatory task "${task.taskName}" marked as ${isCompleted ? 'COMPLETED' : 'PENDING'}.`,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: `Task successfully updated.`,
    });
  } catch (error: any) {
    console.error('Update lead task error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
