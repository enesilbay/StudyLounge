import { Injectable } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private expo = new Expo();

  async sendNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: any,
  ) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token geçerli değil: ${String(pushToken)}`);
      return;
    }

    const messages: ExpoPushMessage[] = [
      {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data as Record<string, unknown>,
      },
    ];

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`Bildirim başarıyla gönderildi: ${title}`);
    } catch (error) {
      console.error('Bildirim gönderilirken hata:', error);
    }
  }
}
