import { Injectable } from '@nestjs/common';
import type { Expo as ExpoType, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private expoInstance: ExpoType | null = null;

  private async getExpo(): Promise<ExpoType> {
    if (!this.expoInstance) {
      const { Expo } = await import('expo-server-sdk');
      this.expoInstance = new Expo();
    }
    return this.expoInstance;
  }

  async sendNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: any,
  ) {
    const { Expo } = await import('expo-server-sdk');
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
      const expo = await this.getExpo();
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`Bildirim başarıyla gönderildi: ${title}`);
    } catch (error) {
      console.error('Bildirim gönderilirken hata:', error);
    }
  }
}
