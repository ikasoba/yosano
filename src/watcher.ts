import { minimatch } from "minimatch";
import fs from "node:fs/promises";
import { cwd } from "node:process";

export interface WatchEventBase {
  raw: unknown;
}

export interface ModifyEvent extends WatchEventBase {
  type: "modify";
  path: string;
}

export interface CreateEvent extends WatchEventBase {
  type: "create";
  path: string;
}

export interface DeleteEvent extends WatchEventBase {
  type: "delete";
  path: string;
}

export interface UnknownEvent extends WatchEventBase {
  type: "unknown";
  path: string;
}

export type WatchEvent = ModifyEvent | CreateEvent | DeleteEvent | UnknownEvent;

export interface WatchOptions {
  root: string;
  recursive: boolean;
  signal?: AbortSignal;
}

export interface FileHistory {
  time: number;
  mtime: number;
  birthtime: number;
  isCreateEventEmitted: boolean;
  isDeleteEventEmitted: boolean;
}

let eventThreshold = 150;

export function watch(
  pattern: string,
  { root = cwd(), recursive = true, signal }: Partial<WatchOptions> = {}
): AsyncIterable<WatchEvent> {
  const histories = new Map<string, FileHistory>();
  const watcher = fs.watch(root, { recursive, signal });

  return {
    [Symbol.asyncIterator]: async function* () {
      for await (const event of watcher) {
        const now = Date.now();

        const path = event.filename?.toString();
        if (path == null || !minimatch(path, pattern)) continue;

        const stat = await fs.stat(path).catch((): null => null);
        if (stat == null) {
          histories.delete(path);
        }

        let e: WatchEvent | null = null;

        const prevHistory = histories.get(path);
        let history: FileHistory;

        history = {
          time: now,
          mtime: stat?.mtime.getTime() ?? prevHistory?.mtime ?? 0,
          birthtime: stat?.birthtime.getTime() ?? prevHistory?.birthtime ?? 0,
          isCreateEventEmitted: prevHistory?.isCreateEventEmitted ?? false,
          isDeleteEventEmitted: prevHistory?.isDeleteEventEmitted ?? false,
        };

        if (stat) {
          if (
            !history.isCreateEventEmitted &&
            now - history.birthtime < eventThreshold
          ) {
            e = {
              type: "create",
              path,
              raw: event,
            };

            history.isCreateEventEmitted = true;
          }
        } else if (!history.isDeleteEventEmitted) {
          e = {
            type: "delete",
            path,
            raw: event,
          };

          history.isDeleteEventEmitted = true;
        }

        if (!e) {
          if (now - history.mtime < eventThreshold) {
            e = {
              type: "modify",
              path,
              raw: event,
            };
          } else {
            e = {
              type: "unknown",
              path,
              raw: event,
            };
          }
        }

        histories.set(path, history);

        if (e) {
          yield e;
        }
      }
    },
  };
}
