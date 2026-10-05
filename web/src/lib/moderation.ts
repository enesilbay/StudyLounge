import type { ReportReason } from './types';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam ya da reklam',
  harassment: 'Taciz ya da hakaret',
  inappropriate: 'Uygunsuz içerik',
  cheating: 'Hile (odak süresi, düello)',
  other: 'Başka bir sebep',
};
