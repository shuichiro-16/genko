import HomeClient from "@/app/home-client";
import { DATABASE_FILE_RELATIVE, loadSnapshot } from "@/lib/sqlite";
import { toIsoDate } from "@/lib/string-keeper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Home() {
  const initialSnapshot = loadSnapshot();
  const todayIso = toIsoDate(new Date());

  return (
    <HomeClient
      initialSnapshot={initialSnapshot}
      storageLabel={DATABASE_FILE_RELATIVE}
      todayIso={todayIso}
    />
  );
}
