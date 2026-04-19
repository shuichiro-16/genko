"use client";

import { useState, type FormEvent } from "react";

import {
  createGuitarAction,
  updateGuitarScheduleAction,
  updateNotificationSettingsAction,
} from "@/app/actions";
import {
  ACCENT_STYLES,
  buildNotifications,
  createScheduleDraft,
  differenceInDays,
  formatDateLabel,
  formatLeadDay,
  getNextChangeLabel,
  getStringStatus,
  STRING_BLUEPRINTS,
  TIMING_OPTIONS,
  type AppSnapshot,
  type Guitar,
  type ScheduleDraft,
} from "@/lib/string-keeper";

type HomeClientProps = {
  initialSnapshot: AppSnapshot;
  storageLabel: string;
  todayIso: string;
};

export default function HomeClient({
  initialSnapshot,
  storageLabel,
  todayIso,
}: HomeClientProps) {
  const [guitars, setGuitars] = useState(initialSnapshot.guitars);
  const [notificationDays, setNotificationDays] = useState(initialSnapshot.notificationDays);
  const [modal, setModal] = useState<"register" | "schedule" | "settings" | null>(null);
  const [newGuitarName, setNewGuitarName] = useState("");
  const [scheduleTargetId, setScheduleTargetId] = useState<number>(
    initialSnapshot.guitars[0]?.id ?? 0,
  );
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(
    initialSnapshot.guitars[0] ? createScheduleDraft(initialSnapshot.guitars[0]) : {},
  );
  const [settingsDraft, setSettingsDraft] = useState<number[]>(initialSnapshot.notificationDays);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const notifications = buildNotifications(guitars, notificationDays, todayIso);
  const overdueCount = guitars.flatMap((guitar) => guitar.strings).filter((guitarString) => {
    return differenceInDays(todayIso, guitarString.replaceAt) < 0;
  }).length;
  const upcomingCount = guitars.flatMap((guitar) => guitar.strings).filter((guitarString) => {
    const daysRemaining = differenceInDays(todayIso, guitarString.replaceAt);
    return daysRemaining >= 0 && daysRemaining <= 7;
  }).length;
  const nextNotification = notifications[0];

  function closeModal() {
    if (isSaving) {
      return;
    }

    setModal(null);
  }

  function applySnapshot(snapshot: AppSnapshot, preferredTargetId?: number) {
    setGuitars(snapshot.guitars);
    setNotificationDays(snapshot.notificationDays);
    setSettingsDraft(snapshot.notificationDays);

    const nextTarget =
      snapshot.guitars.find((candidate) => candidate.id === preferredTargetId) ??
      snapshot.guitars.find((candidate) => candidate.id === scheduleTargetId) ??
      snapshot.guitars[0];

    if (!nextTarget) {
      setScheduleTargetId(0);
      setScheduleDraft({});
      return;
    }

    setScheduleTargetId(nextTarget.id);
    setScheduleDraft(createScheduleDraft(nextTarget));
  }

  function openScheduleModal(guitarId: number) {
    const guitar = guitars.find((candidate) => candidate.id === guitarId);

    if (!guitar) {
      return;
    }

    setScheduleTargetId(guitarId);
    setScheduleDraft(createScheduleDraft(guitar));
    setModal("schedule");
  }

  function openSettingsModal() {
    setSettingsDraft(notificationDays);
    setModal("settings");
  }

  function handleScheduleTargetChange(nextId: number) {
    const guitar = guitars.find((candidate) => candidate.id === nextId);

    if (!guitar) {
      return;
    }

    setScheduleTargetId(nextId);
    setScheduleDraft(createScheduleDraft(guitar));
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newGuitarName.trim();

    if (!name) {
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const snapshot = await createGuitarAction(name);
      const created = snapshot.guitars[snapshot.guitars.length - 1];
      applySnapshot(snapshot, created?.id);
      setNewGuitarName("");
      setModal(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "ギターの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!scheduleTargetId) {
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const snapshot = await updateGuitarScheduleAction(scheduleTargetId, scheduleDraft);
      applySnapshot(snapshot, scheduleTargetId);
      setModal(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "交換日の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleTimingOption(value: number) {
    setSettingsDraft((current) => {
      if (current.includes(value)) {
        const next = current.filter((candidate) => candidate !== value);
        return next.sort((left, right) => right - left);
      }

      return [...current, value].sort((left, right) => right - left);
    });
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaveError(null);
    setIsSaving(true);

    try {
      const snapshot = await updateNotificationSettingsAction(settingsDraft);
      applySnapshot(snapshot, scheduleTargetId);
      setModal(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "通知設定の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(250,209,162,0.92),_transparent_52%),radial-gradient(circle_at_top_right,_rgba(145,207,196,0.55),_transparent_36%),radial-gradient(circle_at_center,_rgba(201,111,59,0.12),_transparent_58%)]" />
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[32px] border border-white/60 bg-[#fffaf4]/88 p-6 shadow-[0_24px_80px_rgba(58,34,17,0.14)] backdrop-blur md:p-8 xl:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d7b497] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#7d5231]">
                String Keeper
                <span className="h-2 w-2 rounded-full bg-[#c96f3b]" />
                SQLite Ready
              </div>
              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#9d7656]">
                  ギター登録 / 弦交換時期設定 / 通知設定
                </p>
                <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-[1.02] tracking-tight text-[#23170f] md:text-6xl">
                  交換タイミングを
                  <br />
                  SQLite に残す。
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#5d4a3b] md:text-lg">
                  画面上の登録、交換日更新、通知設定はサーバアクション経由で SQLite に保存されます。リロード後も状態を維持できます。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setModal("register")}
                  className="rounded-full border border-[#d19967] bg-[#c96f3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ad5c2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c96f3b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ギターを登録
                </button>
                <button
                  type="button"
                  disabled={isSaving || guitars.length === 0}
                  onClick={() => openScheduleModal(guitars[0]?.id ?? 0)}
                  className="rounded-full border border-[#cbb298] bg-[#fffaf4] px-5 py-3 text-sm font-semibold text-[#4b3828] transition hover:bg-[#f4eadf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c96f3b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  交換スケジュールを調整
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={openSettingsModal}
                  className="rounded-full border border-[#cbb298] bg-transparent px-5 py-3 text-sm font-semibold text-[#4b3828] transition hover:bg-[#f4eadf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c96f3b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  通知設定を開く
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="rounded-full border border-[#dcc1a7] bg-white/75 px-4 py-2 font-medium text-[#5d4a3b]">
                  保存先 {storageLabel}
                </div>
                <div
                  className={`rounded-full border px-4 py-2 font-medium ${
                    isSaving
                      ? "border-[#d19967] bg-[#fff0df] text-[#8a4b22]"
                      : "border-[#c8dacf] bg-[#edf8f3] text-[#1f6759]"
                  }`}
                >
                  {isSaving ? "SQLite に保存中..." : "状態は自動で SQLite に保存されます"}
                </div>
                {saveError ? (
                  <div className="rounded-full border border-[#cf8a7a] bg-[#fff1ec] px-4 py-2 font-medium text-[#8a3726]">
                    {saveError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative rounded-[28px] border border-[#dcc0a7] bg-[linear-gradient(160deg,rgba(255,250,244,0.98),rgba(247,236,222,0.94))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="pointer-events-none absolute inset-x-6 top-12 h-px bg-[linear-gradient(90deg,transparent,rgba(157,118,86,0.45),transparent)]" />
              <div className="pointer-events-none absolute inset-x-6 top-24 h-px bg-[linear-gradient(90deg,transparent,rgba(157,118,86,0.35),transparent)]" />
              <div className="pointer-events-none absolute inset-x-6 top-36 h-px bg-[linear-gradient(90deg,transparent,rgba(157,118,86,0.25),transparent)]" />
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7656]">
                      本日の注目
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#23170f]">
                      {nextNotification
                        ? `${nextNotification.guitarName} / ${nextNotification.slot}`
                        : "通知対象なし"}
                    </h2>
                  </div>
                  <div className="rounded-full border border-[#d7b497] bg-white/70 px-3 py-1 text-xs font-semibold text-[#7d5231]">
                    基準日 {formatDateLabel(todayIso)}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#e2cbb2] bg-white/72 p-4">
                  <p className="text-sm leading-7 text-[#604d3d]">
                    {nextNotification
                      ? nextNotification.kind === "overdue"
                        ? `${nextNotification.guitarName} の ${nextNotification.slot} は予定日を過ぎています。交換日 ${formatDateLabel(nextNotification.replaceAt)}`
                        : nextNotification.kind === "today"
                          ? `${nextNotification.guitarName} の ${nextNotification.slot} は本日交換予定です。`
                          : `${nextNotification.guitarName} の ${nextNotification.slot} は ${nextNotification.daysRemaining} 日後に交換予定です。`
                      : "現在アクションが必要な弦はありません。"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[#e2cbb2] bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d7656]">
                      通知タイミング
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[#23170f]">
                      {notificationDays
                        .slice()
                        .sort((left, right) => right - left)
                        .map((value) => formatLeadDay(value))
                        .join(" / ")}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[#e2cbb2] bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d7656]">
                      管理対象
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[#23170f]">
                      {guitars.length} 本 / {guitars.length * 6} 弦
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-[#e1c6aa] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7656]">
                Overdue
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[#23170f]">
                {overdueCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6b5949]">
                交換予定日を過ぎている弦。優先度の高い通知として上部に表示します。
              </p>
            </div>
            <div className="rounded-[24px] border border-[#e1c6aa] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7656]">
                Next 7 Days
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[#23170f]">
                {upcomingCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6b5949]">
                直近 1 週間で確認が必要な弦。カード内のバッジでも状態を見分けられます。
              </p>
            </div>
            <div className="rounded-[24px] border border-[#e1c6aa] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7656]">
                Storage
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[#23170f]">
                SQLite
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6b5949]">
                ページの状態はクライアント内メモリではなく、ローカルデータベースに永続化されます。
              </p>
            </div>
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f6a4b]">
                  Guitar Cards
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#24180f]">
                  ギターごとの交換状況
                </h2>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setModal("register")}
                className="rounded-full border border-[#d3b190] bg-[#fffaf4] px-4 py-2 text-sm font-semibold text-[#4b3828] transition hover:bg-[#f4eadf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c96f3b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                新規ギターを追加
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {guitars.map((guitar: Guitar) => {
                const accent = ACCENT_STYLES[guitar.accent];

                return (
                  <article
                    key={guitar.id}
                    className={`overflow-hidden rounded-[28px] border bg-gradient-to-br ${accent.surface} ${accent.border} p-5 shadow-[0_14px_36px_rgba(51,31,17,0.1)]`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f6a4b]">
                          Guitar
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-[#24180f]">
                          {guitar.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => openScheduleModal(guitar.id)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${accent.button} disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        交換時期を設定
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-[20px] border border-white/70 bg-white/65 px-4 py-3 text-sm text-[#5d4a3b]">
                      <span>次の交換予定</span>
                      <span className="font-semibold text-[#23170f]">
                        {getNextChangeLabel(guitar, todayIso)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {guitar.strings.map((guitarString) => {
                        const daysRemaining = differenceInDays(todayIso, guitarString.replaceAt);
                        const status = getStringStatus(daysRemaining);

                        return (
                          <div
                            key={guitarString.slot}
                            className="rounded-[20px] border border-white/75 bg-white/72 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#24180f]">
                                  {guitarString.slot}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#8f6a4b]">
                                  {guitarString.note}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </div>
                            <p className="mt-4 text-sm font-medium text-[#4f3d2f]">
                              交換日 {formatDateLabel(guitarString.replaceAt)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>

            <section className="rounded-[30px] border border-[#d9bca0] bg-[#fffaf4]/88 p-6 shadow-[0_18px_48px_rgba(58,34,17,0.08)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f6a4b]">
                    User Flow
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#24180f]">
                    ユーザ操作フロー
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-[#5d4a3b]">
                  要件に記載された 4 ステップをそのまま UI の導線として整理しています。
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {[
                  {
                    step: "01",
                    title: "ギターを登録",
                    body: "名前を入力してカードを追加。保存内容は SQLite に書き込まれ、リロード後も残ります。",
                  },
                  {
                    step: "02",
                    title: "交換日を設定",
                    body: "カード右上のボタンからモーダルを開き、各弦の交換日を日付単位で更新します。",
                  },
                  {
                    step: "03",
                    title: "通知条件を選択",
                    body: "ユーザ設定モーダルで 2 週間前、1 週間前、3 日前、前日を選択できます。",
                  },
                  {
                    step: "04",
                    title: "通知を確認",
                    body: "通知センターで期限超過、本日、指定日前の順に確認できます。",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-[24px] border border-[#e5cbb0] bg-white/76 p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9d7656]">
                      Step {item.step}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-[#24180f]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#5d4a3b]">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[#d9bca0] bg-[#fffaf4]/88 p-6 shadow-[0_18px_48px_rgba(58,34,17,0.08)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f6a4b]">
                    Notification Center
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#24180f]">
                    通知一覧
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={openSettingsModal}
                  className="rounded-full border border-[#d3b190] bg-white px-4 py-2 text-sm font-semibold text-[#4b3828] transition hover:bg-[#f4eadf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c96f3b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  設定変更
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((item) => {
                    const tone =
                      item.kind === "overdue"
                        ? "border-[#cf8a7a] bg-[#fff1ec] text-[#8a3726]"
                        : item.kind === "today"
                          ? "border-[#d69a4c] bg-[#fff4de] text-[#84511e]"
                          : "border-[#8db7b0] bg-[#eaf7f3] text-[#155a53]";

                    return (
                      <div
                        key={item.id}
                        className="rounded-[22px] border border-[#ecd9c7] bg-white/80 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#24180f]">
                              {item.guitarName} / {item.slot}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#5d4a3b]">
                              交換日 {formatDateLabel(item.replaceAt)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
                          >
                            {item.kind === "overdue"
                              ? `${Math.abs(item.daysRemaining)}日超過`
                              : item.kind === "today"
                                ? "本日"
                                : `${item.daysRemaining}日前通知`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] border border-dashed border-[#d6b89a] bg-white/76 p-5 text-sm leading-7 text-[#5d4a3b]">
                    現在の通知条件に一致する弦はありません。設定を広げる場合は通知タイミングを変更してください。
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#d9bca0] bg-[#fffaf4]/88 p-6 shadow-[0_18px_48px_rgba(58,34,17,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f6a4b]">
                User Settings
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#24180f]">
                通知ルール
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#5d4a3b]">
                通知のタイミングは複数選択可能です。直前の確認を重視するか、余裕を持って準備するかをここで調整します。
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {TIMING_OPTIONS.map((value) => {
                  const enabled = notificationDays.includes(value);

                  return (
                    <div
                      key={value}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                        enabled
                          ? "border-[#d19967] bg-[#fff0df] text-[#8a4b22]"
                          : "border-[#d7c1ad] bg-white text-[#715b49]"
                      }`}
                    >
                      {formatLeadDay(value)}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[24px] border border-[#e5cbb0] bg-white/76 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d7656]">
                  設定モーダルで変更できる内容
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5d4a3b]">
                  <li>弦交換の通知タイミングを複数選択</li>
                  <li>モーダル経由で既存設定を上書き保存</li>
                  <li>通知センターに即時反映</li>
                </ul>
              </div>
            </section>
          </aside>
        </main>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#20150f]/45 px-4 py-8 backdrop-blur-sm"
          role="presentation"
          onClick={() => {
            if (!isSaving) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-[30px] border border-white/70 bg-[#fffaf4] p-6 shadow-[0_32px_90px_rgba(41,24,14,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f6a4b]">
                  {modal === "register"
                    ? "Guitar Register"
                    : modal === "schedule"
                      ? "String Schedule"
                      : "User Settings"}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#24180f]">
                  {modal === "register"
                    ? "ギター登録"
                    : modal === "schedule"
                      ? "弦交換時期設定"
                      : "通知タイミング設定"}
                </h2>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={closeModal}
                className="rounded-full border border-[#d3b190] bg-white px-4 py-2 text-sm font-semibold text-[#4b3828] transition hover:bg-[#f4eadf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c96f3b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                閉じる
              </button>
            </div>

            {modal === "register" ? (
              <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit}>
                <label className="block">
                  <span className="text-sm font-semibold text-[#4f3d2f]">ギター名</span>
                  <input
                    disabled={isSaving}
                    value={newGuitarName}
                    onChange={(event) => setNewGuitarName(event.target.value)}
                    placeholder="例: Sunset Jazzmaster"
                    className="mt-3 w-full rounded-[20px] border border-[#d8b89b] bg-white px-4 py-4 text-base text-[#24180f] outline-none transition placeholder:text-[#9d876f] focus:border-[#c96f3b] focus:ring-4 focus:ring-[#f2d4bd] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>

                <div className="rounded-[24px] border border-[#e5cbb0] bg-white/78 p-5">
                  <p className="text-sm leading-7 text-[#5d4a3b]">
                    登録するとカードが追加され、6 本の弦に初期交換日が自動で割り当てられます。保存先は SQLite のため、あとからページを開き直しても状態が残ります。
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={closeModal}
                    className="rounded-full border border-[#d3b190] bg-transparent px-5 py-3 text-sm font-semibold text-[#4b3828] transition hover:bg-[#f4eadf] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-full border border-[#d19967] bg-[#c96f3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ad5c2d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "保存中..." : "登録する"}
                  </button>
                </div>
              </form>
            ) : null}

            {modal === "schedule" ? (
              <form className="mt-8 space-y-6" onSubmit={handleScheduleSubmit}>
                <label className="block">
                  <span className="text-sm font-semibold text-[#4f3d2f]">対象ギター</span>
                  <select
                    disabled={isSaving}
                    value={scheduleTargetId}
                    onChange={(event) => handleScheduleTargetChange(Number(event.target.value))}
                    className="mt-3 w-full rounded-[20px] border border-[#d8b89b] bg-white px-4 py-4 text-base text-[#24180f] outline-none transition focus:border-[#c96f3b] focus:ring-4 focus:ring-[#f2d4bd] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guitars.map((guitar) => (
                      <option key={guitar.id} value={guitar.id}>
                        {guitar.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  {STRING_BLUEPRINTS.map((blueprint) => (
                    <label
                      key={blueprint.slot}
                      className="rounded-[22px] border border-[#e5cbb0] bg-white/78 p-4"
                    >
                      <span className="block text-sm font-semibold text-[#24180f]">
                        {blueprint.slot}
                      </span>
                      <span className="mt-1 block text-xs uppercase tracking-[0.2em] text-[#8f6a4b]">
                        {blueprint.note}
                      </span>
                      <input
                        type="date"
                        disabled={isSaving}
                        value={scheduleDraft[blueprint.slot] ?? ""}
                        onChange={(event) =>
                          setScheduleDraft((current) => ({
                            ...current,
                            [blueprint.slot]: event.target.value,
                          }))
                        }
                        className="mt-4 w-full rounded-[16px] border border-[#d8b89b] bg-white px-3 py-3 text-sm text-[#24180f] outline-none transition focus:border-[#c96f3b] focus:ring-4 focus:ring-[#f2d4bd] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={closeModal}
                    className="rounded-full border border-[#d3b190] bg-transparent px-5 py-3 text-sm font-semibold text-[#4b3828] transition hover:bg-[#f4eadf] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-full border border-[#d19967] bg-[#c96f3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ad5c2d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "保存中..." : "保存する"}
                  </button>
                </div>
              </form>
            ) : null}

            {modal === "settings" ? (
              <form className="mt-8 space-y-6" onSubmit={handleSettingsSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TIMING_OPTIONS.map((value) => {
                    const enabled = settingsDraft.includes(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={isSaving}
                        onClick={() => toggleTimingOption(value)}
                        className={`rounded-[22px] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          enabled
                            ? "border-[#d19967] bg-[#fff0df] shadow-[inset_0_0_0_1px_rgba(201,111,59,0.12)]"
                            : "border-[#e5cbb0] bg-white/78 hover:bg-[#fbf4eb]"
                        }`}
                      >
                        <p className="text-lg font-semibold text-[#24180f]">{formatLeadDay(value)}</p>
                        <p className="mt-2 text-sm leading-6 text-[#5d4a3b]">
                          {value >= 7
                            ? "余裕を持って弦やメンテナンス時間を確保できます。"
                            : "直前の確認用。交換忘れを防ぎたい場合に有効です。"}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[24px] border border-[#e5cbb0] bg-white/78 p-5 text-sm leading-7 text-[#5d4a3b]">
                  通知タイミングは複数選択できます。未選択のまま保存した場合は、最小構成として 3 日前通知を自動で有効化します。
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={closeModal}
                    className="rounded-full border border-[#d3b190] bg-transparent px-5 py-3 text-sm font-semibold text-[#4b3828] transition hover:bg-[#f4eadf] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-full border border-[#d19967] bg-[#c96f3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ad5c2d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "保存中..." : "保存する"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
