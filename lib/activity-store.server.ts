import type { ActivityStore } from "./activity-store";
import { LocalActivityStore } from "./local-activity-store";

let store: ActivityStore | undefined;

export function getActivityStore(): ActivityStore {
  if (store) return store;

  if (process.env.ACTIVITY_STORE === "postgres" || process.env.DATABASE_URL) {
    throw new Error("Postgres activity store is not enabled in this build. Use ACTIVITY_STORE=local until the database driver is installed.");
  }

  store = new LocalActivityStore();
  return store;
}
