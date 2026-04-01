// Using 'any' for context to align with existing Cloudflare function style in this project.
export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  try {
    const body = (await request.json()) as any;
    const text = String(body?.text || '').trim();
    const chatIdOverride = String(body?.chatId || '').trim();

    if (!text) {
      return new Response(JSON.stringify({ ok: false, message: 'Missing text payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = String(env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = chatIdOverride || String(env.TELEGRAM_CHAT_ID || '').trim();
    if (!token || !chatId) {
      return new Response(JSON.stringify({ ok: false, message: 'Server telegram credentials are missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    const telegramJson = await telegramRes.json().catch(() => null as any);
    if (!telegramRes.ok || !telegramJson?.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: telegramJson?.description || `Telegram API error (${telegramRes.status})`,
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, message: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
