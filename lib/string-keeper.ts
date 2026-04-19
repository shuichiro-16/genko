export const TIMING_OPTIONS = [14, 7, 3, 1] as const;
export const DEFAULT_NOTIFICATION_DAYS = [7, 3, 1] as const;

export const STRING_BLUEPRINTS = [
  { slot: "1弦", note: "E4" },
  { slot: "2弦", note: "B3" },
  { slot: "3弦", note: "G3" },
  { slot: "4弦", note: "D3" },
  { slot: "5弦", note: "A2" },
  { slot: "6弦", note: "E2" },
] as const;

export const ACCENT_STYLES = {
  amber: {
    surface: "from-[#fff1d6] via-[#fffaf2] to-[#f4cfa9]",
    border: "border-[#e6ba8b]",
    button:
      "border-[#d19967] bg-[#c96f3b] text-white hover:bg-[#ad5c2d] focus-visible:outline-[#c96f3b]",
  },
  tide: {
    surface: "from-[#dff5ef] via-[#f4fffd] to-[#b9e0d7]",
    border: "border-[#8fc7bc]",
    button:
      "border-[#589f92] bg-[#25756a] text-white hover:bg-[#1c5d54] focus-visible:outline-[#25756a]",
  },
  noir: {
    surface: "from-[#f2e6e7] via-[#fff8f7] to-[#d8bbc0]",
    border: "border-[#c8a0a6]",
    button:
      "border-[#8e5560] bg-[#7c3d48] text-white hover:bg-[#65313a] focus-visible:outline-[#7c3d48]",
  },
} as const;

export type Accent = keyof typeof ACCENT_STYLES;
export type NotificationTiming = (typeof TIMING_OPTIONS)[number];

export type GuitarString = {
  slot: (typeof STRING_BLUEPRINTS)[number]["slot"];
  note: (typeof STRING_BLUEPRINTS)[number]["note"];
  replaceAt: string;
};

export type Guitar = {
  id: number;
  name: string;
  accent: Accent;
  strings: GuitarString[];
};

export type NewGuitar = Omit<Guitar, "id">;

export type ScheduleDraft = Record<string, string>;

export type NotificationItem = {
  id: string;
  guitarName: string;
  slot: string;
  replaceAt: string;
  daysRemaining: number;
  kind: "overdue" | "today" | "upcoming";
};

export type AppSnapshot = {
  guitars: Guitar[];
  notificationDays: number[];
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const NEW_GUITAR_BASE_OFFSETS = [4, 7, 10, 13, 16, 20] as const;
const TIMING_OPTION_SET = new Set<number>(TIMING_OPTIONS);

const INITIAL_GUITAR_CONFIGS = [
  {
    name: "Amber Tele",
    accent: "amber",
    offsets: [-2, 2, 5, 9, 13, 17],
  },
  {
    name: "Midnight Strat",
    accent: "tide",
    offsets: [1, 4, 7, 11, 16, 20],
  },
  {
    name: "Studio Jaguar",
    accent: "noir",
    offsets: [0, 3, 8, 12, 15, 23],
  },
] as const satisfies ReadonlyArray<{
  accent: Accent;
  name: string;
  offsets: number[];
}>;

export const ACCENT_CYCLE: Accent[] = ["amber", "tide", "noir"];

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(baseIso: string, days: number) {
  const date = parseIsoDate(baseIso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function differenceInDays(fromIso: string, toIso: string) {
  const from = parseIsoDate(fromIso).getTime();
  const to = parseIsoDate(toIso).getTime();
  return Math.round((to - from) / DAY_IN_MS);
}

export function isAccent(value: string): value is Accent {
  return Object.prototype.hasOwnProperty.call(ACCENT_STYLES, value);
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(parseIsoDate(value));
}

export function formatLeadDay(value: number) {
  if (value === 14) {
    return "2週間前";
  }

  if (value === 7) {
    return "1週間前";
  }

  return `${value}日前`;
}

export function createStrings(baseIso: string, offsets: readonly number[]): GuitarString[] {
  return STRING_BLUEPRINTS.map((blueprint, index) => ({
    ...blueprint,
    replaceAt: addDays(baseIso, offsets[index] ?? index + 1),
  }));
}

export function createScheduleDraft(guitar: Guitar): ScheduleDraft {
  return Object.fromEntries(
    guitar.strings.map((guitarString) => [guitarString.slot, guitarString.replaceAt]),
  );
}

export function normalizeNotificationDays(days: number[]) {
  const unique = Array.from(
    new Set(
      days.filter((day): day is NotificationTiming => {
        return TIMING_OPTION_SET.has(day);
      }),
    ),
  );

  if (unique.length === 0) {
    return [3];
  }

  return unique.sort((left, right) => right - left);
}

export function getStringStatus(daysRemaining: number) {
  if (daysRemaining < 0) {
    return {
      label: `${Math.abs(daysRemaining)}日超過`,
      className: "border-[#cf8a7a] bg-[#fff1ec] text-[#8a3726]",
    };
  }

  if (daysRemaining === 0) {
    return {
      label: "本日交換",
      className: "border-[#d69a4c] bg-[#fff4de] text-[#84511e]",
    };
  }

  if (daysRemaining <= 3) {
    return {
      label: `あと${daysRemaining}日`,
      className: "border-[#d69a4c] bg-[#fff4de] text-[#84511e]",
    };
  }

  if (daysRemaining <= 7) {
    return {
      label: "今週要確認",
      className: "border-[#8db7b0] bg-[#eaf7f3] text-[#155a53]",
    };
  }

  return {
    label: "安定",
    className: "border-[#cfb79d] bg-[#f8efe6] text-[#6d5b49]",
  };
}

export function buildNotifications(
  guitars: Guitar[],
  notificationDays: number[],
  todayIso: string,
) {
  const items: NotificationItem[] = [];

  for (const guitar of guitars) {
    for (const guitarString of guitar.strings) {
      const daysRemaining = differenceInDays(todayIso, guitarString.replaceAt);

      if (daysRemaining < 0) {
        items.push({
          id: `${guitar.id}-${guitarString.slot}-overdue`,
          guitarName: guitar.name,
          slot: guitarString.slot,
          replaceAt: guitarString.replaceAt,
          daysRemaining,
          kind: "overdue",
        });
        continue;
      }

      if (daysRemaining === 0) {
        items.push({
          id: `${guitar.id}-${guitarString.slot}-today`,
          guitarName: guitar.name,
          slot: guitarString.slot,
          replaceAt: guitarString.replaceAt,
          daysRemaining,
          kind: "today",
        });
        continue;
      }

      if (notificationDays.includes(daysRemaining)) {
        items.push({
          id: `${guitar.id}-${guitarString.slot}-upcoming`,
          guitarName: guitar.name,
          slot: guitarString.slot,
          replaceAt: guitarString.replaceAt,
          daysRemaining,
          kind: "upcoming",
        });
      }
    }
  }

  return items.sort((left, right) => {
    if (left.kind !== right.kind) {
      const order = { overdue: 0, today: 1, upcoming: 2 };
      return order[left.kind] - order[right.kind];
    }

    return left.daysRemaining - right.daysRemaining;
  });
}

export function getNextChangeLabel(guitar: Guitar, todayIso: string) {
  const sortedStrings = [...guitar.strings].sort(
    (left, right) =>
      Math.abs(differenceInDays(todayIso, left.replaceAt)) -
      Math.abs(differenceInDays(todayIso, right.replaceAt)),
  );

  const nextString = sortedStrings[0];

  if (!nextString) {
    return "次回予定なし";
  }

  return `${nextString.slot} ${formatDateLabel(nextString.replaceAt)}`;
}

export function buildNewGuitar(name: string, baseIso: string, guitarCount: number): NewGuitar {
  const accent = ACCENT_CYCLE[guitarCount % ACCENT_CYCLE.length];
  const offsets = NEW_GUITAR_BASE_OFFSETS.map((value) => value + guitarCount);

  return {
    name,
    accent,
    strings: createStrings(baseIso, offsets),
  };
}

export function createSeedSnapshot(baseIso: string): AppSnapshot {
  return {
    guitars: INITIAL_GUITAR_CONFIGS.map((config, index) => ({
      id: index + 1,
      name: config.name,
      accent: config.accent,
      strings: createStrings(baseIso, config.offsets),
    })),
    notificationDays: [...DEFAULT_NOTIFICATION_DAYS],
  };
}
