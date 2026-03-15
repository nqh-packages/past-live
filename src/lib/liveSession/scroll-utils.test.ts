/**
 * @what - Tests for scroll position detection
 * @why - Smart auto-scroll needs to know if user is near bottom
 */

import { describe, it, expect } from 'vitest';
import { isNearBottom } from './scroll-utils';

describe('isNearBottom', () => {
  it('returns true when scrolled to bottom', () => {
    expect(isNearBottom(952, 400, 1352)).toBe(true);
  });

  it('returns false when scrolled up', () => {
    expect(isNearBottom(0, 400, 1352)).toBe(false);
  });

  it('returns true within threshold', () => {
    // scrollTop + clientHeight = 1310, scrollHeight = 1352, gap = 42 < 48
    expect(isNearBottom(910, 400, 1352)).toBe(true);
  });

  it('returns false just outside threshold', () => {
    // scrollTop + clientHeight = 1300, scrollHeight = 1352, gap = 52 > 48
    expect(isNearBottom(900, 400, 1352)).toBe(false);
  });
});
