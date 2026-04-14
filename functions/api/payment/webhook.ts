// Using 'any' for context to bypass local TypeScript errors while on Cloudflare Edge
export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  try {
    const rawBodyText = await request.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBodyText);
    } catch {
      return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = payload;

    // Verify Signature
    const rawHash = `accessKey=${env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
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
      encoder.encode(rawHash)
    );
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== expectedSignature) {
      console.warn("MOMO WEBHOOK: Invalid Signature", { payload, expectedSignature, rawHash });
      return new Response(JSON.stringify({ status: 'error', message: 'Invalid Signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process successful payment (resultCode 0 = Success)
    if (resultCode === 0) {
      console.log(`MOMO WEBHOOK: Payment success for Order ${orderId}`);
      
      // Extract tenantId from orderId (Format: FLEETPRO_{tenantId}_{requestId})
      // Example: FLEETPRO_internal-tenant-phuan_1713000000000
      const parts = orderId.split('_');
      if (parts.length >= 3 && parts[0] === 'FLEETPRO') {
        const tenantId = parts[1];
        
        // Target plan from the original request (Standardized to 'professional' here or passed via extraData)
        // For SaaS MVP, success equals Professional activation.
        
        const next30Days = new Date();
        next30Days.setDate(next30Days.getDate() + 30); // Extend 30 days
        
        // 🚨 CRITICAL: Bypass Firebase Rules using our isolated internal secret
        const firestoreInternalSecret = env.VITE_INTERNAL_WEBHOOK_SECRET || "FLEETPRO_INTERNAL_HOOK_9a8b7c6d5e4f3g2h1";
        const projectId = env.VITE_FIREBASE_PROJECT_ID || "fleetpro-app";
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/company_settings/${tenantId}?updateMask=subscription.plan&updateMask=subscription.status&updateMask=subscription.next_billing_date&updateMask=_webhook_secret`;

        const updatePayload = {
          fields: {
            subscription: {
              mapValue: {
                fields: {
                  plan: { stringValue: "professional" },
                  status: { stringValue: "active" },
                  next_billing_date: { stringValue: next30Days.toISOString() }
                }
              }
            },
            _webhook_secret: { stringValue: firestoreInternalSecret }
          }
        };

        const updateRes = await fetch(firestoreUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload)
        });

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          console.error("MOMO WEBHOOK: Firestore Update Failed", errText);
          // Return 204 to MoMo so it doesn't retry infinitely, but log the error
        } else {
          console.log(`MOMO WEBHOOK: Successfully upgraded tenant ${tenantId} to Professional`);
          
          // Cleanup phase: Remove the secret field so it doesn't linger dangerously.
          // Optional, but best practice.
          const cleanupUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/company_settings/${tenantId}?updateMask=_webhook_secret`;
          await fetch(cleanupUrl, {
             method: "PATCH",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ fields: { _webhook_secret: { stringValue: "" } } })
          }).catch(console.warn);
        }
      }
    } else {
      console.log(`MOMO WEBHOOK: Payment failed or cancelled for Order ${orderId}. Code: ${resultCode}`);
    }

    // Always respond 204 No Content for standard IPN success received
    return new Response(null, { status: 204 });

  } catch (error: any) {
    console.error("MOMO WEBHOOK: Internal Server Error:", error);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
