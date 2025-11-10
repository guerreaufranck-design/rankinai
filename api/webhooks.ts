import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const hmacReceived = req.headers['x-shopify-hmac-sha256'] as string;
    const topic = req.headers['x-shopify-topic'] as string;
    const shop = req.headers['x-shopify-shop-domain'] as string;
    
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
      console.error('❌ Missing SHOPIFY_API_SECRET');
      return res.status(500).json({ error: 'Configuration error' });
    }
    
    const hmacCalculated = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');
    
    if (hmacCalculated !== hmacReceived) {
      console.error('❌ Invalid HMAC');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log(`✅ Webhook validated: ${topic} from ${shop}`);
    
    const payload = JSON.parse(body);
    
    switch (topic) {
      case 'customers/data_request':
        console.log('[GDPR] Customer data request:', payload.customer?.email);
        break;
      case 'customers/redact':
        console.log('[GDPR] Customer redact:', payload.customer?.id);
        break;
      case 'shop/redact':
        console.log('[GDPR] Shop redact:', payload.shop_domain);
        break;
      case 'app/uninstalled':
        console.log('[APP] App uninstalled');
        break;
    }
    
    return res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
