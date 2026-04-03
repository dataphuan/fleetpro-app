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
    ? `\n📍 Bản đồ: https://www.google.com/maps?q=${payload.latitude},${payload.longitude}` 
    : '';
    
  const text = `🚨 <b>Báo cáo sự cố / Vị trí</b>\n` +
    `Mã chuyến: ${payload.tripCode}\n` +
    `Tài xế: ${payload.driverName}\n` +
    `Nội dung: ${payload.note || '(Có ảnh đính kèm)'}${mapLink}`;

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
  
  const text = `💰 <b>Chi phí / Chứng từ mới</b>\n` +
    `Mã chuyến: ${payload.tripCode}\n` +
    `Tài xế: ${payload.driverName}\n` +
    `Số tiền: ${formattedAmount} VNĐ\n` +
    `Ghi chú: ${payload.note}`;

  return sendViaTelegramBotApiWithPhoto(text, payload.photoUrl || null, payload.driverTelegramChatId);
};

