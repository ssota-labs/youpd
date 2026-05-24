export const HOT_VIDEO_GRADE_OPTIONS = [
  'Worst',
  'Bad',
  'Normal',
  'Good',
  'Great',
] as const;

export type HotVideoGradeOption = (typeof HOT_VIDEO_GRADE_OPTIONS)[number];

export function parseGradeSelection(value: string | undefined): HotVideoGradeOption[] {
  if (!value) return [...HOT_VIDEO_GRADE_OPTIONS];

  const selected = value
    .split(',')
    .map((grade) => grade.trim())
    .filter((grade): grade is HotVideoGradeOption =>
      HOT_VIDEO_GRADE_OPTIONS.includes(grade as HotVideoGradeOption),
    );

  return selected.length > 0 ? selected : [...HOT_VIDEO_GRADE_OPTIONS];
}

export function serializeGradeSelection(selected: HotVideoGradeOption[]): string {
  if (
    selected.length === 0 ||
    selected.length === HOT_VIDEO_GRADE_OPTIONS.length
  ) {
    return '';
  }

  return HOT_VIDEO_GRADE_OPTIONS.filter((grade) => selected.includes(grade)).join(
    ',',
  );
}

export function gradesFromMinimum(
  minimum: string | undefined,
): HotVideoGradeOption[] {
  if (!minimum || minimum === 'none') return [...HOT_VIDEO_GRADE_OPTIONS];

  const index = HOT_VIDEO_GRADE_OPTIONS.indexOf(minimum as HotVideoGradeOption);
  if (index === -1) return [...HOT_VIDEO_GRADE_OPTIONS];

  return HOT_VIDEO_GRADE_OPTIONS.slice(index);
}

export function resolveInitialGradeSelection(input: {
  grades?: string;
  minimum?: string;
}): HotVideoGradeOption[] {
  if (input.grades) return parseGradeSelection(input.grades);
  return gradesFromMinimum(input.minimum);
}

export function isPartialGradeSelection(selected: HotVideoGradeOption[]): boolean {
  return (
    selected.length > 0 &&
    selected.length < HOT_VIDEO_GRADE_OPTIONS.length
  );
}
