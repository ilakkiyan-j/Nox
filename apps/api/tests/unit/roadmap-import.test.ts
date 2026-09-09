describe('Roadmap JSON Plan Import Validation Unit Tests', () => {
  function validateRoadmapPlanPayload(payload: any): { isValid: boolean; error?: string } {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, error: 'Payload must be a non-null JSON object' };
    }

    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
      return { isValid: false, error: 'Invalid plan payload: "title" is required and must be a non-empty string' };
    }

    if (!payload.milestones || !Array.isArray(payload.milestones) || payload.milestones.length === 0) {
      return { isValid: false, error: 'Invalid plan payload: "milestones" must be a non-empty array of milestone objects' };
    }

    for (let idx = 0; idx < payload.milestones.length; idx++) {
      const m = payload.milestones[idx];
      if (!m || typeof m !== 'object' || !m.title || typeof m.title !== 'string' || m.title.trim().length === 0) {
        return { isValid: false, error: `Milestone at index ${idx} missing required "title" string property` };
      }
    }

    return { isValid: true };
  }

  test('should validate correct roadmap plan JSON payload', () => {
    const validPayload = {
      title: 'Full-Stack FDE Roadmap',
      description: 'Systematic approach to FDE engineering',
      milestones: [
        {
          title: 'Phase 1: Systems Engineering',
          tasks: [{ title: 'Master Linux Networking' }, { title: 'Docker & Kubernetes Fundamentals' }],
        },
      ],
    };

    const res = validateRoadmapPlanPayload(validPayload);
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  test('should reject payload missing title', () => {
    const invalidPayload = {
      milestones: [{ title: 'Phase 1' }],
    };

    const res = validateRoadmapPlanPayload(invalidPayload);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('"title" is required');
  });

  test('should reject payload with empty milestones array', () => {
    const invalidPayload = {
      title: 'Empty Roadmap',
      milestones: [],
    };

    const res = validateRoadmapPlanPayload(invalidPayload);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('"milestones" must be a non-empty array');
  });

  test('should reject payload with invalid milestone title at specific index', () => {
    const invalidPayload = {
      title: 'Roadmap with Broken Milestone',
      milestones: [{ title: 'Valid Phase 1' }, { description: 'Missing title' }],
    };

    const res = validateRoadmapPlanPayload(invalidPayload);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Milestone at index 1 missing required "title"');
  });
});
