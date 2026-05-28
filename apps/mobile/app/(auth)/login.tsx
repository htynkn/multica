import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { MulticaLogo } from "@/components/brand/multica-logo";
import { useAuthStore } from "@/data/auth-store";
import { mapAuthError } from "@/lib/auth-error";
import { setToken } from "@/data/secure-storage";
import { api } from "@/data/api";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || process.env.EXPO_PUBLIC_API_URL;

export default function Login() {
  const sendCode = useAuthStore((s) => s.sendCode);
  const googleClientId = useAuthStore((s) => s.googleClientId);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  const handleOAuthCallback = useCallback(async (url: string) => {
    // Guard against duplicate calls (openAuthSessionAsync + Linking listener).
    if (handledRef.current) return;
    handledRef.current = true;

    try {
      const parsed = new URL(url);
      const token = parsed.searchParams.get("token");
      if (!token) return;

      await setToken(token);
      api.setToken(token);
      const user = await api.getMe();
      useAuthStore.getState().setUser(user);
      router.replace("/");
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(mapAuthError(err, "Google login failed. Try again."));
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  // Cold-launch: if the app was opened by a deep link, handle it.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url?.includes("auth/callback")) {
        handleOAuthCallback(url);
      }
    });
  }, [handleOAuthCallback]);

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    void Haptics.selectionAsync();
    setSubmitting(true);
    setError(null);
    try {
      await sendCode(trimmed);
      router.push({ pathname: "/verify", params: { email: trimmed } });
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(mapAuthError(err, "Couldn't send the code. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    if (!WEB_URL || !googleClientId) return;
    void Haptics.selectionAsync();
    setGoogleLoading(true);
    setError(null);
    handledRef.current = false;

    try {
      // Open the web login page with platform:mobile in the state so the
      // callback page knows to redirect back via deep link.
      const loginUrl = `${WEB_URL}/login?state=platform:mobile`;
      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl,
        Linking.createURL("auth/callback"),
      );

      if (result.type === "success" && result.url) {
        await handleOAuthCallback(result.url);
      } else {
        setGoogleLoading(false);
      }
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(mapAuthError(err, "Google login failed. Try again."));
      setGoogleLoading(false);
    }
  };

  const isGoogleAvailable = !!googleClientId && !!WEB_URL;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 justify-center px-6 gap-6">
          <View className="items-center gap-3">
            <MulticaLogo size={32} />
            <View className="gap-1 items-center">
              <Text className="text-2xl font-semibold text-foreground">
                Sign in to Multica
              </Text>
              <Text className="text-sm text-muted-foreground text-center">
                Enter your email and we&apos;ll send you a verification code.
              </Text>
            </View>
          </View>

          <View className="gap-3">
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
              keyboardType="email-address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={onSubmit}
              returnKeyType="send"
              editable={!submitting}
              invalid={!!error}
            />
            {error ? (
              <Text className="text-sm text-destructive">{error}</Text>
            ) : null}
          </View>

          <Button
            size="lg"
            disabled={submitting || googleLoading || !email.trim()}
            onPress={onSubmit}
          >
            <Text>{submitting ? "Sending..." : "Send code"}</Text>
          </Button>

          {isGoogleAvailable && (
            <>
              <View className="flex-row items-center gap-3">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-xs text-muted-foreground uppercase">
                  or
                </Text>
                <View className="flex-1 h-px bg-border" />
              </View>

              <Button
                variant="outline"
                size="lg"
                disabled={googleLoading || submitting}
                onPress={onGoogleLogin}
              >
                <Text>
                  {googleLoading
                    ? "Signing in..."
                    : "Continue with Google"}
                </Text>
              </Button>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
