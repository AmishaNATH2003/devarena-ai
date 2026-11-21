// Deliberately fake authentication and database for E2E smoke tests.
// This file only replaces @supabase/supabase-js when DEVARENA_E2E=1.
const USER_KEY = "devarena-e2e-user";
const DATA_KEY = "devarena-e2e-data";
const listeners = new Set();

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function notify(event) {
  const user = getUser();
  for (const callback of listeners) {
    callback(event, user ? { user, access_token: "fake-e2e-token" } : null);
  }
}

function getTables() {
  try {
    return JSON.parse(localStorage.getItem(DATA_KEY) || "{}");
  } catch {
    return {};
  }
}

function queryFor(table) {
  const filters = {};
  let action = "select";
  let input = null;

  async function run() {
    const tables = getTables();
    const rows = tables[table] || [];
    const match = (row) => Object.entries(filters).every(
      ([name, value]) => row[name] === value
    );

    if (action === "upsert" || action === "insert") {
      const items = Array.isArray(input) ? input : [input];
      for (const candidate of items) {
        let index = -1;
        if (table === "assessment_progress") {
          index = rows.findIndex((row) =>
            row.user_id === candidate.user_id &&
            row.assessment_id === candidate.assessment_id
          );
        } else if (candidate.id) {
          index = rows.findIndex((row) => row.id === candidate.id);
        }
        if (index >= 0) rows[index] = { ...rows[index], ...candidate };
        else rows.push({ ...candidate });
      }
      tables[table] = rows;
      localStorage.setItem(DATA_KEY, JSON.stringify(tables));
      return { data: Array.isArray(input) ? items : items[0], error: null };
    }
    if (action === "update") {
      const changed = rows.filter(match);
      changed.forEach((row) => Object.assign(row, input));
      localStorage.setItem(DATA_KEY, JSON.stringify(tables));
      return { data: changed, error: null };
    }
    if (action === "delete") {
      tables[table] = rows.filter((row) => !match(row));
      localStorage.setItem(DATA_KEY, JSON.stringify(tables));
      return { data: null, error: null };
    }
    return { data: rows.filter(match), error: null };
  }

  const query = {
    select() { return query; },
    eq(name, value) { filters[name] = value; return query; },
    order() { return query; },
    limit() { return query; },
    upsert(value) { action = "upsert"; input = value; return query; },
    insert(value) { action = "insert"; input = value; return query; },
    update(value) { action = "update"; input = value; return query; },
    delete() { action = "delete"; return query; },
    async single() {
      const result = await run();
      return { ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data };
    },
    async maybeSingle() {
      const result = await run();
      return { ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data };
    },
    then(resolve, reject) { return run().then(resolve, reject); },
  };
  return query;
}

export function createClient() {
  return {
    auth: {
      onAuthStateChange(callback) {
        listeners.add(callback);
        queueMicrotask(() => {
          if (listeners.has(callback)) {
            const user = getUser();
            callback("INITIAL_SESSION", user ? { user, access_token: "fake-e2e-token" } : null);
          }
        });
        return { data: { subscription: { unsubscribe() { listeners.delete(callback); } } } };
      },
      async getUser() { return { data: { user: getUser() }, error: null }; },
      async getSession() {
        const user = getUser();
        return { data: { session: user ? { user, access_token: "fake-e2e-token" } : null }, error: null };
      },
      async signInWithPassword({ email, password }) {
        if (!email || !password) return { data: {}, error: { message: "Email and password required" } };
        const user = {
          id: "e2e-" + email.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          email,
          user_metadata: { full_name: "Test Developer" },
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        notify("SIGNED_IN");
        return { data: { user, session: { user } }, error: null };
      },
      async signUp() { return { data: { user: null, session: null }, error: null }; },
      async resetPasswordForEmail() { return { data: {}, error: null }; },
      async updateUser() { return { data: {}, error: null }; },
      async signOut() {
        localStorage.removeItem(USER_KEY);
        notify("SIGNED_OUT");
        return { error: null };
      },
    },
    from(table) { return queryFor(table); },
  };
}
