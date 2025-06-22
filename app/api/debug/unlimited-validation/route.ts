import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Get user from token
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authorized. Please log in.' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    const userId = Number(payload.userId);

    // 2. Get classId from query params
    const { searchParams } = new URL(request.url);
    const scheduledClassId = searchParams.get('classId');

    if (!scheduledClassId) {
      return NextResponse.json({ error: 'Please provide a classId parameter in the URL. E.g., /api/debug/unlimited-validation?classId=123' }, { status: 400 });
    }
    const classId = parseInt(scheduledClassId, 10);

    const debugData: { [key: string]: any } = {};

    // 3. Re-implement the logic from the service to expose variables
    debugData.inputs = {
      userId,
      classId,
    };

    // Get Class Info
    const scheduledClass = await prisma.scheduledClass.findUnique({
      where: { id: classId },
    });

    if (!scheduledClass) {
        return NextResponse.json({ error: `Class with ID ${classId} not found.` }, { status: 404 });
    }
    
    debugData.classInfo = {
        id: scheduledClass.id,
        date_from_db: scheduledClass.date,
        date_from_db_iso: scheduledClass.date.toISOString(),
    };

    // Replicate the timezone-safe start of week calculation
    const classDate = scheduledClass.date;
    const tempDate = new Date(classDate.getTime());
    const dayOfWeek = tempDate.getUTCDay(); // Sunday = 0, Monday = 1
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    tempDate.setUTCDate(tempDate.getUTCDate() + diffToMonday);
    tempDate.setUTCHours(0, 0, 0, 0);
    const classWeekStart = tempDate;

    debugData.weekCalculation = {
        classDate_utc: classDate.toUTCString(),
        calculated_weekStart_utc: classWeekStart.toUTCString(),
        calculated_weekStart_iso: classWeekStart.toISOString(),
    };
    
    // Build the query parameters to find the package
    const queryParams = {
        where: {
            userId,
            packageId: 3,
            isActive: true,
            purchaseDate: classWeekStart,
        },
    };
    debugData.databaseQueryParameters = queryParams;

    // Execute the query
    const validPackageForClass = await prisma.userPackage.findFirst(queryParams);
    debugData.databaseQueryResult = validPackageForClass;

    // For comparison, let's find the user's most recent unlimited package to see what's actually in the DB
    const anyUnlimitedPackage = await prisma.userPackage.findFirst({
        where: { userId, packageId: 3, isActive: true },
        orderBy: { purchaseDate: 'desc' },
    });
    
    if (anyUnlimitedPackage) {
        debugData.usersLatestUnlimitedPackage = {
            id: anyUnlimitedPackage.id,
            purchaseDate_from_db: anyUnlimitedPackage.purchaseDate,
            purchaseDate_from_db_iso: anyUnlimitedPackage.purchaseDate.toISOString(),
            purchaseDate_from_db_utc: anyUnlimitedPackage.purchaseDate.toUTCString(),
            expiryDate_from_db: anyUnlimitedPackage.expiryDate,
        };
    } else {
        debugData.usersLatestUnlimitedPackage = "No active unlimited packages found for this user.";
    }


    return NextResponse.json(debugData);

  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
} 