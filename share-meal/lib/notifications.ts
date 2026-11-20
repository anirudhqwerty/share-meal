import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const supportsNativePush = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
let nativeModule: Promise<typeof import('expo-notifications')> | undefined;

export function getNativeNotifications() {
  if (!supportsNativePush) return Promise.resolve(null);
  nativeModule ??= import('expo-notifications');
  return nativeModule;
}
