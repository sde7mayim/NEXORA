import { describe, it, expect } from "vitest";
import { APP_VERSION, APP_RELEASE_STATUS, getAppVersionDisplay } from "@/lib/version";

describe("Application Versioning Framework", () => {
  it("should match Semantic Versioning format (0.4.0)", () => {
    expect(APP_VERSION).toBe("0.4.0");
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    expect(APP_VERSION).toMatch(semverRegex);
  });

  it("should declare development release status for current build", () => {
    expect(APP_RELEASE_STATUS).toBe("development");
    const display = getAppVersionDisplay();
    expect(display).toContain("Nexora v0.4.0 (development)");
  });
});
