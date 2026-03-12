/**
 * Единая функция расчета качества проекта
 * Используется в ProjectCard и getProjectKPIs для синхронизации результатов
 */

export interface QualityCalculationInput {
  actualProgress: number; // Прогресс работ (0-100)
  timeProgress: number; // Процент прошедшего времени (0-100)
}

export interface QualityCalculationResult {
  efficiency: number;
  normalizedEfficiency: number;
  qualityScore: number;
}

export function calculateQuality(input: QualityCalculationInput): QualityCalculationResult {
  const { actualProgress, timeProgress } = input;

  // Расчет эффективности (насколько прогресс соответствует/опережает время)
  const efficiency = timeProgress > 0 
    ? Math.min((actualProgress / timeProgress) * 100, 200) // Ограничиваем до 200%
    : actualProgress > 0 ? 100 : 0;
  
  // Нормализуем эффективность в 0-100 баллов (200% = 100 баллов)
  const normalizedEfficiency = Math.min(efficiency / 2, 100);
  
  // Итоговая формула качества: эффективность и прогресс работ (50/50)
  const qualityScore = isNaN(actualProgress) || isNaN(normalizedEfficiency)
    ? 0
    : Math.round((normalizedEfficiency * 0.5) + (actualProgress * 0.5));

  return {
    efficiency,
    normalizedEfficiency,
    qualityScore
  };
}
