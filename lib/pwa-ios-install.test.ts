import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const notifications = read("app/notifications/page.tsx");
const install = read("components/install-pwa.tsx");
const manifest = JSON.parse(read("public/manifest.webmanifest")) as { id?: string; display?: string };

describe("iPhone Home Screen push onboarding", () => {
  it("explains Safari Add to Home Screen when iOS has no install prompt", () => {
    expect(install).toContain("if (!ios) return null;");
    expect(install).toContain("Add to Home Screen");
    expect(install).toContain("Install LifeOS on iPhone");
    expect(install).toContain("navigator.maxTouchPoints");
  });

  it("uses a stable installed-app manifest identity", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("prepares public key and registration before requesting push permission", () => {
    expect(notifications).toContain('fetch("/api/push/vapid-public",{signal:controller.signal})');
    const gesture = notifications.slice(notifications.indexOf("async function enablePush()"), notifications.indexOf("async function disablePush()"));
    expect(gesture).not.toContain('fetch("/api/push/vapid-public")');
    expect(gesture).not.toContain("navigator.serviceWorker.ready");
    expect(gesture.indexOf("Notification.requestPermission()")).toBeLessThan(gesture.indexOf("pushManager.subscribe("));
  });

  it("does not offer unsupported iPhone browser push as working", () => {
    expect(notifications).toContain("ios&&!standalone");
    expect(notifications).toContain("disabled={signedIn!==true||!supported||!pushRegistration||!pushKey||(ios&&!standalone)}");
    expect(notifications).toContain("role=\"alert\"");
  });
});
