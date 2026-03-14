import { AnalysisRepository } from '../repositories/analysis.repository.ts';
import { marketDataService } from '../services/market-data/market-data.service.ts';
import { logger } from '../lib/logger.ts';

function calculateAccuracy(
  priceAtAnalysis: number,
  targetPrice: number,
  currentPrice: number,
  verdict: string
): { score: number; note: string } {
  const targetMove = targetPrice - priceAtAnalysis;
  const actualMove = currentPrice - priceAtAnalysis;
  const targetPct = (targetMove / priceAtAnalysis) * 100;
  const actualPct = (actualMove / priceAtAnalysis) * 100;

  const directionCorrect =
    (verdict.includes('شراء') && actualMove > 0) ||
    (verdict.includes('بيع') && actualMove < 0) ||
    (verdict.includes('انتظار') && Math.abs(actualPct) < 5);

  let targetAchievement = 0;
  if (Math.abs(targetMove) > 0) {
    targetAchievement = Math.min(100, Math.max(0, (actualMove / targetMove) * 100));
  }

  const score = Math.round((directionCorrect ? 60 : 20) + targetAchievement * 0.4);

  let note = '';
  if (directionCorrect && targetAchievement >= 80) {
    note = `✅ التوقع تحقق — السهم ${actualPct > 0 ? 'طلع' : 'نزل'} ${Math.abs(actualPct).toFixed(1)}% (الهدف كان ${targetPct > 0 ? '+' : ''}${targetPct.toFixed(1)}%)`;
  } else if (directionCorrect) {
    note = `⚡ الاتجاه صح — السهم ${actualPct > 0 ? 'طلع' : 'نزل'} ${Math.abs(actualPct).toFixed(1)}% (الهدف ${targetPct > 0 ? '+' : ''}${targetPct.toFixed(1)}% لسه ما وصلش)`;
  } else {
    note = `❌ الاتجاه عكس المتوقع — السهم ${actualPct > 0 ? 'طلع' : 'نزل'} ${Math.abs(actualPct).toFixed(1)}% (كان المتوقع ${targetPct > 0 ? '+' : ''}${targetPct.toFixed(1)}%)`;
  }

  return { score: Math.max(0, Math.min(100, score)), note };
}

export async function runTrackRecordCheck() {
  logger.info('Track Record check started');

  const unchecked7d = await AnalysisRepository.findUnchecked7d(30);
  let checked7d = 0;

  for (const analysis of unchecked7d) {
    try {
      const quote = await marketDataService.getQuote(analysis.ticker);
      if (!quote || quote.price <= 0) continue;

      const { score, note } = calculateAccuracy(
        analysis.priceAtAnalysis!,
        analysis.targetPrice!,
        quote.price,
        analysis.verdict ?? ''
      );

      await AnalysisRepository.updateTrackRecord(analysis.id, {
        priceAfter7d: quote.price,
        accuracyScore: score,
        accuracyNote: note,
        checkedAt: new Date(),
      });
      checked7d++;
    } catch (err) {
      logger.warn('Track record 7d check failed', { id: analysis.id, err: (err as Error).message });
    }
  }

  const unchecked30d = await AnalysisRepository.findUnchecked30d(30);
  let checked30d = 0;

  for (const analysis of unchecked30d) {
    try {
      const quote = await marketDataService.getQuote(analysis.ticker);
      if (!quote || quote.price <= 0) continue;

      const { score, note } = calculateAccuracy(
        analysis.priceAtAnalysis!,
        analysis.targetPrice!,
        quote.price,
        analysis.verdict ?? ''
      );

      await AnalysisRepository.updateTrackRecord(analysis.id, {
        priceAfter30d: quote.price,
        accuracyScore: score,
        accuracyNote: note,
        checkedAt: new Date(),
      });
      checked30d++;
    } catch (err) {
      logger.warn('Track record 30d check failed', { id: analysis.id, err: (err as Error).message });
    }
  }

  logger.info('Track Record check done', { checked7d, checked30d });
}
