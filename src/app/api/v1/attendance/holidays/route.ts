import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const holidays = await prisma.gazettedHoliday.findMany({
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: holidays,
    });
  } catch (error: any) {
    console.error('Fetch holidays error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can define holidays.' }, { status: 403 });
    }

    const body = await req.json();
    const { dateStr, name } = body;

    if (!dateStr || !name) {
      return NextResponse.json({ success: false, message: 'Date and name are required.' }, { status: 400 });
    }

    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    const exists = await prisma.gazettedHoliday.findUnique({
      where: { date: dateObj }
    });

    if (exists) {
      return NextResponse.json({ success: false, message: 'A holiday is already defined for this date.' }, { status: 400 });
    }

    const holiday = await prisma.gazettedHoliday.create({
      data: {
        date: dateObj,
        name,
      }
    });

    return NextResponse.json({
      success: true,
      data: holiday,
      message: 'Gazetted Holiday defined successfully.'
    });
  } catch (error: any) {
    console.error('Create holiday error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can delete holidays.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Holiday ID is required.' }, { status: 400 });
    }

    const hId = parseInt(id, 10);
    if (isNaN(hId)) {
      return NextResponse.json({ success: false, message: 'Invalid holiday ID.' }, { status: 400 });
    }

    await prisma.gazettedHoliday.delete({
      where: { id: hId }
    });

    return NextResponse.json({
      success: true,
      message: 'Gazetted Holiday removed successfully.'
    });
  } catch (error: any) {
    console.error('Delete holiday error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    }, { status: 500 });
  }
}
