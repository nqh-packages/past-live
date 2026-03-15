/**
 * @what - Scroll position detection for smart auto-scroll
 * @why - Only auto-scroll chat log when user is near bottom
 * @exports - isNearBottom
 */

const THRESHOLD_PX = 48;

export function isNearBottom(scrollTop: number, clientHeight: number, scrollHeight: number): boolean {
  return scrollTop + clientHeight >= scrollHeight - THRESHOLD_PX;
}
