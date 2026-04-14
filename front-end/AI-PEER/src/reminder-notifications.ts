import * as Notifications from "expo-notifications";

export type Reminder = {
  id: string;
  title: string;
  hour: number;
  minute: number;
  enabled: boolean;
  notificationId?: string;
};

export async function requestReminderPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function scheduleReminderNotification(reminder: Reminder) {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "AI PEER Reminder",
      body: reminder.title,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminder.hour,
      minute: reminder.minute,
    },
  });

  return id;
}

export async function cancelReminderNotification(notificationId?: string) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// Fires a local notification a second from now. Used by the Sound Alerts
// preview button so users actually hear the real path they're opting into,
// instead of a desktop-only WebAudio beep that silently fails on device.
export async function scheduleTestNotification() {
  const granted = await requestReminderPermissions();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "AI PEER",
      body: "Sound alert preview",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
  return true;
}
