const { env } = require("../config/env");

async function broadcast(channel, event, payload) {
  if (!env.supabaseUrl || !env.supabaseSecretKey) return;

  try {
    const response = await fetch(
      `${env.supabaseUrl}/realtime/v1/api/broadcast`,
      {
        method: "POST",
        headers: {
          apikey: env.supabaseSecretKey,
          Authorization: `Bearer ${env.supabaseSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ channel, event, payload }],
        }),
      },
    );

    if (!response.ok) {
      console.warn(
        `[broadcast] Gagal mengirim event ${event} ke channel ${channel}: ${response.status}`,
      );
    }
  } catch (error) {
    console.warn(
      `[broadcast] Gagal mengirim event ${event} ke channel ${channel}:`,
      error.message,
    );
  }
}

module.exports = { broadcast };
