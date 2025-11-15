// backend/test/util.test.ts
import { add } from '../src/util';
import { describe, it, expect } from 'vitest';

describe('add', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
