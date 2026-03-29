// Using 'any' for context to bypass local TypeScript errors while on Cloudflare
export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const payloadStr = formData.get('payload') as string;
    
    if (!payloadStr) {
      return new Response(JSON.stringify({ status: 'error', message: 'Missing payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(payloadStr);
    const { tenantId, plan, redirectUrl } = payload;

    // MoMo API endpoint (Test environment)
    // Production: https://payment.momo.vn/v2/gateway/api/create
    const momoEndpoint = "https://test-payment.momo.vn/v2/gateway/api/create";

    const requestId = Date.now().toString();
    const orderId = `FLEETPRO_${tenantId}_${requestId}`;
    const orderInfo = `Thanh toán gói ${plan.toUpperCase()} cho FleetPro`;
    const amount = plan === 'basic' ? "499000" : "999000"; // Sample pricing
    const requestType = "captureWallet";
    const extraData = ""; // Can pass tenantId here if needed

    // Signature calculation
    const rawSignature = `accessKey=${env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${redirectUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${env.MOMO_PARTNER_CODE}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.MOMO_SECRET_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawSignature)
    );
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const requestBody = {
      partnerCode: env.MOMO_PARTNER_CODE,
      partnerName: "FleetPro Online",
      storeId: "FleetPro",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl: redirectUrl, // In real world, use a webhook receiver
      lang: "vi",
      requestType,
      autoCapture: true,
      extraData,
      signature
    };

    const momoResponse = await fetch(momoEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const result = await momoResponse.json() as any;

    if (result.payUrl) {
      return new Response(JSON.stringify({ status: 'success', payUrl: result.payUrl }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.error("MoMo Error:", result);
      return new Response(JSON.stringify({ status: 'error', message: result.message || "MoMo Error" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
