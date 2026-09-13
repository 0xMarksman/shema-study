import { useEffect, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import AlertsCenter from "./components/AlertsCenter";
import { BibleScreen } from "./components/BibleScreen";
import GroupsScreen from "./components/GroupsScreen";
import MessagesScreen from "./components/MessagesScreen";
import { BookIcon, CalendarIcon, GearIcon, ListIcon, MessagesIcon, SunIcon, UsersIcon } from "./components/icons";
import { EventsScreen } from "./components/EventsScreen";
import { PlanScreen } from "./components/PlanScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { TodayScreen } from "./components/TodayScreen";
import { getToken, uploadPublicKey } from "./lib/api";
import { getOrCreateKeyPair, exportPublicKey } from "./lib/encryption";
import { realtime, buildWsUrl } from "./lib/realtime";
import { useAppState } from "./state/AppState";

type Tab = "today" | "events" | "plan" | "bible" | "messages" | "community" | "settings";

export default function App() {
  const { settings, user, skippedAuth, skipAuth, isAuthTransitioning } = useAppState();
  const [tab, setTab] = useState<Tab>("today");

  // Apply appearance settings as root data-attributes driving the CSS variables.
  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      if (!user && !skippedAuth) {
        // Logged-out landing page always uses a neutral default appearance.
        root.dataset.theme = "sepia";
        root.dataset.accent = "deepblue";
        root.dataset.font = "system";
        root.dataset.textAlign = "left";
        root.style.setProperty("--reader-font-size", "16px");
        root.style.setProperty("--reader-line-height", "1.55");
        root.style.setProperty("--reader-letter-spacing", "0em");
        return;
      }

      root.dataset.theme =
        settings.themeMode === "system"
          ? systemDark.matches
            ? "dark"
            : "light"
          : settings.themeMode;
      root.dataset.accent = settings.accent;
      root.dataset.font = settings.font;
      root.dataset.textAlign = settings.textAlign ?? "left";
      // Reader-scoped typography (these vars only affect .reader-body, not the whole app)
      root.style.setProperty("--reader-font-size", `${settings.fontSize ?? 16}px`);
      root.style.setProperty("--reader-line-height", `${settings.lineHeight ?? 1.55}`);
      root.style.setProperty("--reader-letter-spacing", `${settings.letterSpacing ?? 0}em`);
    };
    apply();
    systemDark.addEventListener("change", apply);
    return () => systemDark.removeEventListener("change", apply);
  }, [
    settings.themeMode,
    settings.accent,
    settings.font,
    settings.fontSize,
    settings.lineHeight,
    settings.letterSpacing,
    settings.textAlign,
    user,
    skippedAuth,
  ]);

  // Navigate to Bible tab when openBibleRef is called
  useEffect(() => {
    const handler = () => setTab("bible");
    window.addEventListener("navigate-bible", handler);
    return () => window.removeEventListener("navigate-bible", handler);
  }, []);

  useEffect(() => {
    const handler = () => setTab("community");
    window.addEventListener("navigate-community", handler);
    return () => window.removeEventListener("navigate-community", handler);
  }, []);

  useEffect(() => {
    const handler = () => setTab("messages");
    window.addEventListener("navigate-messages", handler);
    return () => window.removeEventListener("navigate-messages", handler);
  }, []);

  // Connect WebSocket when signed in
  useEffect(() => {
    const token = getToken();
    if (user && token) {
      realtime.connect(buildWsUrl(token));
    } else {
      realtime.disconnect();
    }
  }, [user]);

  // Initialize E2E key pair on login and upload public key to server
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getOrCreateKeyPair()
      .then((pair) => exportPublicKey(pair.publicKey))
      .then((jwk) => { if (!cancelled) return uploadPublicKey(jwk); })
      .catch(() => { /* non-fatal — user can still chat unencrypted */ });
    return () => { cancelled = true; };
  }, [user]);

  // Land on the login page unless already signed in (or explicitly skipped).
  if (isAuthTransitioning) {
    return (
      <div className="auth-screen" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading your preferences...</p>
      </div>
    );
  }

  if (!user && !skippedAuth) {
    return <AuthScreen onSkip={skipAuth} />;
  }

  return (
    <div className="app-shell">
      <AlertsCenter />
      {tab === "today" && <TodayScreen />}
      {tab === "events" && <EventsScreen />}
      {tab === "plan" && <PlanScreen />}
      {tab === "bible" && <BibleScreen />}
      {tab === "messages" && <MessagesScreen />}
      {tab === "community" && <GroupsScreen />}
      {tab === "settings" && <SettingsScreen />}

      <nav className="tab-bar" aria-label="Main">
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>
          <SunIcon />
          Today
        </button>
        <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events") }>
          <CalendarIcon />
          Events
        </button>
        <button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}>
          <ListIcon />
          Plan
        </button>
        <button className={tab === "bible" ? "active" : ""} onClick={() => setTab("bible")}>
          <BookIcon />
          Bible
        </button>
        <button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}>
          <MessagesIcon />
          Messages
        </button>
        <button className={tab === "community" ? "active" : ""} onClick={() => setTab("community")}>
          <UsersIcon />
          Community
        </button>
        <button
          className={tab === "settings" ? "active" : ""}
          onClick={() => setTab("settings")}
        >
          <GearIcon />
          Settings
        </button>
      </nav>
    </div>
  );
}
