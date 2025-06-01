import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Assuming @ is configured for project root

export async function GET() {
  try {
    const users = await db.user.findMany({
      include: {
        userPackages: {
          where: {
            isActive: true, // Consider only active packages
          },
          orderBy: {
            purchaseDate: 'desc', // Get the latest package if multiple active
          },
          take: 1, // Take only the most recent active package
          include: {
            package: true, // Include the Package details
          },
        },
      },
    });

    const formattedUsers = users.map((user) => {
      const activePackage = user.userPackages[0]; // We took only one
      let remainingClassesDisplay = activePackage?.classesRemaining?.toString() ?? 'N/A';
      let packageName = activePackage?.package?.name ?? 'No Package';

      if (activePackage?.package?.name === 'MEMBRESÍA MENSUAL') {
        remainingClassesDisplay = 'Ilimitado';
      }

      return {
        id: user.user_id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone ?? 'N/A',
        status: user.status,
        joinDate: user.joinDate ? new Date(user.joinDate).toISOString().split('T')[0] : 'N/A',
        lastVisit: user.lastVisitDate ? new Date(user.lastVisitDate).toISOString().split('T')[0] : 'N/A',
        package: packageName,
        remainingClasses: remainingClassesDisplay,
        // raw package name for potential filtering if needed on client
        rawPackageName: activePackage?.package?.name, 
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('[ADMIN_GET_USERS_API]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
