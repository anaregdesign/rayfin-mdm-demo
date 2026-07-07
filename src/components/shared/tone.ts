import type { StatusTone } from '@/domain/models/master-status';
import type { QualityBand } from '@/domain/models/quality';

/**
 * Single source of truth mapping domain tones/bands to Tailwind classes. Views
 * never inline color logic — they call these helpers so status and quality are
 * styled consistently everywhere.
 */

const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  positive: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-800 ring-amber-200',
  danger: 'bg-rose-100 text-rose-800 ring-rose-200',
  muted: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export function statusToneClasses(tone: StatusTone): string {
  return STATUS_TONE_CLASSES[tone];
}

const QUALITY_BAND_BADGE: Record<QualityBand, string> = {
  high: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  medium: 'bg-amber-100 text-amber-800 ring-amber-200',
  low: 'bg-rose-100 text-rose-800 ring-rose-200',
};

const QUALITY_BAND_BAR: Record<QualityBand, string> = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-rose-500',
};

const QUALITY_BAND_TEXT: Record<QualityBand, string> = {
  high: 'text-emerald-700',
  medium: 'text-amber-700',
  low: 'text-rose-700',
};

export function qualityBadgeClasses(band: QualityBand): string {
  return QUALITY_BAND_BADGE[band];
}

export function qualityBarClasses(band: QualityBand): string {
  return QUALITY_BAND_BAR[band];
}

export function qualityTextClasses(band: QualityBand): string {
  return QUALITY_BAND_TEXT[band];
}
