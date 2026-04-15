/**
 * 📦 Public Tracking API — Cloudflare Pages Function
 * 
 * GET /api/track?code=CD2604-01
 * 
 * Uses Firebase REST API (Firestore v1) to query trips by trip_code.
 * Returns ONLY safe public fields — no revenue, no driver phone, no internal notes.
 * 
 * NO AUTHENTICATION REQUIRED for the caller.
 * Server authenticates to Firebase using service account.
 */

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=30', // Cache 30s to reduce Firestore reads
};

export const onRequestOptions = async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
};

/**
 * Get a Google access token using service account credentials
 */
async function getAccessToken(env: any): Promise<string> {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || '{}');
    const now = Math.floor(Date.now() / 1000);
    
    // Create JWT header
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    
    // Create JWT claims
    const claims = btoa(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }));

    // Sign JWT with private key
    const signInput = `${header}.${claims}`;
    
    // Import the private key
    const pemContents = serviceAccount.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\n/g, '');
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(signInput)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const headerB64 = header.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const claimsB64 = claims.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const jwt = `${headerB64}.${claimsB64}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData: any = await tokenRes.json();
    return tokenData.access_token;
}

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

        // Use Firebase API key for simple read (no auth needed for this approach)
        const projectId = env.FIREBASE_PROJECT_ID || 'fleetpro-app';
        const apiKey = env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || '';

        // Method 1: Try with service account (full access)
        let accessToken = '';
        try {
            if (env.FIREBASE_SERVICE_ACCOUNT) {
                accessToken = await getAccessToken(env);
            }
        } catch (e) {
            console.warn('[TrackAPI] Service account auth failed, trying API key');
        }

        // Firestore REST API: runQuery
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
        
        const queryBody = {
            structuredQuery: {
                from: [{ collectionId: 'trips' }],
                where: {
                    fieldFilter: {
                        field: { fieldPath: 'trip_code' },
                        op: 'EQUAL',
                        value: { stringValue: tripCode },
                    },
                },
                limit: 1,
            },
        };

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        } else if (apiKey) {
            // Fallback: use API key (subject to Firestore rules)
        }

        const queryUrl = accessToken 
            ? firestoreUrl 
            : `${firestoreUrl}?key=${apiKey}`;

        const res = await fetch(queryUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(queryBody),
        });

        const results: any[] = await res.json();

        // Check if we got results
        if (!Array.isArray(results) || results.length === 0 || !results[0]?.document) {
            return new Response(JSON.stringify({
                ok: false,
                error: 'Không tìm thấy vận đơn với mã này.',
            }), { status: 404, headers: corsHeaders });
        }

        const fields = results[0].document.fields || {};

        // Helper to extract Firestore field values
        const getStr = (f: any) => f?.stringValue || f?.referenceValue || '';
        const getNum = (f: any) => Number(f?.doubleValue || f?.integerValue || 0);
        const getMap = (f: any) => f?.mapValue?.fields || {};

        const route = getMap(fields.route);
        const vehicle = getMap(fields.vehicle);

        // SECURITY: Only expose safe public fields
        const publicData = {
            trip_code: getStr(fields.trip_code) || tripCode,
            status: getStr(fields.status) || 'draft',
            origin: getStr(fields.origin) || getStr(route.origin) || 'Đang cập nhật',
            destination: getStr(fields.destination) || getStr(route.destination) || 'Đang cập nhật',
            departure_date: getStr(fields.departure_date) || getStr(fields.created_at) || null,
            arrival_date: getStr(fields.arrival_date) || getStr(fields.completed_at) || null,
            vehicle_plate: getStr(vehicle.license_plate) || getStr(fields.vehicle_plate) || null,
            route_name: getStr(route.route_name) || getStr(fields.route_name) || null,
            distance_km: getNum(fields.distance_km) || getNum(route.distance_km) || null,
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
