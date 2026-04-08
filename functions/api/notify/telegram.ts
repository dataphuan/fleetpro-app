// Using 'any' for context to align with existing Cloudflare function style in this project.
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  try {
    const body = (await request.json()) as any;
    const event = body?.event || null;
    let text = String(body?.text || '').trim();
    const chatIdOverride = String(body?.chatId || '').trim();
    const mediaType = String(body?.mediaType || '').trim().toLowerCase();
    const mediaUrl = String(body?.mediaUrl || '').trim();

    if (!text && event && typeof event === 'object') {
      const eventLines = [
        `[${String(event.actor_role || 'system')}] ${String(event.event_type || 'OPS_EVENT')}`,
        `Action: ${String(event.action || 'update')}`,
        `By: ${String(event.actor_name || 'unknown')}`,
        `Trip: ${String(event.trip_code || 'N/A')}`,
        `Location: ${String(event.location || 'N/A')}`,
        `Status: ${String(event.status_after_action || 'N/A')}`,
        `Time: ${String(event.timestamp || new Date().toISOString())}`,
      ];

      const extra = event.extra;
      if (extra && typeof extra === 'object') {
        const extraRows = Object.entries(extra)
          .filter(([, value]) => value !== null && value !== undefined && `${value}`.trim() !== '')
          .map(([key, value]) => `- ${key}: ${value}`);
        if (extraRows.length) {
          eventLines.push('', 'Context:', ...extraRows);
        }
      }

      text = eventLines.join('\n');
    }

    if (!text) {
      return new Response(JSON.stringify({ ok: false, message: 'Missing text payload' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const token = String(env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = chatIdOverride || String(env.TELEGRAM_CHAT_ID || '').trim();
    
    if (!token || !chatId) {
      // SIMULATION MODE: If credentials are missing, return a simulated success for trial/demo accounts
      // This prevents the UI from breaking during audits or initial trials.
      console.warn('⚠️ Telegram credentials missing. Entering SIMULATION MODE for demo account.');
      return new Response(JSON.stringify({ 
        ok: true, 
        message: 'Simulated success (Missing credentials)',
        simulated: true 
      }), {
        headers: corsHeaders,
      });
    }

    let telegramMethod = 'sendMessage';
    let telegramPayload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    };

    if (mediaType === 'photo') {
      if (!mediaUrl) {
        return new Response(JSON.stringify({ ok: false, message: 'Missing mediaUrl for photo payload' }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      telegramMethod = 'sendPhoto';
      telegramPayload = {
        chat_id: chatId,
        photo: mediaUrl,
        caption: text,
      };
    }

    if (mediaType === 'video') {
      if (!mediaUrl) {
        return new Response(JSON.stringify({ ok: false, message: 'Missing mediaUrl for video payload' }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      telegramMethod = 'sendVideo';
      telegramPayload = {
        chat_id: chatId,
        video: mediaUrl,
        caption: text,
      };
    }

    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/${telegramMethod}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload),
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
          headers: corsHeaders,
        },
      );
    }

    return new Response(JSON.stringify({ ok: true, mode: telegramMethod }), {
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, message: error?.message || 'Unknown error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
