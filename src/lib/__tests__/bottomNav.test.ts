import { describe, it, expect } from 'vitest';
import { getActiveBottomNavKey } from '../bottomNav';

const media = ['/articles', '/services', '/about'];

describe('getActiveBottomNavKey', () => {
  it('home', () => expect(getActiveBottomNavKey('/', media)).toBe('home'));
  it('data on catalogue', () => expect(getActiveBottomNavKey('/donnees-foncieres/catalogue', media)).toBe('data'));
  it('data on test map', () => expect(getActiveBottomNavKey('/test/map', media)).toBe('data'));
  it('cadastre', () => expect(getActiveBottomNavKey('/cadastral-map', media)).toBe('cadastre'));
  it('account on test dashboard', () => expect(getActiveBottomNavKey('/test/mon-compte', media)).toBe('account'));
  it('media article detail', () => expect(getActiveBottomNavKey('/articles/abc', media)).toBe('media'));
  it('about-ccc is not /about', () => expect(getActiveBottomNavKey('/about-ccc', media)).toBeNull());
});
