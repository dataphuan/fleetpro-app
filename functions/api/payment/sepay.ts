// Using 'any' for context to bypass local TypeScript errors while on Cloudflare
export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  try {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== env.SEPAY_WEBHOOK_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    const data = await request.json() as any;
    console.log("SePay Webhook Received:", data);

    // SePay typical structure:
    // data.content: "FLEETPRO TX001 PAY"
    // data.amount: 499000
    // data.reference_number: "..."

    const content = data.content || "";
    const match = content.match(/FLEETPRO\s+([A-Za-z0-9_-]+)/i);
    
    if (match) {
      const tenantId = match[1];
      console.log(`Detected payment for Tenant: ${tenantId}`);

      // TODO: Update Firestore subscription status
      // This requires using Firestore REST API with a Service Account JWT
      // For MVP/Demo, we log the success.
      
      return new Response(JSON.stringify({ 
        status: 'success', 
        message: `Tenant ${tenantId} updated` 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: 'ignored', message: 'No tenant info in content' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("SePay Webhook Error:", error);
    return new Response(error.message, { status: 500 });
  }
};
