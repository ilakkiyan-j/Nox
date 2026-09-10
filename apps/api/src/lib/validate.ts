/**
 * Input validation helpers. All user-supplied data crosses these boundaries
 * before reaching the database. Never trust imported JSON or raw strings.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;
const MAX_TASK_TITLE_LENGTH = 200;
const MAX_MILESTONES = 50;
const MAX_TASKS_PER_MILESTONE = 50;
const MAX_NOTE_CONTENT_LENGTH = 20000;
const MAX_NOTE_TITLE_LENGTH = 250;
const MAX_STRING_FIELD_LENGTH = 5000;

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const GOAL_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'] as const;
export const MILESTONE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export const LEARNING_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export const LEARNING_TYPES = ['COURSE', 'BOOK', 'CERTIFICATION', 'TUTORIAL', 'PRACTICE'] as const;
export const EVENT_ALERT_TYPES = ['GENERAL', 'MILESTONE_ACHIEVED', 'GOAL_PROGRESS', 'EVENT_ALERT', 'TASK_DUE', 'HABIT_STREAK', 'REMINDER', 'ROADMAP_UPDATED'] as const;
export const NOTIFICATION_TYPES = EVENT_ALERT_TYPES;

export function isSafeString(value: unknown, min = 1, max = MAX_STRING_FIELD_LENGTH): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.length <= max;
}

function isValidDateString(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > 40) return false;
  const parsed = new Date(value);
  return !isNaN(parsed.getTime());
}

/**
 * Validate a URL string for storage in note/event fields.
 * Allows http/https/mailto; rejects javascript:, data:, vbscript:, file:,
 * and any other dangerous scheme. Returns null when safe, otherwise an
 * error message.
 */
export function validateSafeUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2000 || value.trim().length === 0) {
    return 'URL must be a non-empty string';
  }
  let candidate = value.trim();
  // Normalize scheme for evaluation (case-insensitive).
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(candidate);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    const allowed = new Set(['http', 'https', 'mailto', 'tel']);
    if (!allowed.has(scheme)) {
      return `URL scheme "${scheme}" is not allowed`;
    }
  } else {
    // No scheme provided — assume https so links open safely.
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return 'Invalid URL format';
  }

  // Block credentials embedded in URLs (userinfo), a common phishing vector.
  if (parsed.username || parsed.password) {
    return 'URLs must not contain embedded credentials';
  }

  return null;
}

/** Throws HttpError-compatible message when the URL is unsafe; returns sanitized URL. */
export function parseSafeUrl(value: unknown): { ok: boolean; value: string | null; error?: string } {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const err = validateSafeUrl(value);
  if (err) return { ok: false, value: null, error: err };
  let candidate = (value as string).trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  return { ok: true, value: candidate };
}

/**
 * Strict schema validation for Roadmap JSON Plan imports.
 * Validates on a dedicated line/path basis so errors are actionable.
 */
export function validateRoadmapPlan(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { isValid: false, error: 'payload must be a single JSON object' };
  }
  const plan = payload as Record<string, unknown>;

  if (plan.title === undefined) {
    return { isValid: false, error: 'path "title": required' };
  }
  if (!isSafeString(plan.title, 1, MAX_TITLE_LENGTH)) {
    return { isValid: false, error: `path "title": must be a non-empty string of at most ${MAX_TITLE_LENGTH} characters` };
  }

  if (plan.description !== undefined && !isSafeString(plan.description, 0, MAX_DESC_LENGTH)) {
    return { isValid: false, error: `path "description": must be a string of at most ${MAX_DESC_LENGTH} characters` };
  }

  if (plan.goalId !== undefined && plan.goalId !== null && typeof plan.goalId !== 'string') {
    return { isValid: false, error: 'path "goalId": must be a string' };
  }

  const allowedTop = new Set(['title', 'description', 'goalId', 'milestones']);
  for (const key of Object.keys(plan)) {
    if (!allowedTop.has(key)) {
      return { isValid: false, error: `path "${key}": unexpected field in roadmap plan` };
    }
  }

  if (plan.milestones === undefined) {
    return { isValid: false, error: 'path "milestones": required' };
  }
  if (!Array.isArray(plan.milestones) || plan.milestones.length === 0) {
    return { isValid: false, error: 'path "milestones": must be a non-empty array' };
  }
  if (plan.milestones.length > MAX_MILESTONES) {
    return { isValid: false, error: `path "milestones": exceeds maximum of ${MAX_MILESTONES} milestones` };
  }

  const seenMilestoneTitles = new Set<string>();

  for (let mIdx = 0; mIdx < plan.milestones.length; mIdx++) {
    const m = plan.milestones[mIdx];
    const path = `milestones[${mIdx}]`;

    if (!m || typeof m !== 'object' || Array.isArray(m)) {
      return { isValid: false, error: `${path}: must be an object` };
    }
    const milestone = m as Record<string, unknown>;

    if (milestone.title === undefined || !isSafeString(milestone.title, 1, MAX_TITLE_LENGTH)) {
      return { isValid: false, error: `${path}.title: required, non-empty string (max ${MAX_TITLE_LENGTH})` };
    }
    const normalizedTitle = (milestone.title as string).trim().toLowerCase();
    if (seenMilestoneTitles.has(normalizedTitle)) {
      return { isValid: false, error: `${path}.title: duplicate milestone title "${milestone.title}"` };
    }
    seenMilestoneTitles.add(normalizedTitle);

    if (milestone.description !== undefined && !isSafeString(milestone.description, 0, MAX_DESC_LENGTH)) {
      return { isValid: false, error: `${path}.description: must be a string of at most ${MAX_DESC_LENGTH} characters` };
    }

    if (milestone.targetDate !== undefined && !isValidDateString(milestone.targetDate)) {
      return { isValid: false, error: `${path}.targetDate: must be a valid date string` };
    }

    const allowedMilestone = new Set(['title', 'description', 'targetDate', 'tasks']);
    for (const key of Object.keys(milestone)) {
      if (!allowedMilestone.has(key)) {
        return { isValid: false, error: `${path}.${key}: unexpected field in milestone` };
      }
    }

    if (milestone.tasks !== undefined) {
      if (!Array.isArray(milestone.tasks)) {
        return { isValid: false, error: `${path}.tasks: expected an array` };
      }
      if (milestone.tasks.length > MAX_TASKS_PER_MILESTONE) {
        return { isValid: false, error: `${path}.tasks: exceeds maximum of ${MAX_TASKS_PER_MILESTONE} tasks` };
      }

      const seenTaskTitles = new Set<string>();
      for (let tIdx = 0; tIdx < milestone.tasks.length; tIdx++) {
        const t = milestone.tasks[tIdx];
        const taskPath = `${path}.tasks[${tIdx}]`;

        if (!t || typeof t !== 'object' || Array.isArray(t)) {
          return { isValid: false, error: `${taskPath}: must be an object` };
        }
        const task = t as Record<string, unknown>;

        if (task.title === undefined || !isSafeString(task.title, 1, MAX_TASK_TITLE_LENGTH)) {
          return { isValid: false, error: `${taskPath}.title: required, non-empty string (max ${MAX_TASK_TITLE_LENGTH})` };
        }
        const normTaskTitle = (task.title as string).trim().toLowerCase();
        if (seenTaskTitles.has(normTaskTitle)) {
          return { isValid: false, error: `${taskPath}.title: duplicate task title "${task.title}"` };
        }
        seenTaskTitles.add(normTaskTitle);

        if (task.description !== undefined && !isSafeString(task.description, 0, MAX_DESC_LENGTH)) {
          return { isValid: false, error: `${taskPath}.description: must be a string of at most ${MAX_DESC_LENGTH} characters` };
        }

        if (
          task.priority !== undefined &&
          (typeof task.priority !== 'string' || !TASK_PRIORITIES.includes(task.priority as any))
        ) {
          return { isValid: false, error: `${taskPath}.priority: must be one of ${TASK_PRIORITIES.join(', ')}` };
        }

        if (
          task.estimatedMinutes !== undefined &&
          (typeof task.estimatedMinutes !== 'number' || !Number.isFinite(task.estimatedMinutes) ||
            task.estimatedMinutes < 1 || task.estimatedMinutes > 10000)
        ) {
          return { isValid: false, error: `${taskPath}.estimatedMinutes: must be a number between 1 and 10000` };
        }

        if (task.dueDate !== undefined && !isValidDateString(task.dueDate)) {
          return { isValid: false, error: `${taskPath}.dueDate: must be a valid date string` };
        }

        const allowedTask = new Set(['title', 'description', 'priority', 'estimatedMinutes', 'dueDate']);
        for (const key of Object.keys(task)) {
          if (!allowedTask.has(key)) {
            return { isValid: false, error: `${taskPath}.${key}: unexpected field in task` };
          }
        }
      }
    }
  }

  return { isValid: true };
}

export function parseLimitedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  return value.length > max ? value.slice(0, max) : value;
}

export function limitString(value: unknown, max: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.length > max ? value.slice(0, max) : value;
}

export const LIMITS = {
  title: MAX_TITLE_LENGTH,
  description: MAX_DESC_LENGTH,
  noteContent: MAX_NOTE_CONTENT_LENGTH,
  noteTitle: MAX_NOTE_TITLE_LENGTH,
  general: MAX_STRING_FIELD_LENGTH,
};