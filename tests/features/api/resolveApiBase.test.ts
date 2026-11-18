import { expect, it } from 'vitest';
import { resolveApiBase } from '@/shared/api/resolveApiBase';

it('keeps published API calls on the site even when a local env file specifies localhost', () => {
  for (const host of ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://[::1]:8080'])
    expect(resolveApiBase(host, true)).toBe('');
  expect(resolveApiBase('/', true)).toBe('');
  expect(resolveApiBase(undefined, true)).toBe('');
  expect(resolveApiBase('https://api.example.test/', true)).toBe('https://api.example.test');
  expect(resolveApiBase('http://localhost:8080', false)).toBe('http://localhost:8080');
});
