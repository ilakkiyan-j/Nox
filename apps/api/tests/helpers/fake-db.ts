import crypto from 'crypto';

/**
 * Minimal in-memory stand-in for the Prisma client, sufficient to exercise
 * route behavior (auth flow, authorization, validation) without a live
 * database. Only the query shapes used by the API's routes are implemented.
 */

export type AnyRecord = Record<string, any>;

const MODELS = [
  'user',
  'folder',
  'goal',
  'roadmap',
  'milestone',
  'task',
  'learning',
  'learningModule',
  'event',
  'habit',
  'habitLog',
  'note',
  'reminder',
  'notification',
] as const;

function matches(record: AnyRecord, where: AnyRecord | undefined): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
      if ('in' in cond && Array.isArray(cond.in)) {
        if (!cond.in.includes(record[key])) return false;
        continue;
      }
      if ('not' in cond && record[key] === cond.not) return false;
      if ('gte' in cond && !(record[key] >= cond.gte)) return false;
      if ('contains' in cond) {
        if (typeof record[key] !== 'string' || !record[key].toLowerCase().includes(String(cond.contains).toLowerCase())) return false;
        continue;
      }
      if ('OR' in cond) {
        if (!(cond as any).OR.some((sub: AnyRecord) => matches(record, sub))) return false;
        continue;
      }
      if ('startswith' in cond) {
        if (typeof record[key] !== 'string' || !record[key].startsWith(cond.startswith)) return false;
        continue;
      }
      continue;
    }
    if (record[key] !== cond) return false;
  }
  return true;
}

function matchesAny(record: AnyRecord, where: AnyRecord | undefined, store: Record<string, AnyRecord[]>): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond) && !('in' in cond) && !('not' in cond) && !('gte' in cond) && !('contains' in cond) && !('OR' in cond)) {
      const related = (store[key] ?? []).find((r) => r.id === record[key]);
      if (!related || !matchesAny(related, cond, store)) return false;
    } else if (!matches(record, { [key]: cond })) {
      return false;
    }
  }
  return true;
}

function applySelect(record: AnyRecord, select: AnyRecord | undefined, store: Record<string, AnyRecord[]>): AnyRecord {
  if (!select) return { ...record };
  const out: AnyRecord = {};
  for (const [key, value] of Object.entries(select)) {
    if (value === true) {
      out[key] = record[key];
    } else if (value && typeof value === 'object' && value.select) {
      const related = (store[key] ?? []).find((r: AnyRecord) => r.id === record[key]);
      out[key] = related ? applySelect(related, value.select, store) : null;
    } else {
      out[key] = record[key];
    }
  }
  return out;
}

function id(): string {
  return crypto.randomUUID();
}

class Collection {
  private owner: FakeDb;
  private name: string;

  constructor(owner: FakeDb, name: string) {
    this.owner = owner;
    this.name = name;
  }

  private col() {
    if (!this.owner.store[this.name]) this.owner.store[this.name] = [];
    return this.owner.store[this.name];
  }

  async findUnique({ where, select, include }: { where: AnyRecord; select?: AnyRecord; include?: AnyRecord }) {
    const rec = this.col().find((r) => {
      if (where.id !== undefined) return r.id === where.id;
      if (where.email !== undefined) return r.email === where.email;
      if (where.learningId !== undefined) return r.learningId === where.learningId;
      return matches(r, where);
    });
    if (!rec) return null;
    return include ? this.applyInclude({ ...rec }, include) : applySelect(rec, select, this.owner.store);
  }

  async findFirst({ where, select, orderBy }: { where?: AnyRecord; select?: AnyRecord; orderBy?: AnyRecord }) {
    const filtered = this.col().filter((r) => matchesAny(r, where, this.owner.store));
    this.sortList(filtered, orderBy);
    const rec = filtered[0] ?? null;
    return rec ? applySelect(rec, select, this.owner.store) : null;
  }

  async findMany({ where, select, orderBy, take, include }: { where?: AnyRecord; select?: AnyRecord; orderBy?: AnyRecord; take?: number; include?: AnyRecord }) {
    let filtered = this.col().filter((r) => matchesAny(r, where, this.owner.store));
    this.sortList(filtered, orderBy);
    if (take !== undefined) filtered = filtered.slice(0, take);
    if (include) {
      return filtered.map((r) => this.applyInclude(r, include));
    }
    if (select) {
      return filtered.map((r) => applySelect(r, select, this.owner.store));
    }
    return filtered.map((r) => ({ ...r }));
  }

  private sortList(list: AnyRecord[], orderBy?: AnyRecord) {
    if (!orderBy) return;
    const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
    list.sort((a, b) => {
      for (const entry of entries) {
        const [[key, dir]] = Object.entries(entry);
        const av = a[key];
        const bv = b[key];
        if (av === bv) continue;
        const cmp = av === null || av === undefined ? 1 : bv === null || bv === undefined ? -1 : av > bv ? 1 : -1;
        return dir === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }

  private applyInclude(record: AnyRecord, include: AnyRecord): AnyRecord {
    const out = { ...record };
    for (const [rel, subInclude] of Object.entries(include)) {
      if (rel === 'goal' || rel === 'roadmap' || rel === 'learning' || rel === 'folder' || rel === 'milestone' || rel === 'habit') {
        out[rel] = (this.owner.store[rel] ?? []).find((r) => r.id === record[`${rel}Id`]) ?? null;
      } else if (rel === 'milestones') {
        out.milestones = (this.owner.store.milestone ?? [])
          .filter((m) => m.roadmapId === record.id || m.goalId === record.id)
          .map((m) => {
            const sub = subInclude?.include?.tasks
              ? { ...m, tasks: (this.owner.store.task ?? []).filter((t) => t.milestoneId === m.id) }
              : m;
            return applySelect(sub, subInclude?.select, this.owner.store);
          });
      } else if (rel === 'modules') {
        out.modules = (this.owner.store.learningModule ?? []).filter((m) => m.learningId === record.id);
      } else if (rel === 'tasks') {
        const subSelect = subInclude?.select;
        out.tasks = (this.owner.store.task ?? [])
          .filter((t) => t.goalId === record.id || t.roadmapId === record.id || t.milestoneId === record.id)
          .map((t) => (subSelect ? applySelect(t, subSelect, this.owner.store) : t));
      } else if (rel === 'logs') {
        out.logs = (this.owner.store.habitLog ?? []).filter((l) => l.habitId === record.id);
      } else {
        out[rel] = (this.owner.store[rel] ?? []).filter((r) => r.userId === record.id);
      }
    }
    return out;
  }

  async create({ data, select }: { data: AnyRecord; select?: AnyRecord }) {
    const record: AnyRecord = { ...data, id: data.id ?? id(), createdAt: new Date(), updatedAt: new Date() };
    if (data.modules?.create) {
      record.modules = data.modules.create.map((m: AnyRecord, i: number) => ({
        ...m,
        id: id(),
        learningId: record.id,
        order: m.order ?? i + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      this.owner.store.learningModule = [...(this.owner.store.learningModule ?? []), ...record.modules];
      delete record.modules;
    }
    this.col().push(record);
    return applySelect({ ...record }, select, this.owner.store);
  }

  async update({ where, data, select }: { where: AnyRecord; data: AnyRecord; select?: AnyRecord }) {
    const record = this.col().find((r) => r.id === where.id);
    if (!record) throw Object.assign(new Error('Record to update not found.'), { code: 'P2025' });
    Object.assign(record, data, { updatedAt: new Date() });
    return applySelect({ ...record }, select, this.owner.store);
  }

  async updateMany({ where, data }: { where: AnyRecord; data: AnyRecord }) {
    let count = 0;
    for (const r of this.col()) {
      if (matchesAny(r, where, this.owner.store)) {
        Object.assign(r, data, { updatedAt: new Date() });
        count += 1;
      }
    }
    return { count };
  }

  async delete({ where }: { where: AnyRecord }) {
    const idx = this.col().findIndex((r) => r.id === where.id);
    if (idx === -1) throw Object.assign(new Error('Record to delete does not exist.'), { code: 'P2025' });
    const [removed] = this.col().splice(idx, 1);
    return { ...removed };
  }

  async deleteMany({ where }: { where: AnyRecord }) {
    const col = this.col();
    const kept = col.filter((r) => !matchesAny(r, where, this.owner.store));
    this.owner.store[this.name] = kept;
    return { count: col.length - kept.length };
  }

  async count({ where }: { where?: AnyRecord }) {
    return this.col().filter((r) => matchesAny(r, where, this.owner.store)).length;
  }

  async aggregate() {
    return { _count: {} };
  }
}

export class FakeDb {
  store: Record<string, AnyRecord[]> = {};
  [key: string]: any;

  constructor() {
    for (const model of MODELS) {
      this[model] = new Collection(this, model);
    }
    this.$queryRaw = async () => [{ '?column?': 1 }];
  }

  $transaction(input: any) {
    if (typeof input === 'function') {
      return input(this);
    }
    if (Array.isArray(input)) {
      return Promise.all(input);
    }
    return Promise.resolve(input);
  }

  reset() {
    this.store = {};
  }

  // Test helpers ----------------------------------------------------------
  async seedUser(overrides: Partial<AnyRecord> = {}) {
    const user = await this.user.create({
      data: {
        email: 'user@nox.test',
        name: 'Test User',
        password: '$2a$12$cY9w2DkXQG7jDZ2Z6Z2Z6O8CjCjCjCjCjCjCjCjCjCjCjCjCjCjCjCjCj', // dummy bcrypt-like hash
        role: 'USER',
        ...overrides,
      },
    });
    return user;
  }

  async seedAdmin(overrides: Partial<AnyRecord> = {}) {
    return this.seedUser({ email: 'admin@nox.test', role: 'ADMIN', ...overrides });
  }

  async seedGoal(userId: string, overrides: Partial<AnyRecord> = {}) {
    return this.goal.create({
      data: { userId, title: 'Test Goal', status: 'IN_PROGRESS', ...overrides },
    });
  }

  async seedRoadmap(userId: string, overrides: Partial<AnyRecord> = {}) {
    const goal = await this.seedGoal(userId);
    return this.roadmap.create({ data: { goalId: goal.id, title: 'Roadmap', ...overrides } });
  }
}

export function createFakeDb() {
  return new FakeDb();
}