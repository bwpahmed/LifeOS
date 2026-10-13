import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const login = readFileSync(join(process.cwd(), "app", "login", "page.tsx"), "utf8");

describe("public login privacy", () => {
  it("does not prefill a private account address for anonymous visitors", () => {
    expect(login).toContain('const [email, setEmail] = useState("");');
    expect(login).not.toMatch(/useState\(["'][^"']+@[^"']+["']\)/);
  });

  it("still supports password-manager username autofill and email sign-in", () => {
    expect(login).toContain('autoComplete="username"');
    expect(login).toContain('name="email"');
    expect(login).toContain('autoComplete="current-password"');
    expect(login).toContain("supabaseEmailAuthClient()");
  });
});
