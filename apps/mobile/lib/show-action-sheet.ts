import { ActionSheetIOS, Alert, Platform } from "react-native";

export interface ShowActionSheetOptions {
  options: string[];
  cancelButtonIndex: number;
  destructiveButtonIndex?: number;
  title?: string;
  message?: string;
}

export function showActionSheet(
  opts: ShowActionSheetOptions,
  callback: (selectedIndex: number) => void,
): void {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(opts, callback);
    return;
  }

  // Android fallback: Alert.alert with button array
  const buttons = opts.options.map((text, index) => ({
    text,
    onPress: () => callback(index),
    style:
      index === opts.cancelButtonIndex
        ? ("cancel" as const)
        : index === opts.destructiveButtonIndex
          ? ("destructive" as const)
          : ("default" as const),
  }));

  Alert.alert(opts.title ?? "", opts.message ?? "", buttons, {
    cancelable: true,
  });
}
