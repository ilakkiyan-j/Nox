import { validateRoadmapPlan } from '../../src/lib/validate';

describe('Roadmap JSON Plan Import Validation', () => {
  test('accepts a valid roadmap plan', () => {
    const valid = {
      title: 'Full-Stack FDE Roadmap',
      description: 'Systematic approach',
      milestones: [
        {
          title: 'Phase 1: Systems Engineering',
          targetDate: '2026-10-01',
          tasks: [
            { title: 'Master Linux Networking', priority: 'HIGH', estimatedMinutes: 60 },
            { title: 'Docker & Kubernetes Fundamentals', dueDate: '2026-10-15' },
          ],
        },
      ],
    };
    expect(validateRoadmapPlan(valid)).toEqual({ isValid: true });
  });

  test('accepts a plan without tasks arrays', () => {
    const valid = {
      title: 'Minimal Plan',
      milestones: [{ title: 'Phase 1' }],
    };
    expect(validateRoadmapPlan(valid).isValid).toBe(true);
  });

  test('rejects missing title', () => {
    const res = validateRoadmapPlan({ milestones: [{ title: 'Phase 1' }] });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('title');
  });

  test('rejects empty milestones array', () => {
    const res = validateRoadmapPlan({ title: 'Empty', milestones: [] });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('milestones');
  });

  test('rejects missing milestone title at a specific index with a useful path', () => {
    const res = validateRoadmapPlan({
      title: 'Broken',
      milestones: [{ title: 'Phase 1' }, { description: 'missing title' }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('milestones[1].title');
  });

  test('rejects wrong field types inside tasks', () => {
    const res = validateRoadmapPlan({
      title: 'Wrong types',
      milestones: [{ title: 'Phase 1', tasks: [{ title: 'Task', priority: 'IMPORTANT' }] }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('priority');
  });

  test('rejects unexpected top-level fields', () => {
    const res = validateRoadmapPlan({
      title: 'X',
      milestones: [{ title: 'Phase 1' }],
      evilField: 'nope',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('unexpected field');
  });

  test('rejects duplicate milestone titles', () => {
    const res = validateRoadmapPlan({
      title: 'Duplicates',
      milestones: [{ title: 'Same' }, { title: 'Same' }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('duplicate milestone title');
  });

  test('rejects invalid dates', () => {
    const res = validateRoadmapPlan({
      title: 'Dates',
      milestones: [{ title: 'Phase 1', targetDate: 'not-a-date', tasks: [{ title: 'A', dueDate: 'garbage' }] }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('valid date string');
  });

  test('rejects oversized payloads', () => {
    const milestones = Array.from({ length: 51 }, (_, i) => ({ title: `M${i}` }));
    const res = validateRoadmapPlan({ title: 'Too big', milestones });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('maximum of 50 milestones');
  });

  test('rejects excessively long strings', () => {
    const res = validateRoadmapPlan({ title: 'x'.repeat(5000), milestones: [{ title: 'Phase 1' }] });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('title');
  });

  test('rejects non-object payloads (array / null / string)', () => {
    expect(validateRoadmapPlan([]).isValid).toBe(false);
    expect(validateRoadmapPlan(null).isValid).toBe(false);
    expect(validateRoadmapPlan('hello').isValid).toBe(false);
  });

  test('rejects milestone with unexpected fields', () => {
    const res = validateRoadmapPlan({
      title: 'X',
      milestones: [{ title: 'Phase 1', scheduled: true }],
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('scheduled');
  });
});