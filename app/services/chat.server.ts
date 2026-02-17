import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '~/db.server';
import type { Shop, Product, Scan } from '@prisma/client';

// Configuration Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1024,
    topK: 40,
    topP: 0.95,
  }
});

interface ChatContext {
  shopId: string;
  messages?: any[];
  metadata?: Record<string, any>;
}

interface ChatResponse {
  response: string;
  intent?: string;
  suggestedActions?: string[];
  metadata?: Record<string, any>;
}

export class ChatService {
  private sessionCache = new Map<string, any>();

  /**
   * Traiter un message avec Gemini
   */
  async processMessage(
    message: string,
    sessionId: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    try {
      // Récupérer le contexte enrichi
      const enrichedContext = await this.getEnrichedContext(context.shopId);
      
      // Détecter l'intention
      const intent = this.detectIntent(message);
      
      // Construire le prompt système
      const systemPrompt = this.buildSystemPrompt(enrichedContext, intent);
      
      // Historique de conversation
      const history = context.messages || [];
      
      // Créer le chat Gemini
      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          },
          {
            role: 'model',
            parts: [{ text: "Compris ! Je suis l'assistant IA de RankInAI, prêt à aider avec l'optimisation pour les citations IA." }]
          },
          ...history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }))
        ],
      });

      // Envoyer le message
      const result = await chat.sendMessage(message);
      const response = result.response.text();

      // Générer des actions suggérées
      const suggestedActions = await this.generateSuggestedActions(intent, enrichedContext);

      // Enregistrer l'événement
      await this.logChatInteraction(sessionId, context.shopId, message, response, intent);

      return {
        response,
        intent,
        suggestedActions,
        metadata: {
          shopStats: enrichedContext.stats,
          contextUsed: true
        }
      };

    } catch (error) {
      console.error('Chat processing error:', error);
      return {
        response: "Je rencontre un problème technique. Pouvez-vous reformuler votre question ?",
        intent: 'error',
        suggestedActions: ["Réessayer", "Contacter le support"]
      };
    }
  }

  /**
   * Récupérer le contexte enrichi depuis la base de données
   */
  private async getEnrichedContext(shopId: string) {
    try {
      // Données du shop
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        include: {
          products: {
            take: 5,
            orderBy: { updatedAt: 'desc' }
          },
          scans: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          optimizations: {
            take: 5,
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!shop) {
        return this.getDefaultContext();
      }

      // Statistiques agrégées
      const stats = await this.calculateShopStats(shopId);

      return {
        shop: {
          domain: shop.domain,
          plan: shop.plan,
          credits: shop.credits,
          createdAt: shop.createdAt
        },
        products: shop.products.map(p => ({
          id: p.id,
          title: p.title,
          citationScore: p.citationScore,
          lastScanned: p.lastScannedAt
        })),
        recentScans: shop.scans.map(s => ({
          id: s.id,
          productTitle: s.productId,
          platform: s.platform,
          cited: s.cited,
          position: s.position,
          createdAt: s.createdAt
        })),
        optimizations: shop.optimizations.map(o => ({
          id: o.id,
          type: o.type,
          status: o.status,
          improvement: o.metadata
        })),
        stats
      };

    } catch (error) {
      console.error('Error fetching context:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Calculer les statistiques du shop
   */
  private async calculateShopStats(shopId: string) {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      totalScans,
      citedProducts,
      recentScans,
      avgScore
    ] = await Promise.all([
      prisma.product.count({ where: { shopId } }),
      prisma.scan.count({ where: { shopId } }),
      prisma.product.count({ 
        where: { 
          shopId,
          citationScore: { gt: 0 }
        } 
      }),
      prisma.scan.count({
        where: {
          shopId,
          createdAt: { gte: last7Days }
        }
      }),
      prisma.product.aggregate({
        where: { shopId },
        _avg: { citationScore: true }
      })
    ]);

    const citationRate = totalProducts > 0 ? (citedProducts / totalProducts) * 100 : 0;

    return {
      totalProducts,
      totalScans,
      citedProducts,
      recentScans,
      citationRate: Math.round(citationRate),
      avgScore: Math.round(avgScore._avg.citationScore || 0),
      trend: this.calculateTrend(recentScans, totalScans)
    };
  }

  /**
   * Détecter l'intention de l'utilisateur
   */
  private detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    const intents = {
      'scan': ['scan', 'analyser', 'vérifier', 'citation', 'cité'],
      'optimize': ['optimiser', 'améliorer', 'augmenter', 'performance'],
      'credits': ['crédit', 'solde', 'plan', 'abonnement', 'forfait'],
      'help': ['aide', 'comment', 'guide', 'tutoriel', 'expliquer'],
      'stats': ['statistique', 'résultat', 'rapport', 'données', 'chiffres'],
      'product': ['produit', 'article', 'fiche', 'catalogue'],
      'greeting': ['bonjour', 'salut', 'hello', 'bonsoir'],
      'thanks': ['merci', 'parfait', 'super', 'génial']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return intent;
      }
    }

    return 'general';
  }

  /**
   * Construire le prompt système pour Gemini
   */
  private buildSystemPrompt(context: any, intent: string): string {
    const basePrompt = `Tu es l'assistant IA expert de RankInAI, une application Shopify qui aide les marchands à optimiser leurs produits pour être cités par les assistants IA comme ChatGPT, Claude et Gemini.

CONTEXTE DU MARCHAND:
- Boutique: ${context.shop?.domain || 'Non configurée'}
- Plan actuel: ${context.shop?.plan || 'Trial'}
- Crédits disponibles: ${context.shop?.credits || 0}
- Produits: ${context.stats?.totalProducts || 0} au total
- Taux de citation: ${context.stats?.citationRate || 0}%
- Score moyen: ${context.stats?.avgScore || 0}/100

CAPACITÉS DE RANKINAI:
1. Scanner les produits sur ChatGPT, Claude, Gemini, Perplexity
2. Analyser les citations et positions dans les réponses IA
3. Optimiser les fiches produits (titre, description, attributs)
4. Suivre l'évolution des performances
5. Alertes automatiques sur les changements

STYLE DE RÉPONSE:
- Sois concis et orienté action (max 3-4 phrases)
- Utilise des émojis pertinents
- Propose toujours une action concrète
- Sois encourageant et positif
- Utilise le tutoiement

RÈGLES:
- Ne jamais inventer de données
- Toujours baser les conseils sur les vraies capacités de l'app
- Proposer d'upgrader le plan si besoin de plus de crédits
- Rediriger vers les bonnes sections de l'app`;

    // Ajouter des instructions spécifiques selon l'intention
    const intentPrompts = {
      'scan': '\n\nL\'utilisateur veut scanner des produits. Guide-le vers la section Scans et explique le processus.',
      'optimize': '\n\nL\'utilisateur veut optimiser ses produits. Explique l\'importance des métadonnées et propose de commencer par ses best-sellers.',
      'credits': '\n\nL\'utilisateur s\'intéresse aux crédits. Explique le système et les différents plans disponibles.',
      'stats': '\n\nL\'utilisateur veut voir ses statistiques. Présente les données de manière claire et actionable.',
      'help': '\n\nL\'utilisateur a besoin d\'aide. Sois pédagogue et guide-le étape par étape.'
    };

    return basePrompt + (intentPrompts[intent] || '');
  }

  /**
   * Générer des actions suggérées
   */
  private async generateSuggestedActions(intent: string, context: any): Promise<string[]> {
    const actions: Record<string, string[]> = {
      'scan': [
        "🔍 Lancer un scan maintenant",
        "📊 Voir les derniers résultats",
        "⚙️ Configurer les alertes"
      ],
      'optimize': [
        "✏️ Optimiser mes best-sellers",
        "📝 Voir les recommandations",
        "🎯 Analyser la concurrence"
      ],
      'credits': [
        "💳 Voir les plans disponibles",
        "📈 Consulter ma consommation",
        "🎁 Obtenir des crédits bonus"
      ],
      'stats': [
        "📊 Dashboard complet",
        "📈 Évolution sur 30 jours",
        "🏆 Top produits cités"
      ],
      'help': [
        "📚 Guide de démarrage",
        "🎥 Tutoriel vidéo",
        "💬 Contacter le support"
      ],
      'general': [
        "🔍 Scanner mes produits",
        "📊 Voir mes stats",
        "💡 Obtenir des conseils"
      ]
    };

    // Si peu de produits, suggérer l'import
    if (context.stats?.totalProducts < 5) {
      return [
        "📦 Importer mes produits",
        ...actions[intent].slice(0, 2)
      ];
    }

    // Si taux de citation faible, suggérer l'optimisation
    if (context.stats?.citationRate < 20) {
      return [
        "🚀 Optimiser pour les IA",
        ...actions[intent].slice(0, 2)
      ];
    }

    return actions[intent] || actions['general'];
  }

  /**
   * Enregistrer l'interaction dans la base de données
   */
  private async logChatInteraction(
    sessionId: string,
    shopId: string,
    message: string,
    response: string,
    intent: string
  ) {
    try {
      await prisma.event.create({
        data: {
          shopId,
          type: 'CHAT_SESSION',
          metadata: {
            sessionId,
            message: message.substring(0, 500), // Limiter la taille
            response: response.substring(0, 500),
            intent,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error logging chat interaction:', error);
    }
  }

  /**
   * Calculer la tendance
   */
  private calculateTrend(recent: number, total: number): string {
    if (total === 0) return 'new';
    const recentRate = (recent / total) * 100;
    if (recentRate > 20) return 'up';
    if (recentRate < 5) return 'down';
    return 'stable';
  }

  /**
   * Contexte par défaut
   */
  private getDefaultContext() {
    return {
      shop: {
        domain: 'demo-store',
        plan: 'TRIAL',
        credits: 25,
        createdAt: new Date()
      },
      products: [],
      recentScans: [],
      optimizations: [],
      stats: {
        totalProducts: 0,
        totalScans: 0,
        citedProducts: 0,
        recentScans: 0,
        citationRate: 0,
        avgScore: 0,
        trend: 'new'
      }
    };
  }

  /**
   * Nettoyer le cache des sessions
   */
  cleanupSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, data] of this.sessionCache.entries()) {
      if (now - data.lastActivity > maxAge) {
        this.sessionCache.delete(sessionId);
      }
    }
  }
}

// Exporter une instance unique
export const chatService = new ChatService();

// Nettoyer les sessions toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    chatService.cleanupSessions();
  }, 5 * 60 * 1000);
}