// Public Tracking API — GET /api/track?code=CD2604-01

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers });
}

export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const tripCode = (url.searchParams.get('code') || '').trim().toUpperCase();

        if (!tripCode || tripCode.length < 3 || tripCode.length > 30) {
            return new Response(JSON.stringify({
                ok: false,
                error: 'Vui lòng cung cấp mã vận đơn hợp lệ.',
            }), { status: 400, headers });
        }

        const projectId = 'fleetpro-app';
        const apiKey = context.env.FIREBASE_API_KEY || 'AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4';

        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

        const res = await fetch(firestoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: 'public_tracking' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'trip_code' },
                            op: 'EQUAL',
                            value: { stringValue: tripCode },
                        },
                    },
                    limit: 1,
                },
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            return new Response(JSON.stringify({
                ok: false,
                error: 'Lỗi truy vấn dữ liệu.',
                debug: errText.substring(0, 200),
            }), { status: 502, headers });
        }

        const results = await res.json();

        if (!Array.isArray(results) || !results[0] || !results[0].document) {
            return new Response(JSON.stringify({
                ok: false,
                error: 'Không tìm thấy vận đơn với mã này.',
            }), { status: 404, headers });
        }

        const fields = results[0].document.fields || {};
        const getStr = (f) => (f && f.stringValue) || '';
        const getNum = (f) => Number((f && (f.doubleValue || f.integerValue)) || 0);

        const publicData = {
            trip_code: getStr(fields.trip_code) || tripCode,
            status: getStr(fields.status) || 'draft',
            origin: getStr(fields.origin) || 'Đang cập nhật',
            destination: getStr(fields.destination) || 'Đang cập nhật',
            departure_date: getStr(fields.departure_date) || getStr(fields.created_at) || null,
            arrival_date: getStr(fields.arrival_date) || null,
            vehicle_plate: getStr(fields.vehicle_plate) || null,
            route_name: getStr(fields.route_name) || null,
            distance_km: getNum(fields.distance_km) || null,
            updated_at: getStr(fields.updated_at) || null,
        };

        return new Response(JSON.stringify({ ok: true, data: publicData }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            ok: false,
            error: 'Lỗi server: ' + (error.message || 'Unknown'),
        }), { status: 500, headers });
    }
}
