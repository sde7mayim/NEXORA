// Centralized source of truth for Nexora Application Version
// Follows Semantic Versioning: MAJOR.MINOR.PATCH
export type ReleaseStatus = "development" | "prerelease" | "stable";
export const APP_VERSION = "0.4.0";
export const APP_RELEASE_STATUS: ReleaseStatus = "development";
export const APP_NAME = "Nexora";
export const APP_TAGLINE = "One workspace. Many intelligences.";

export function getAppVersionDisplay(): string {
  if (APP_RELEASE_STATUS === "stable") {
    return `${APP_NAME} v${APP_VERSION}`;
  }
  return `${APP_NAME} v${APP_VERSION} (${APP_RELEASE_STATUS})`;
}
