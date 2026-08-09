import { readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/014_create_admin_user_management_rpc_functions.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("admin user management migration", () => {
  it("continues the repository's sequential migration naming convention", () => {
    const migrationNames = readdirSync(resolve(process.cwd(), "supabase/migrations"))
      .filter((name) => name.endsWith(".sql"));
    const versions = migrationNames
      .map((name) => Number(name.slice(0, 3)))
      .sort((left, right) => left - right);

    expect(basename(migrationPath)).toBe("014_create_admin_user_management_rpc_functions.sql");
    expect(migrationNames).toContain(basename(migrationPath));
    expect(migrationNames.every((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))).toBe(true);
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions.every((version, index) => version === index + 1)).toBe(true);
  });

  it("keeps last-admin protection, update, and audit insert in transactional RPCs", () => {
    expect(sql).toContain("admin_change_user_role");
    expect(sql).toContain("admin_change_user_status");
    expect(sql).toContain("for update");
    expect(sql).toContain("LAST_ACTIVE_ADMIN");
    expect(sql).toContain("insert into public.admin_logs");
    expect(sql).toContain("user.role_changed");
    expect(sql).toContain("user.deactivated");
    expect(sql.match(/where id = v_actor_id and role = 'admin' and is_active = true/g)).toHaveLength(4);
  });

  it("uses verified actor identity and narrow execute grants", () => {
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("from public;");
    expect(sql).toContain("from anon;");
    expect(sql).toContain("to authenticated;");
  });
});
