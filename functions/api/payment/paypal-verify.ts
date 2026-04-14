// PayPal Verification Endpoint for Cloudflare Pages
export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  try {
    const { orderID, tenantId } = await request.json();

    if (!orderID || !tenantId) {
      return new Response(JSON.stringify({ status: 'error', message: 'Missing orderID or tenantId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientId = env.PAYPAL_CLIENT_ID;
    const clientSecret = env.PAYPAL_CLIENT_SECRET;
    const apiUrl = env.PAYPAL_API_URL || "https://api-m.paypal.com";

    // 1. Get Access Token from PayPal
    const auth = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("PayPal Auth Error:", errorText);
      throw new Error("Failed to authenticate with PayPal");
    }

    const { access_token } = await tokenResponse.json() as any;

    // 2. Verify Order Status
    const orderResponse = await fetch(`${apiUrl}/v2/checkout/orders/${orderID}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("PayPal Order Verification Error:", errorText);
      throw new Error("Failed to verify order with PayPal");
    }

    const orderData = await orderResponse.json() as any;

    // 3. Security Check: Status must be COMPLETED
    if (orderData.status !== "COMPLETED") {
      console.warn(`PayPal Verification: Order ${orderID} status is ${orderData.status}`);
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: `Order status is ${orderData.status}. Not completed yet.` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Update Firestore Subscription securely
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    
    // Bypass Firestore Security Rules using our internal secret
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
      console.error("PayPal Webhook: Firestore Update Failed", errText);
      throw new Error("Success at PayPal, but failed to update local system. Please contact support.");
    }

    // Cleanup: Remove the internal secret field
    const cleanupUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/company_settings/${tenantId}?updateMask=_webhook_secret`;
    await fetch(cleanupUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { _webhook_secret: { stringValue: "" } } })
    }).catch(console.warn);

    console.log(`PayPal Webhook: Successfully upgraded tenant ${tenantId} via Order ${orderID}`);

    return new Response(JSON.stringify({ status: 'success', message: 'Subscription upgraded successfully' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("PayPal Verify Endpoint Error:", error);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
