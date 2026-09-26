import type { ReportTargetType } from '@/api/reviews'

/**
 * The report form for one target — Anexo I item 10, "denunciar conteúdos ou
 * estabelecimentos". `subject` names what is reported — the place, "Avaliação
 * de Ana" — so the form can say it (audit A45); the form works without it.
 *
 * Everyone goes to the same form. A visitor reports anonymously and a signed-in
 * person reports as themselves (ADR-0027 scenario 13); the form says which.
 */
export const reportHref = (type: ReportTargetType, id: number, subject?: string | null) =>
  `/denunciar/${type}/${id}${subject ? `?nome=${encodeURIComponent(subject)}` : ''}` as const
