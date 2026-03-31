import { describe, it, expect } from 'vitest';

// Constants for Aion V
const BATTERY_CAPACITY_KWH = 75.3;

/**
 * Calculate charging efficiency percentage
 * Formula: (battery_delta / 100) * battery_capacity_kwh / kwh_delivered * 100
 */
function calculateEfficiency(
  batteryStart: number,
  batteryEnd: number,
  kwhDelivered: number,
  batteryCapacityKwh: number = BATTERY_CAPACITY_KWH
): number {
  const batteryDelta = batteryEnd - batteryStart;
  
  // Battery delta 0% → 0% efficiency
  if (batteryDelta === 0) {
    return 0;
  }
  
  // Edge case with kwh_delivered = 0
  if (kwhDelivered === 0) {
    return 0;
  }
  
  const kwhStored = (batteryDelta / 100) * batteryCapacityKwh;
  return (kwhStored / kwhDelivered) * 100;
}

/**
 * Calculate effective cost per kWh stored
 * Formula: price_per_kwh / (efficiency / 100)
 */
function calculateEffectiveCost(
  pricePerKwh: number,
  efficiency: number
): number {
  if (efficiency === 0) {
    return Infinity;
  }
  return pricePerKwh / (efficiency / 100);
}

describe('Efficiency Calculation', () => {
  describe('calculateEfficiency', () => {
    it('should calculate efficiency for typical charging session', () => {
      // 38% to 80% = 42% delta, 31.626 kWh stored (42% of 75.3)
      // Delivered 35 kWh, so efficiency = 31.626 / 35 * 100 = 90.36%
      const result = calculateEfficiency(38, 80, 35);
      expect(result).toBeCloseTo(90.36, 1);
    });

    it('should calculate efficiency for partial charge', () => {
      // 20% to 50% = 30% delta, 22.59 kWh stored
      // Delivered 25 kWh, so efficiency = 22.59 / 25 * 100 = 90.36%
      const result = calculateEfficiency(20, 50, 25);
      expect(result).toBeCloseTo(90.36, 1);
    });

    it('should return 0% efficiency when battery delta is 0', () => {
      const result = calculateEfficiency(50, 50, 10);
      expect(result).toBe(0);
    });

    it('should return 0% efficiency when kwh_delivered is 0', () => {
      const result = calculateEfficiency(20, 80, 0);
      expect(result).toBe(0);
    });

    it('should handle 100% efficiency (ideal case)', () => {
      // 10% to 30% = 20% delta, 15.06 kWh stored
      // If delivered = stored, efficiency = 100%
      const kwhDelivered = (20 / 100) * BATTERY_CAPACITY_KWH; // 15.06
      const result = calculateEfficiency(10, 30, kwhDelivered);
      expect(result).toBeCloseTo(100, 1);
    });

    it('should handle low efficiency scenarios', () => {
      // 10% to 20% = 10% delta, 7.53 kWh stored
      // Delivered 15 kWh (high losses), efficiency = 50.2%
      const result = calculateEfficiency(10, 20, 15);
      expect(result).toBeCloseTo(50.2, 1);
    });

    it('should calculate efficiency for full charge', () => {
      // 0% to 100% = 100% delta, 75.3 kWh stored
      // Delivered 85 kWh, efficiency = 88.59%
      const result = calculateEfficiency(0, 100, 85);
      expect(result).toBeCloseTo(88.59, 1);
    });

    it('should handle decimal battery percentages', () => {
      // 38.9% to 80% = 41.1% delta, 30.9483 kWh stored
      const result = calculateEfficiency(38.9, 80, 35);
      expect(result).toBeCloseTo((41.1 / 100) * BATTERY_CAPACITY_KWH / 35 * 100, 1);
    });

    it('should handle negative efficiency (invalid case: more delivered than possible)', () => {
      // This is an edge case that shouldn't happen in reality
      // 10% to 20% = 10% delta, 7.53 kWh stored
      // Delivered 5 kWh (less than stored - impossible physically)
      const result = calculateEfficiency(10, 20, 5);
      expect(result).toBeGreaterThan(100);
    });

    it('should work with different battery capacities', () => {
      // 50% to 80% = 30% delta, 30 kWh stored for 100kWh battery
      const result = calculateEfficiency(50, 80, 35, 100);
      expect(result).toBeCloseTo(85.71, 1);
    });
  });

  describe('calculateEffectiveCost', () => {
    it('should calculate effective cost at 90% efficiency', () => {
      // $0.44/kWh at 90% efficiency = $0.44 / 0.9 = $0.489/kWh
      const result = calculateEffectiveCost(0.44, 90);
      expect(result).toBeCloseTo(0.489, 2);
    });

    it('should calculate effective cost at 100% efficiency', () => {
      const result = calculateEffectiveCost(0.55, 100);
      expect(result).toBeCloseTo(0.55, 2);
    });

    it('should calculate effective cost at 50% efficiency', () => {
      // $0.44/kWh at 50% efficiency = $0.44 / 0.5 = $0.88/kWh
      const result = calculateEffectiveCost(0.44, 50);
      expect(result).toBeCloseTo(0.88, 2);
    });

    it('should return Infinity when efficiency is 0', () => {
      const result = calculateEffectiveCost(0.44, 0);
      expect(result).toBe(Infinity);
    });

    it('should handle very low efficiency', () => {
      // $0.44/kWh at 10% efficiency = $4.40/kWh effective
      const result = calculateEffectiveCost(0.44, 10);
      expect(result).toBeCloseTo(4.4, 1);
    });

    it('should handle free charging', () => {
      const result = calculateEffectiveCost(0, 85);
      expect(result).toBe(0);
    });

    it('should handle high prices with good efficiency', () => {
      // $0.80/kWh at 95% efficiency = $0.84/kWh effective
      const result = calculateEffectiveCost(0.80, 95);
      expect(result).toBeCloseTo(0.842, 2);
    });

    it('should handle combined scenarios', () => {
      // Typical session: 38% to 80%, 35 kWh delivered, $0.44/kWh
      const efficiency = calculateEfficiency(38, 80, 35);
      const effectiveCost = calculateEffectiveCost(0.44, efficiency);
      
      // Efficiency ~90.36%, so effective cost ~$0.487/kWh
      expect(efficiency).toBeCloseTo(90.36, 1);
      expect(effectiveCost).toBeCloseTo(0.487, 2);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle Electree Cypress scenario', () => {
      // Battery: 38.0% to 80.0%, delivered 38.04 kWh
      const efficiency = calculateEfficiency(38.0, 80.0, 38.04);
      expect(efficiency).toBeCloseTo(83.1, 1);
      
      const effectiveCost = calculateEffectiveCost(0.440, efficiency);
      expect(effectiveCost).toBeCloseTo(0.529, 2);
    });

    it('should handle slow charging (better efficiency)', () => {
      // Slow charging typically has better efficiency (less heat loss)
      // 20% to 80%, 45 kWh delivered
      const efficiency = calculateEfficiency(20, 80, 45);
      expect(efficiency).toBeCloseTo(100.4, 1);
    });

    it('should handle fast charging (lower efficiency)', () => {
      // Fast charging typically has lower efficiency due to heat
      // 10% to 70%, 55 kWh delivered for 45.18 kWh stored
      const efficiency = calculateEfficiency(10, 70, 55);
      expect(efficiency).toBeCloseTo(82.15, 1);
    });
  });
});
