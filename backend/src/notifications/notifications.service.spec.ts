import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';

jest.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken() {
      return true;
    }

    chunkPushNotifications(messages: unknown[]) {
      return [messages];
    }

    sendPushNotificationsAsync() {
      return Promise.resolve([]);
    }
  },
}));

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
