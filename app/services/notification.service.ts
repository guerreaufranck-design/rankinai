import { prisma } from "~/db.server";

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface Notification {
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  actionLabel?: string;
}

export class NotificationService {
  static async createAlert(
    shopId: string,
    notification: Notification & { productId?: string }
  ) {
    const severity = notification.type === 'error' ? 'HIGH' : 
                     notification.type === 'warning' ? 'MEDIUM' : 'LOW';
    
    return await prisma.alert.create({
      data: {
        shopId,
        productId: notification.productId,
        type: notification.type.toUpperCase(),
        severity,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel
      }
    });
  }
  
  static async checkCriticalAlerts(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId }
    });
    
    if (!shop) return;
    
    // Check low credits
    if (shop.credits <= 5 && shop.credits > 0) {
      await this.createAlert(shopId, {
        title: 'Credits Running Low',
        message: `You have only ${shop.credits} credits remaining. Upgrade your plan to continue scanning.`,
        type: 'warning',
        actionUrl: '/app/pricing',
        actionLabel: 'Upgrade Plan'
      });
    }
    
    // Check zero credits
    if (shop.credits === 0) {
      await this.createAlert(shopId, {
        title: 'No Credits Remaining',
        message: 'You have used all your credits. Upgrade now to continue using RankInAI.',
        type: 'error',
        actionUrl: '/app/pricing',
        actionLabel: 'Upgrade Now'
      });
    }
  }
  
  static async checkProductAlerts(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) return;
    
    // Check citation rate drop
    const recentScans = await prisma.scan.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (recentScans.length >= 5) {
      const recentCitationRate = recentScans.filter(s => s.isCited).length / recentScans.length * 100;
      const drop = product.citationRate - recentCitationRate;
      
      if (drop > 15) {
        await this.createAlert(product.shopId, {
          title: 'Citation Rate Dropping',
          message: `${product.title} citation rate has dropped by ${drop.toFixed(1)}%. Consider updating your product.`,
          type: 'warning',
          productId,
          actionUrl: `/app/products/${productId}`,
          actionLabel: 'View Product'
        });
      }
    }
  }
}
