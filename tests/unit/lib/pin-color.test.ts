import { describe, it, expect, vi } from 'vitest';
import { calculatePinColor, PinColor } from '@/lib/db';

describe('calculatePinColor', () => {
  // Success rate > 0.75 OR successes === attempts → green
  describe('green pin conditions', () => {
    it('should return green when success rate > 0.75', () => {
      // 4/5 = 0.8 > 0.75 → green
      const result = calculatePinColor(5, 4, false);
      expect(result).toBe('green');
    });

    it('should return green when all attempts are successful', () => {
      const result = calculatePinColor(5, 5, false);
      expect(result).toBe('green');
    });

    it('should return green for single successful attempt', () => {
      const result = calculatePinColor(1, 1, false);
      expect(result).toBe('green');
    });

    it('should return yellow when success rate is exactly 0.75 (not > 0.75)', () => {
      // 3/4 = 0.75 which is NOT > 0.75 → yellow
      const result = calculatePinColor(4, 3, false);
      expect(result).toBe('yellow');
    });

    it('should return green for high success rate (0.9)', () => {
      const result = calculatePinColor(10, 9, false);
      expect(result).toBe('green');
    });
  });

  // Success rate 0.25-0.75 OR technique_required → yellow
  describe('yellow pin conditions', () => {
    it('should return yellow when success rate is between 0.25 and 0.75', () => {
      const result = calculatePinColor(4, 2, false);
      expect(result).toBe('yellow');
    });

    it('should return yellow when success rate is exactly 0.5', () => {
      const result = calculatePinColor(4, 2, false);
      expect(result).toBe('yellow');
    });

    it('should return yellow when success rate is exactly 0.25', () => {
      const result = calculatePinColor(4, 1, false);
      expect(result).toBe('yellow');
    });

    it('should return yellow when technique is required (regardless of success rate)', () => {
      const result = calculatePinColor(5, 5, true);
      expect(result).toBe('yellow');
    });

    it('should return yellow when technique is required even with high success rate', () => {
      const result = calculatePinColor(10, 10, true);
      expect(result).toBe('yellow');
    });

    it('should return yellow when technique is required even with low success rate', () => {
      const result = calculatePinColor(10, 1, true);
      expect(result).toBe('yellow');
    });

    it('should return yellow for success rate slightly above 0.25', () => {
      const result = calculatePinColor(4, 1, false);
      expect(result).toBe('yellow');
    });

    it('should return yellow for success rate slightly below 0.75', () => {
      const result = calculatePinColor(4, 2, false);
      expect(result).toBe('yellow');
    });
  });

  // Success rate < 0.25 → red
  describe('red pin conditions', () => {
    it('should return red when success rate < 0.25', () => {
      const result = calculatePinColor(4, 0, false);
      expect(result).toBe('red');
    });

    it('should return red when success rate is 0', () => {
      const result = calculatePinColor(5, 0, false);
      expect(result).toBe('red');
    });

    it('should return red for very low success rate (0.1)', () => {
      const result = calculatePinColor(10, 1, false);
      expect(result).toBe('red');
    });

    it('should return red for success rate just below 0.25', () => {
      const result = calculatePinColor(4, 0, false);
      expect(result).toBe('red');
    });

    it('should return red for 1 success out of 5 attempts (0.2)', () => {
      const result = calculatePinColor(5, 1, false);
      expect(result).toBe('red');
    });
  });

  // No attempts data → yellow
  describe('no attempts data', () => {
    it('should return yellow when attempts is 0', () => {
      const result = calculatePinColor(0, 0, false);
      expect(result).toBe('yellow');
    });

    it('should return yellow when attempts is 0 regardless of technique_required', () => {
      const result = calculatePinColor(0, 0, true);
      expect(result).toBe('yellow');
    });
  });

  // technique_required takes precedence
  describe('technique_required precedence', () => {
    it('should prioritize technique_required over green status', () => {
      // Would be green (100% success) but technique_required makes it yellow
      const result = calculatePinColor(10, 10, true);
      expect(result).toBe('yellow');
    });

    it('should prioritize technique_required over red status', () => {
      // Would be red (0% success) but technique_required makes it yellow
      const result = calculatePinColor(5, 0, true);
      expect(result).toBe('yellow');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle large numbers correctly', () => {
      // 800/1000 = 0.8 > 0.75 → green (not 750/1000 = 0.75)
      const result = calculatePinColor(1000, 800, false);
      expect(result).toBe('green');
    });

    it('should handle case where successes > attempts', () => {
      // This shouldn't happen in practice but code should handle it
      const result = calculatePinColor(3, 5, false);
      expect(result).toBe('green'); // 5/3 > 1.0
    });

    it('should handle minimum attempt counts', () => {
      const result = calculatePinColor(1, 0, false);
      expect(result).toBe('red');
    });
  });
});
