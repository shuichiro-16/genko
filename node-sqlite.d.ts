declare module "node:sqlite" {
  export type SQLiteValue = bigint | number | string | Uint8Array | null;

  export type RunResult = {
    changes: number;
    lastInsertRowid: bigint | number;
  };

  export class StatementSync {
    all(...params: SQLiteValue[]): unknown[];
    get(...params: SQLiteValue[]): unknown;
    run(...params: SQLiteValue[]): RunResult;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
