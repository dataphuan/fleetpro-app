/**
 * 📦 Public Tracking API — Cloudflare Pages Function
 * 
 * GET /api/track?code=CD2604-01
 * 
 * Uses Firebase REST API with API key to query trips.
 * The Firestore rule for trips allows public read when queried by trip_code only.
 * Returns ONLY safe public fields.
 */

const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=30',
};

export const onRequestOptions = async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestGet = async (context: any) => {
    const { request, env } = context;

    try {
        const url = new URL(request.url);
        const tripCode = url.searchParams.get('code')?.trim().toUpperCase();

        if (!tripCode || tripCode.length < 3 || tripCode.length > 30) {
            return new Response(JSON.stringify({
                ok: false,
                error: 'Vui lòng cung cấp mã vận đơn hợp lệ.',
            }), { status: 400, headers: corsHeaders });
        }

        const projectId = env.FIREBASE_PROJECT_ID || 'fleetpro-app';
        const apiKey = env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || 'AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4';

        // Firestore REST API: runQuery with API key
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

        const queryBody = {
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
                select: {
                    fields: [
                        { fieldPath: 'trip_code' },
                        { fieldPath: 'status' },
                        { fieldPath: 'origin' },
                        { fieldPath: 'destination' },
                        { fieldPath: 'departure_date' },
                        { fieldPath: 'arrival_date' },
                        { fieldPath: 'vehicle_plate' },
                        { fieldPath: 'route_name' },
                        { fieldPath: 'distance_km' },
                        { fieldPath: 'updated_at' },
                        { fieldPath: 'created_at' },
                        { fieldPath: 'completed_at' },
                        { fieldPath: 'route' },
                        { fieldPath: 'vehicle' },
                    ],
                },
            },
        };

        const res = await fetch(firestoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryBody),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('[TrackAPI] Firestore error:', res.status, errText);
            return new Response(JSON.stringify({
                ok: false,
                error: 'Không thể truy vấn. Vui lòng thử lại.',
                debug: res.status,
            }), { status: 502, headers: corsHeaders });
        }

        const results: any[] = await res.json();

        if (!Array.isArray(results) || results.length === 0 || !results[0]?.document) {
            return new Response(JSON.stringify({
                ok: false,
                error: 'Không tìm thấy vận đơn với mã này.',
            }), { status: 404, headers: corsHeaders });
        }

        const fields = results[0].document.fields || {};

        // Extract Firestore values
        const getStr = (f: any): string => f?.stringValue || '';
        const getNum = (f: any): number => Number(f?.doubleValue || f?.integerValue || 0);
        const getMap = (f: any): any => f?.mapValue?.fields || {};

        const route = getMap(fields.route);
        const vehicle = getMap(fields.vehicle);

        const publicData = {
            trip_code: getStr(fields.trip_code) || tripCode,
            status: getStr(fields.status) || 'draft',
            origin: getStr(fields.origin) || getStr(route?.origin) || 'Đang cập nhật',
            destination: getStr(fields.destination) || getStr(route?.destination) || 'Đang cập nhật',
            departure_date: getStr(fields.departure_date) || getStr(fields.created_at) || null,
            arrival_date: getStr(fields.arrival_date) || getStr(fields.completed_at) || null,
            vehicle_plate: getStr(vehicle?.license_plate) || getStr(fields.vehicle_plate) || null,
            route_name: getStr(route?.route_name) || getStr(fields.route_name) || null,
            distance_km: getNum(fields.distance_km) || getNum(route?.distance_km) || null,
            updated_at: getStr(fields.updated_at) || getStr(fields.created_at) || null,
        };

        return new Response(JSON.stringify({
            ok: true,
            data: publicData,
        }), { headers: corsHeaders });

    } catch (error: any) {
        console.error('[TrackAPI] Error:', error);
        return new Response(JSON.stringify({
            ok: false,
            error: 'Lỗi server. Vui lòng thử lại.',
        }), { status: 500, headers: corsHeaders });
    }
};
