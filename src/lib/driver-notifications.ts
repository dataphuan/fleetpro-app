import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type DriverDispatchNotificationPayload = {
  tripCode: string;
  driverName: string;
  driverPhone?: string | null;
  driverTelegramChatId?: string | null;
  licensePlate: string;
  departureAt: string;
  origin?: string | null;
  destination?: string | null;
  distanceKm?: number;
  customerName?: string | null;
};

type NotifyResult = {
  ok: boolean;
  channel: 'telegram' | 'none';
  message: string;
};

export type DriverInteractionReportRow = {
  driverName: string;
  sent: number;
  delivered: number;
  failed: number;
};

export type OpsEventPayload = {
  event_type: string;
  actor_role: string;
  actor_name: string;
  action: string;
  timestamp?: string;
  trip_code?: string | null;
  location?: string | null;
  status_after_action?: string | null;
  media_url?: string | null;
  tenant_id?: string | null;
  extra?: Record<string, unknown> | null;
};

export type OpsNotifyInput = {
  event: OpsEventPayload;
  text?: string;
  chatId?: string | null;
  mediaType?: 'photo' | 'video' | null;
  mediaUrl?: string | null;
};

const formatDeparture = (input: string) => {
  try {
    return new Date(input).toLocaleString('vi-VN');
  } catch {
    return input;
  }
};

export const buildDriverDispatchMessage = (payload: DriverDispatchNotificationPayload) => {
  const route = `${payload.origin || 'Chua ro'} -> ${payload.destination || 'Chua ro'}`;
  const customerLine = payload.customerName ? `Khach: ${payload.customerName}` : 'Khach: Chua cap nhat';

  return [
    'FleetPro - Chuyen moi duoc phan cong',
    '',
    `Tai xe: ${payload.driverName}`,
    `Bien so: ${payload.licensePlate}`,
    `Ngay gio: ${formatDeparture(payload.departureAt)}`,
    `Tuyen: ${route}${payload.distanceKm ? ` (${Math.round(payload.distanceKm)} km)` : ''}`,
    customerLine,
    '',
    `Ma chuyen: ${payload.tripCode}`,
    'Phan hoi: Xac nhan da nhan viec hoac tu choi.',
    '',
    'Duoc gui boi FleetPro AI',
  ].join('\n');
};

export const buildDriverInteractionReportMessage = (
  rows: DriverInteractionReportRow[],
  reportDateLabel: string,
) => {
  const totalSent = rows.reduce((sum, row) => sum + row.sent, 0);
  const totalDelivered = rows.reduce((sum, row) => sum + row.delivered, 0);
  const totalFailed = rows.reduce((sum, row) => sum + row.failed, 0);

  const lines = rows
    .sort((a, b) => b.delivered - a.delivered)
    .map((row, idx) => `${idx + 1}. ${row.driverName}: gui ${row.sent}, thanh cong ${row.delivered}, loi ${row.failed}`);

  return [
    `FleetPro - Bao cao tuong tac tai xe (${reportDateLabel})`,
    '',
    `Tong luot gui: ${totalSent}`,
    `Gui thanh cong: ${totalDelivered}`,
    `Gui loi: ${totalFailed}`,
    '',
    'Chi tiet theo tai xe:',
    ...(lines.length > 0 ? lines : ['(Khong co du lieu)']),
    '',
    'Duoc gui boi FleetPro AI',
  ].join('\n');
};

const sendViaTelegramBotApi = async (text: string, chatIdOverride?: string | null): Promise<NotifyResult> => {
  const token = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(chatIdOverride || import.meta.env.VITE_TELEGRAM_CHAT_ID || '').trim();

  if (!token || !chatId) {
    return {
      ok: false,
      channel: 'none',
      message: 'Missing VITE_TELEGRAM_BOT_TOKEN or VITE_TELEGRAM_CHAT_ID',
    };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const json = await response.json().catch(() => null as any);
  if (!response.ok || !json?.ok) {
    return {
      ok: false,
      channel: 'none',
      message: json?.description || `Telegram API error (${response.status})`,
    };
  }

  return {
    ok: true,
    channel: 'telegram',
    message: 'sent',
  };
};

const sendViaTelegramBotApiWithPhoto = async (text: string, photoUrl: string | null, chatIdOverride?: string | null): Promise<NotifyResult> => {
  const token = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(chatIdOverride || import.meta.env.VITE_TELEGRAM_CHAT_ID || '').trim();

  if (!token || !chatId) {
    return { ok: false, channel: 'none', message: 'Missing TELEGRAM env vars' };
  }

  // If no photo, fallback to regular message
  if (!photoUrl) {
    return sendViaTelegramBotApi(text, chatIdOverride);
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: text,
      parse_mode: 'HTML',
    }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) {
    // If sendPhoto fails (e.g. invalid URL format), fallback to regular text message
    return sendViaTelegramBotApi(`${text}\n\n[Photo: ${photoUrl}]`, chatIdOverride);
  }

  return { ok: true, channel: 'telegram', message: 'sent_with_photo' };
};

const sendViaServerEndpoint = async (payload: DriverDispatchNotificationPayload, text: string): Promise<NotifyResult> => {
  const endpoint = (import.meta.env.VITE_TELEGRAM_NOTIFY_ENDPOINT || '/api/notify/telegram').trim();
  if (!endpoint) {
    return {
      ok: false,
      channel: 'none',
      message: 'Missing endpoint',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, text, chatId: payload.driverTelegramChatId || null }),
    });
    const json = await response.json().catch(() => null as any);
    if (!response.ok || !json?.ok) {
      return {
        ok: false,
        channel: 'none',
        message: json?.message || `Endpoint error (${response.status})`,
      };
    }

    return {
      ok: true,
      channel: 'telegram',
      message: 'sent',
    };
  } catch (error: any) {
    return {
      ok: false,
      channel: 'none',
      message: error?.message || 'Endpoint unreachable',
    };
  }
};

const buildOpsEventText = (event: OpsEventPayload, fallbackText?: string) => {
  const eventTime = event.timestamp || new Date().toISOString();
  const extraText = event.extra
    ? Object.entries(event.extra)
        .filter(([, value]) => value !== null && value !== undefined && `${value}`.trim() !== '')
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n')
    : '';

  const lines = [
    `[${event.actor_role}] ${event.event_type}`,
    `Action: ${event.action}`,
    `By: ${event.actor_name}`,
    `Trip: ${event.trip_code || 'N/A'}`,
    `Location: ${event.location || 'N/A'}`,
    `Status: ${event.status_after_action || 'N/A'}`,
    `Time: ${eventTime}`,
  ];

  if (fallbackText && fallbackText.trim()) {
    lines.push('', fallbackText.trim());
  }
  if (extraText) {
    lines.push('', 'Context:', extraText);
  }

  return lines.join('\n');
};

export const sendOpsEventNotification = async (input: OpsNotifyInput): Promise<NotifyResult> => {
  const endpoint = (import.meta.env.VITE_TELEGRAM_NOTIFY_ENDPOINT || '/api/notify/telegram').trim();
  if (!endpoint) {
    return { ok: false, channel: 'none', message: 'Missing endpoint' };
  }

  const finalText = buildOpsEventText(input.event, input.text);

  const persistOpsEventToSystemLogs = async () => {
    const tenantId = String(input.event.tenant_id || input.event.extra?.tenant_id || '').trim();
    if (!tenantId) return;

    await addDoc(collection(db, 'system_logs'), {
      timestamp: input.event.timestamp || new Date().toISOString(),
      user_id: auth.currentUser?.uid || 'anonymous',
      user_email: auth.currentUser?.email || input.event.actor_name || 'unknown',
      tenant_id: tenantId,
      action: 'OPS_EVENT',
      collection_name: 'ops_events',
      entity_id: input.event.trip_code || input.event.event_type,
      metadata: {
        event: input.event,
        media_type: input.mediaType || null,
        media_url: input.mediaUrl || input.event.media_url || null,
      },
    });
  };

  try {
    await persistOpsEventToSystemLogs().catch(() => null);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: finalText,
        chatId: input.chatId || null,
        mediaType: input.mediaType || null,
        mediaUrl: input.mediaUrl || null,
        event: {
          ...input.event,
          timestamp: input.event.timestamp || new Date().toISOString(),
          media_url: input.mediaUrl || input.event.media_url || null,
        },
      }),
    });

    const json = await response.json().catch(() => null as any);
    if (!response.ok || !json?.ok) {
      return {
        ok: false,
        channel: 'none',
        message: json?.message || `Endpoint error (${response.status})`,
      };
    }

    return { ok: true, channel: 'telegram', message: 'sent' };
  } catch (error: any) {
    return { ok: false, channel: 'none', message: error?.message || 'Endpoint unreachable' };
  }
};

export const sendDriverDispatchNotification = async (
  payload: DriverDispatchNotificationPayload,
): Promise<NotifyResult> => {
  const text = buildDriverDispatchMessage(payload);

  // Prefer server-side endpoint to avoid exposing bot token in production.
  const viaEndpoint = await sendViaServerEndpoint(payload, text);
  if (viaEndpoint.ok) return viaEndpoint;

  // Fallback for local/demo where endpoint may not be running.
  return sendViaTelegramBotApi(text, payload.driverTelegramChatId);
};

export const sendDriverInteractionReportToTelegram = async (
  rows: DriverInteractionReportRow[],
  reportDateLabel: string,
): Promise<NotifyResult> => {
  const text = buildDriverInteractionReportMessage(rows, reportDateLabel);
  const viaEndpoint = await sendViaServerEndpoint(
    {
      tripCode: 'REPORT',
      driverName: 'FleetPro',
      licensePlate: 'N/A',
      departureAt: new Date().toISOString(),
    },
    text,
  );
  if (viaEndpoint.ok) return viaEndpoint;
  return sendViaTelegramBotApi(text);
};

export const sendDriverLocationReportNotification = async (payload: {
  tripCode: string;
  driverName: string;
  note: string;
  photoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  driverTelegramChatId?: string | null;
}): Promise<NotifyResult> => {
  const mapLink = payload.latitude && payload.longitude 
    ? `\n📍 <a href="https://www.google.com/maps?q=${payload.latitude},${payload.longitude}">Xem Bản đồ (Tọa độ: ${payload.latitude.toFixed(4)}, ${payload.longitude.toFixed(4)})</a>` 
    : '';
    
  const text = `🤖 <b>Xin chào, hệ thống nhận được thông tin từ bạn!</b>\n\n` +
    `Cảm ơn Bác tài <b>${payload.driverName}</b> đã gửi báo cáo vị trí / sự cố cho chuyến <code>${payload.tripCode}</code>.\n\n` +
    `📝 <b>Nội dung:</b> ${payload.note || '(Có ảnh đính kèm)'}${mapLink}\n\n` +
    `<i>Chúc Bác tài vạn dặm bình an! Đội ngũ điều phối đã được thông báo.</i>`;

  return sendViaTelegramBotApiWithPhoto(text, payload.photoUrl || null, payload.driverTelegramChatId);
};

export const sendDriverExpenseDocNotification = async (payload: {
  tripCode: string;
  driverName: string;
  amount: number;
  note: string;
  photoUrl?: string | null;
  driverTelegramChatId?: string | null;
}): Promise<NotifyResult> => {
  const formattedAmount = (payload.amount || 0).toLocaleString('vi-VN');
  
  const text = `🤖 <b>Hệ thống xác nhận đã nhận dữ liệu chi phí!</b>\n\n` +
    `Cảm ơn Bác tài <b>${payload.driverName}</b> đã gửi chứng từ cho chuyến <code>${payload.tripCode}</code>.\n\n` +
    `💰 <b>Số tiền cung cấp:</b> ${formattedAmount} VNĐ\n` +
    `📝 <b>Ghi chú/Mục đích:</b> ${payload.note}\n\n` +
    `<i>Khoản chi phí này đã được máy chủ ghi nhận chờ kế toán đối soát. Bộ phận điều phối cảm ơn sự hợp tác của Bác tài!</i>`;

  return sendViaTelegramBotApiWithPhoto(text, payload.photoUrl || null, payload.driverTelegramChatId);
};

