// Утилиты для расчета RPS баллов согласно новой системе

/**
 * Конвертирует организационный взнос в RPS баллы
 * Согласно новой системе: 1000₽ = 100 баллов
 */
export const convertFeeToRPS = (feeInRubles: number): number => {
  return Math.round(feeInRubles / 10);
};

/**
 * Конвертирует RPS баллы в рубли для отображения организационного взноса
 */
export const convertRPSToFee = (rpsPoints: number): number => {
  return rpsPoints * 10;
};

/**
 * Рассчитывает общий фонд RPS баллов для турнира
 */
export const calculateTotalRPSPool = (
  participantCount: number,
  participationFee: number,
  totalReentries: number = 0,
  reentryFee: number = 0,
  totalAdditionalSets: number = 0,
  additionalFee: number = 0
): number => {
  const mainPool = convertFeeToRPS(participantCount * participationFee);
  const reentryPool = convertFeeToRPS(totalReentries * reentryFee);
  const additionalPool = convertFeeToRPS(totalAdditionalSets * additionalFee);
  
  return mainPool + reentryPool + additionalPool;
};

/**
 * Рассчитывает распределение RPS баллов по местам
 */
export const calculateRPSDistribution = (
  totalRPSPool: number,
  payoutStructure: Array<{ place: number; percentage: number }>
): Array<{ place: number; rpsPoints: number }> => {
  return payoutStructure.map(payout => ({
    place: payout.place,
    rpsPoints: Math.round(totalRPSPool * (payout.percentage / 100))
  }));
};

/**
 * Форматирует отображение RPS баллов
 */
export const formatRPSPoints = (points: number): string => {
  return `${points.toLocaleString()} RPS`;
};

/**
 * Форматирует отображение организационного взноса
 */
export const formatParticipationFee = (feeInRubles: number): string => {
  return `${feeInRubles.toLocaleString()} ₽`;
};

/**
 * Проверяет корректность RPS расчета
 */
export const validateRPSCalculation = (
  participationFee: number,
  expectedRPS: number
): boolean => {
  const calculatedRPS = convertFeeToRPS(participationFee);
  return calculatedRPS === expectedRPS;
};