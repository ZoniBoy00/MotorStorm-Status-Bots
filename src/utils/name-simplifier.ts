/**
 * Simplify player name by cutting everything after the first space.
 * Since MotorStorm usernames can't have spaces, this effectively
 * removes all platform indicators and other suffixes.
 */
export function simplifyName(name: string | null | undefined): string {
  if (!name) return '';
  return name.split(' ')[0].trim();
}
