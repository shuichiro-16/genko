import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  buildNewGuitar,
  createSeedSnapshot,
  DEFAULT_NOTIFICATION_DAYS,
  isAccent,
  isIsoDate,
  normalizeNotificationDays,
  STRING_BLUEPRINTS,
  toIsoDate,
  type Accent,
  type AppSnapshot,
  type Guitar,
  type GuitarString,
  type ScheduleDraft,
} from "@/lib/string-keeper";

type SQLiteDatabase = Pick<DatabaseSync, "exec" | "prepare">;

type CountRow = { count: bigint | number };
type GuitarRow = { accent: string; id: bigint | number; name: string };
type GuitarStringRow = {
  guitar_id: bigint | number;
  note: string;
  replace_at: string;
  slot: string;
};
type SettingsRow = { notification_days: string };

const STRING_ORDER = new Map(
  STRING_BLUEPRINTS.map((blueprint, index) => [blueprint.slot, index]),
);

export const DATABASE_FILE_RELATIVE = path.join("data", "string-keeper.sqlite");
const DATABASE_FILE = path.join(process.cwd(), DATABASE_FILE_RELATIVE);

declare global {
  var stringKeeperDatabase: SQLiteDatabase | undefined;
}

const database = globalThis.stringKeeperDatabase ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalThis.stringKeeperDatabase = database;
}

function createDatabase() {
  mkdirSync(path.dirname(DATABASE_FILE), { recursive: true });

  const db = new DatabaseSync(DATABASE_FILE) as SQLiteDatabase;
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS guitars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      accent TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guitar_strings (
      guitar_id INTEGER NOT NULL,
      slot TEXT NOT NULL,
      note TEXT NOT NULL,
      replace_at TEXT NOT NULL,
      PRIMARY KEY (guitar_id, slot),
      FOREIGN KEY (guitar_id) REFERENCES guitars(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      notification_days TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureSeedData(db);
  return db;
}

function transaction(db: SQLiteDatabase, callback: () => void) {
  db.exec("BEGIN");

  try {
    callback();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function ensureSeedData(db: SQLiteDatabase) {
  const guitarCount = Number((db.prepare("SELECT COUNT(*) AS count FROM guitars").get() as CountRow).count);
  const settingsCount = Number(
    (db.prepare("SELECT COUNT(*) AS count FROM user_settings").get() as CountRow).count,
  );

  if (guitarCount > 0 && settingsCount > 0) {
    return;
  }

  const seedSnapshot = createSeedSnapshot(toIsoDate(new Date()));

  transaction(db, () => {
    if (settingsCount === 0) {
      upsertNotificationDays(db, seedSnapshot.notificationDays);
    }

    if (guitarCount === 0) {
      insertSnapshotGuitars(db, seedSnapshot);
    }
  });
}

function insertSnapshotGuitars(db: SQLiteDatabase, snapshot: AppSnapshot) {
  const insertGuitar = db.prepare("INSERT INTO guitars (name, accent) VALUES (?, ?)");
  const insertString = db.prepare(
    "INSERT INTO guitar_strings (guitar_id, slot, note, replace_at) VALUES (?, ?, ?, ?)",
  );

  for (const guitar of snapshot.guitars) {
    const created = insertGuitar.run(guitar.name, guitar.accent);
    const guitarId = Number(created.lastInsertRowid);

    for (const guitarString of guitar.strings) {
      insertString.run(guitarId, guitarString.slot, guitarString.note, guitarString.replaceAt);
    }
  }
}

function parseNotificationDays(row: SettingsRow | undefined) {
  if (!row) {
    return [...DEFAULT_NOTIFICATION_DAYS];
  }

  try {
    const parsed = JSON.parse(row.notification_days) as unknown;

    if (!Array.isArray(parsed)) {
      return [...DEFAULT_NOTIFICATION_DAYS];
    }

    return normalizeNotificationDays(parsed.map((value) => Number(value)));
  } catch {
    return [...DEFAULT_NOTIFICATION_DAYS];
  }
}

function getAccent(value: string, fallbackIndex: number): Accent {
  if (isAccent(value)) {
    return value;
  }

  const fallbackAccents: Accent[] = ["amber", "tide", "noir"];
  return fallbackAccents[fallbackIndex % fallbackAccents.length];
}

function upsertNotificationDays(db: SQLiteDatabase, days: number[]) {
  db
    .prepare(
      `
        INSERT INTO user_settings (id, notification_days, updated_at)
        VALUES (1, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          notification_days = excluded.notification_days,
          updated_at = CURRENT_TIMESTAMP
      `,
    )
    .run(JSON.stringify(normalizeNotificationDays(days)));
}

export function loadSnapshot(): AppSnapshot {
  const guitars = (database
    .prepare("SELECT id, name, accent FROM guitars ORDER BY id ASC")
    .all() as GuitarRow[])
    .map((row, index) => ({
      id: Number(row.id),
      name: row.name,
      accent: getAccent(row.accent, index),
      strings: [],
    })) as Guitar[];

  const guitarMap = new Map(guitars.map((guitar) => [guitar.id, guitar]));

  const guitarStrings = database.prepare(
    "SELECT guitar_id, slot, note, replace_at FROM guitar_strings ORDER BY guitar_id ASC",
  ).all() as GuitarStringRow[];

  for (const row of guitarStrings) {
    const guitar = guitarMap.get(Number(row.guitar_id));

    if (!guitar) {
      continue;
    }

    guitar.strings.push({
      slot: row.slot as GuitarString["slot"],
      note: row.note as GuitarString["note"],
      replaceAt: row.replace_at,
    });
  }

  for (const guitar of guitars) {
    guitar.strings.sort((left, right) => {
      return (STRING_ORDER.get(left.slot) ?? 0) - (STRING_ORDER.get(right.slot) ?? 0);
    });
  }

  const settingsRow = database.prepare(
    "SELECT notification_days FROM user_settings WHERE id = 1",
  ).get() as SettingsRow | undefined;

  return {
    guitars,
    notificationDays: parseNotificationDays(settingsRow),
  };
}

export function createGuitar(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("ギター名を入力してください。");
  }

  const guitarCount = Number((database.prepare("SELECT COUNT(*) AS count FROM guitars").get() as CountRow).count);
  const newGuitar = buildNewGuitar(trimmedName, toIsoDate(new Date()), guitarCount);

  transaction(database, () => {
    const created = database
      .prepare("INSERT INTO guitars (name, accent) VALUES (?, ?)")
      .run(newGuitar.name, newGuitar.accent);
    const guitarId = Number(created.lastInsertRowid);
    const insertString = database.prepare(
      "INSERT INTO guitar_strings (guitar_id, slot, note, replace_at) VALUES (?, ?, ?, ?)",
    );

    for (const guitarString of newGuitar.strings) {
      insertString.run(guitarId, guitarString.slot, guitarString.note, guitarString.replaceAt);
    }
  });

  return loadSnapshot();
}

export function updateGuitarSchedule(guitarId: number, schedule: ScheduleDraft) {
  const guitar = database.prepare("SELECT id FROM guitars WHERE id = ?").get(guitarId);

  if (!guitar) {
    throw new Error("対象ギターが見つかりません。");
  }

  transaction(database, () => {
    const updateString = database.prepare(
      "UPDATE guitar_strings SET replace_at = ? WHERE guitar_id = ? AND slot = ?",
    );

    for (const blueprint of STRING_BLUEPRINTS) {
      const replaceAt = schedule[blueprint.slot];

      if (!replaceAt || !isIsoDate(replaceAt)) {
        continue;
      }

      updateString.run(replaceAt, guitarId, blueprint.slot);
    }
  });

  return loadSnapshot();
}

export function updateNotificationSettings(days: number[]) {
  transaction(database, () => {
    upsertNotificationDays(database, days);
  });

  return loadSnapshot();
}
