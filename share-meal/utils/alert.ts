import { Alert as NativeAlert, Platform, type AlertButton, type AlertOptions } from 'react-native';

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (Platform.OS !== 'web') return NativeAlert.alert(title, message, buttons, options);
    const content = [title, message].filter(Boolean).join('\n\n');
    if (buttons && buttons.length > 1) {
      const accepted = window.confirm(content);
      const choice = accepted ? buttons.find((button) => button.style !== 'cancel') : buttons.find((button) => button.style === 'cancel');
      choice?.onPress?.();
    } else {
      window.alert(content);
      buttons?.[0]?.onPress?.();
    }
  },
};
