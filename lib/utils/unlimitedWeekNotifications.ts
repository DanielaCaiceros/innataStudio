// utils/unlimitedWeekNotifications.ts
// Utilidades para notificaciones específicas de semana ilimitada

import { prisma } from '@/lib/prisma';

export async function sendUnlimitedWeekWarningNotification(
  userId: number, 
  remainingClasses: number
) {
  try {
    const message = remainingClasses <= 5 
      ? `Te quedan solo ${remainingClasses} clases en tu semana ilimitada`
      : `Has usado ${25 - remainingClasses} de 25 clases en tu semana ilimitada`;

    await prisma.notifications.create({
      data: {
        user_id: userId,
        type: 'unlimited_week_usage',
        title: 'Semana Ilimitada - Uso de Clases',
        message,
        data: {
          remainingClasses,
          usedClasses: 25 - remainingClasses,
          totalClasses: 25,
          packageType: 'unlimited_week'
        },
        is_read: false
      }
    });

  } catch (error) {
    console.error('Error sending unlimited week notification:', error);
  }
}

export async function sendPenaltyNotification(
  userId: number,
  missedClass: any,
  cancelledClass: any | null
) {
  try {
    const message = cancelledClass 
      ? `Se canceló tu clase del ${cancelledClass.date} por no asistir a la clase del ${missedClass.date}`
      : `Se registró tu inasistencia a la clase del ${missedClass.date}`;

    await prisma.notifications.create({
      data: {
        user_id: userId,
        type: 'unlimited_week_penalty',
        title: 'Semana Ilimitada - Penalización Aplicada',
        message,
        data: {
          missedClass,
          cancelledClass,
          packageType: 'unlimited_week',
          penaltyType: cancelledClass ? 'class_cancelled' : 'no_show_recorded'
        },
        is_read: false
      }
    });

  } catch (error) {
    console.error('Error sending penalty notification:', error);
  }
}