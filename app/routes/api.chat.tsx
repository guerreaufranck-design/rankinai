import type { ActionFunctionArgs } from "~/utils/response";
import { json } from "~/utils/response";
import { authenticate } from "~/shopify.server";
import { chatService } from "~/services/chat.server";
import { corsHeaders } from "~/utils/cors.server";

/**
 * Route API pour le chat avec Gemini
 * POST /api/chat
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Authentifier la requête Shopify
    const { session, admin } = await authenticate.admin(request);
    
    if (!session) {
      return json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parser le body de la requête
    const body = await request.json();
    const { message, sessionId, context } = body;

    // Validation des paramètres
    if (!message || typeof message !== 'string') {
      return json(
        { error: "Message is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return json(
        { error: "Session ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Limiter la longueur du message
    if (message.length > 1000) {
      return json(
        { error: "Message too long (max 1000 characters)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Rate limiting basique (à améliorer avec Redis en production)
    const rateLimitKey = `chat_${session.shop}`;
    if (await isRateLimited(rateLimitKey)) {
      return json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: corsHeaders }
      );
    }

    // Traiter le message avec le service de chat
    const response = await chatService.processMessage(
      message,
      sessionId,
      {
        shopId: session.shop,
        messages: context?.messages || [],
        metadata: {
          ...context,
          shopDomain: session.shop,
          userId: session.userId
        }
      }
    );

    // Retourner la réponse
    return json(
      {
        success: true,
        response: response.response,
        intent: response.intent,
        suggestedActions: response.suggestedActions,
        metadata: response.metadata
      },
      { 
        status: 200, 
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error("Chat API error:", error);
    
    // Gestion des erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('GEMINI_API_KEY')) {
        return json(
          { error: "AI service not configured" },
          { status: 503, headers: corsHeaders }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return json(
          { error: "AI service rate limit exceeded" },
          { status: 429, headers: corsHeaders }
        );
      }
    }

    // Erreur générique
    return json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET non supporté pour cette route
 */
export async function loader() {
  return json(
    { error: "Method not allowed" },
    { status: 405, headers: corsHeaders }
  );
}

/**
 * Rate limiting simple en mémoire
 * En production, utiliser Redis/Upstash
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function isRateLimited(key: string): Promise<boolean> {
  const now = Date.now();
  const limit = 30; // 30 requêtes
  const window = 60 * 1000; // par minute

  let record = rateLimitStore.get(key);

  // Nettoyer les anciens enregistrements
  if (record && now > record.resetTime) {
    record = undefined;
  }

  if (!record) {
    record = {
      count: 1,
      resetTime: now + window
    };
    rateLimitStore.set(key, record);
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  rateLimitStore.set(key, record);
  return false;
}

// Nettoyer le store toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}