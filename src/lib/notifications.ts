import { supabase } from '@/integrations/supabase/client';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

type NotificationType = 'order' | 'chat' | 'delivery' | 'general';

interface SendNotificationParams {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  data?: Record<string, unknown>;
}

/**
 * Send a notification to a specific user.
 * This stores the notification in the database and attempts to send a push notification.
 */
export async function sendNotification({
  userId,
  title,
  body,
  type = 'general',
  data = {},
}: SendNotificationParams): Promise<boolean> {
  if (DEMO_DATA_MODE) {
    console.info('Demo mode notification:', { userId, title, body, type, data });
    return true;
  }

  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        title,
        body,
        notification_type: type,
        data,
      },
    });

    if (error) {
      console.error('Error sending notification:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to send notification:', err);
    return false;
  }
}

// Pre-built notification helpers
export const notifications = {
  orderPlaced: (userId: string, orderId: string) =>
    sendNotification({
      userId,
      title: 'Order Placed! 🎉',
      body: 'Your order has been placed successfully and is awaiting confirmation.',
      type: 'order',
      data: { orderId, url: `/marketplace/orders` },
    }),

  orderAccepted: (userId: string, orderId: string) =>
    sendNotification({
      userId,
      title: 'Order Accepted ✅',
      body: 'Your order has been accepted by the seller and is being prepared.',
      type: 'order',
      data: { orderId, url: `/track/${orderId}` },
    }),

  orderOutForDelivery: (userId: string, orderId: string) =>
    sendNotification({
      userId,
      title: 'Out for Delivery 🚚',
      body: 'Your order is on its way! Track it in real-time.',
      type: 'delivery',
      data: { orderId, url: `/track/${orderId}` },
    }),

  orderDelivered: (userId: string, orderId: string) =>
    sendNotification({
      userId,
      title: 'Order Delivered! 📦',
      body: 'Your order has been delivered. Enjoy!',
      type: 'order',
      data: { orderId, url: `/marketplace/orders` },
    }),

  newChatMessage: (userId: string, senderName: string, consultationId: string) =>
    sendNotification({
      userId,
      title: `New message from ${senderName}`,
      body: 'You have a new chat message. Tap to view.',
      type: 'chat',
      data: { consultationId, url: `/veterinary/chat` },
    }),

  consultationRequest: (vetId: string, farmerId: string) =>
    sendNotification({
      userId: vetId,
      title: 'New Consultation Request 🩺',
      body: 'A farmer is requesting your consultation.',
      type: 'general',
      data: { farmerId, url: `/veterinary/consultations` },
    }),

  consultationAccepted: (farmerId: string, vetName: string) =>
    sendNotification({
      userId: farmerId,
      title: 'Consultation Accepted! ✅',
      body: `Dr. ${vetName} has accepted your consultation request.`,
      type: 'general',
      data: { url: `/veterinary/chat` },
    }),

  newOrderForSeller: (sellerId: string, orderId: string) =>
    sendNotification({
      userId: sellerId,
      title: 'New Order Received! 🛒',
      body: 'You have a new order. Check your dashboard.',
      type: 'order',
      data: { orderId, url: `/farmer/products` },
    }),

  newDeliveryAssignment: (deliveryPartnerId: string, orderId: string) =>
    sendNotification({
      userId: deliveryPartnerId,
      title: 'New Delivery Assignment 📍',
      body: 'You have been assigned a new delivery.',
      type: 'delivery',
      data: { orderId, url: `/delivery/orders` },
    }),
};
