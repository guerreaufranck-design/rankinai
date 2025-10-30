import { prisma } from "~/db.server";
import { NotificationService } from "./notification.service";

export class CronService {
  // Run every day at midnight
  static async dailyTasks() {
    console.log("Running daily tasks...");
    
    // Check for products not scanned in 30+ days
    const staleProducts = await prisma.product.findMany({
      where: {
        OR: [
          { lastScanAt: null },
          { lastScanAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        ]
      }
    });
    
    for (const product of staleProducts) {
      await NotificationService.createAlert(product.shopId, {
        title: 'Product Needs Scanning',
        message: `${product.title} hasn't been scanned in over 30 days.`,
        type: 'info',
        productId: product.id,
        actionUrl: `/app/products/${product.id}`,
        actionLabel: 'Scan Now'
      });
    }
  }
  
  // Run every month on the 1st
  static async monthlyTasks() {
    console.log("Running monthly tasks...");
    
    // Recharge credits for paid plans
    const paidShops = await prisma.shop.findMany({
      where: {
        plan: { in: ['STARTER', 'GROWTH', 'PRO'] },
        isInstalled: true
      }
    });
    
    for (const shop of paidShops) {
      let newCredits = 0;
      switch (shop.plan) {
        case 'STARTER': newCredits = 100; break;
        case 'GROWTH': newCredits = 500; break;
        case 'PRO': newCredits = 2000; break;
      }
      
      await prisma.shop.update({
        where: { id: shop.id },
        data: {
          credits: newCredits,
          billingCycleStart: new Date(),
          billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      
      await NotificationService.createAlert(shop.id, {
        title: 'Credits Recharged',
        message: `Your monthly credits have been recharged. You now have ${newCredits} credits.`,
        type: 'success'
      });
    }
  }
}
