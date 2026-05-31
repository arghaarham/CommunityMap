const { runMigrations, seedDemoData } = require("../src/lib/bootstrap");

const allowedModes = new Set(["append", "off", "sync", "upsert"]);
const mode = String(process.argv[2] || "append").trim().toLowerCase();

if (!allowedModes.has(mode)) {
  console.error(
    `Mode seed tidak valid: "${mode}". Gunakan salah satu dari append, off, sync, atau upsert.`,
  );
  process.exit(1);
}

async function main() {
  await runMigrations();
  const result = await seedDemoData({ mode });

  if (!result.seeded) {
    console.log(`[seed] demo data dilewati (mode=${result.mode})`);
    return;
  }

  console.log(
    `[seed] selesai mode=${result.mode} reports=${result.reportCount} comments=${result.commentCount} chats=${result.chatCount}`,
  );
}

main().catch((error) => {
  console.error("[seed] gagal menjalankan seed demo", error);
  process.exit(1);
});
