export class Expo {
  sendPushNotificationsAsync(messages: any[]) {
    return Promise.resolve(messages.map(() => ({ status: 'ok' })));
  }
  chunkPushNotifications(messages: any[]) {
    return [messages];
  }
}
