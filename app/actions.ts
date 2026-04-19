"use server";

import { revalidatePath } from "next/cache";

import {
  createGuitar,
  updateGuitarSchedule,
  updateNotificationSettings,
} from "@/lib/sqlite";
import type { ScheduleDraft } from "@/lib/string-keeper";

export async function createGuitarAction(name: string) {
  const snapshot = createGuitar(name);
  revalidatePath("/");
  return snapshot;
}

export async function updateGuitarScheduleAction(guitarId: number, schedule: ScheduleDraft) {
  const snapshot = updateGuitarSchedule(guitarId, schedule);
  revalidatePath("/");
  return snapshot;
}

export async function updateNotificationSettingsAction(days: number[]) {
  const snapshot = updateNotificationSettings(days);
  revalidatePath("/");
  return snapshot;
}
