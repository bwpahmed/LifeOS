import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

describe("LifeOS service worker private-data cache safety", () => {
  it("precaches only public, non-user-specific shell assets", () => {
    const core = source.match(/const CORE = (\[[^\n]+\]);/);
    expect(core).not.toBeNull();
    const paths = JSON.parse(core![1]) as string[];
    expect(paths).toEqual(["/offline.html", "/manifest.webmanifest", "/icons/icon.svg"]);
    expect(paths).not.toContain("/habits");
    expect(paths).not.toContain("/today");
  });

  it("falls back to public offline.html, never cached private navigation HTML", () => {
    const navigate = source.match(/if \(request\.mode === "navigate"\) \{([\s\S]*?)\n  \}/);
    expect(navigate).not.toBeNull();
    expect(navigate![1]).toContain('caches.match("/offline.html")');
    expect(navigate![1]).not.toContain("caches.match(request)");
  });

  it("invalidates prior unsafe cache and never caches API responses", () => {
    expect(source).toContain('const CACHE = "lifeos-v6"');
    expect(source).toContain("keys.filter((key) => key !== CACHE)");
    expect(source).toContain('url.pathname.startsWith("/api/")');
    expect(source).toContain("if (!isStatic) return;");
  });
});
