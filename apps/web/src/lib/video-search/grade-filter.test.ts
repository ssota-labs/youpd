import { describe, expect, it } from 'vitest';
import {
  gradesFromMinimum,
  isPartialGradeSelection,
  parseGradeSelection,
  serializeGradeSelection,
} from './grade-filter';

describe('grade-filter', () => {
  it('serializes partial grade selection', () => {
    expect(serializeGradeSelection(['Good', 'Great'])).toBe('Good,Great');
    expect(serializeGradeSelection(['Worst', 'Bad', 'Normal', 'Good', 'Great'])).toBe('');
  });

  it('maps minimum grade to inclusive grade list', () => {
    expect(gradesFromMinimum('Good')).toEqual(['Good', 'Great']);
  });

  it('detects partial selection', () => {
    expect(isPartialGradeSelection(parseGradeSelection('Good,Great'))).toBe(true);
    expect(isPartialGradeSelection(parseGradeSelection(''))).toBe(false);
  });
});
