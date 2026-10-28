/**
 * Validates internal redirect paths to prevent open redirect vulnerabilities.
 * Ensures the target starts with a single '/' and does not contain protocol schemes or backslashes.
 */
export function validateInternalRedirect(target: string | null | undefined, fallback: string = "/app"): string {
  if (!target) return fallback;
  const clean = target.trim();
  if (
    clean.startsWith("/") &&
    !clean.startsWith("//") &&
    !clean.includes(":") &&
    !clean.includes("\\")
  ) {
    return clean;
  }
  return fallback;
}
