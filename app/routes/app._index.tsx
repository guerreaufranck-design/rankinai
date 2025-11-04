import type { LoaderFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
    include: {
      Product: {
        select: {
          id: true,
          title: true,
          citationRate: true,
          chatgptRate: true,
          geminiRate: true,
          totalScans: true,
        },
        orderBy: { citationRate: "desc" },
        take: 5,
      },
      Alert: {
        where: { isRead: false },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  if (!shop) {
    return json({
      shop: { shopName: "Store", credits: 0, maxCredits: 25, Product: [], Alert: [] },
      stats: { totalProducts: 0, avgCitationRate: 0, needsAttention: 0 },
    });
  }

  const totalProducts = shop.Product.length;
  const avgCitationRate =
    totalProducts > 0
      ? Math.round(shop.Product.reduce((sum, p) => sum + p.citationRate, 0) / totalProducts)
      : 0;
  const needsAttention = shop.Product.filter((p) => p.citationRate < 20).length;

  return json({
    shop,
    stats: { totalProducts, avgCitationRate, needsAttention },
  });
};

export default function Index() {
  const { shop, stats } = useLoaderData<typeof loader>();
  const creditPercentage = (shop.credits / shop.maxCredits) * 100;

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f6f6f7',
      minHeight: '100vh',
      padding: '24px'
    }}>
      {/* HEADER */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 8px 0', color: '#202223' }}>
          RankInAI Dashboard
        </h1>
        <p style={{ fontSize: '16px', color: '#6d7175', margin: 0 }}>
          Welcome back, {shop.shopName}! 👋
        </p>
      </div>

      {/* ALERTS BANNER */}
      {shop.Alert && shop.Alert.length > 0 && (
        <div style={{
          background: '#fff4e6',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <strong style={{ color: '#f57c00' }}>⚠️ {shop.Alert.length} Alert{shop.Alert.length > 1 ? 's' : ''}</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {shop.Alert.map((alert) => (
              <li key={alert.id} style={{ color: '#5f6368' }}>{alert.title}</li>
            ))}
          </ul>
        </div>
      )}

      {/* STATS CARDS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Credits Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#6d7175' }}>💳 Credits</span>
            <span style={{
              background: creditPercentage > 50 ? '#e8f5e9' : creditPercentage > 20 ? '#fff3e0' : '#ffebee',
              color: creditPercentage > 50 ? '#2e7d32' : creditPercentage > 20 ? '#f57c00' : '#c62828',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {shop.credits}/{shop.maxCredits}
            </span>
          </div>
          <div style={{
            background: '#e0e0e0',
            height: '8px',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              background: creditPercentage > 50 ? '#4caf50' : creditPercentage > 20 ? '#ff9800' : '#f44336',
              height: '100%',
              width: `${creditPercentage}%`,
              transition: 'width 0.3s'
            }} />
          </div>
          <p style={{ fontSize: '13px', color: '#6d7175', margin: 0 }}>
            {creditPercentage < 20 ? '⚠️ Running low!' : '✅ All good'}
          </p>
        </div>

        {/* Citation Rate Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#6d7175' }}>📊 Avg Citation Rate</span>
          <h2 style={{ fontSize: '36px', fontWeight: '700', margin: '8px 0', color: '#202223' }}>
            {stats.avgCitationRate}%
          </h2>
          <p style={{ fontSize: '13px', color: '#6d7175', margin: 0 }}>
            {stats.avgCitationRate > 50 ? '🔥 Excellent!' : stats.avgCitationRate > 30 ? '📈 Good' : '📊 Improving'}
          </p>
        </div>

        {/* Products Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#6d7175' }}>📦 Products</span>
          <h2 style={{ fontSize: '36px', fontWeight: '700', margin: '8px 0', color: '#202223' }}>
            {stats.totalProducts}
          </h2>
          <Link to="/app/products" style={{ fontSize: '13px', color: '#2196f3', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        {/* Needs Attention Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#6d7175' }}>⚠️ Needs Attention</span>
          <h2 style={{ fontSize: '36px', fontWeight: '700', margin: '8px 0', color: stats.needsAttention > 0 ? '#f44336' : '#4caf50' }}>
            {stats.needsAttention}
          </h2>
          <p style={{ fontSize: '13px', color: '#6d7175', margin: 0 }}>
            {stats.needsAttention > 0 ? 'products need help' : '🎉 All good!'}
          </p>
        </div>
      </div>

      {/* TOP PERFORMERS */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#202223' }}>
            🏆 Top Performers
          </h2>
          <Link to="/app/products" style={{
            color: '#2196f3',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            View all →
          </Link>
        </div>

        {shop.Product && shop.Product.length > 0 ? (
          <div>
            {shop.Product.map((product, index) => (
              <div key={product.id} style={{
                padding: '16px 0',
                borderBottom: index < shop.Product.length - 1 ? '1px solid #e0e0e0' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                    <span style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#9e9e9e',
                      minWidth: '30px'
                    }}>
                      #{index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 8px 0', color: '#202223' }}>
                        {product.title}
                      </h3>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: '#e3f2fd',
                          color: '#1976d2',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          ChatGPT: {product.chatgptRate}%
                        </span>
                        <span style={{
                          background: '#e8f5e9',
                          color: '#388e3c',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          Gemini: {product.geminiRate}%
                        </span>
                        <span style={{ fontSize: '12px', color: '#9e9e9e' }}>
                          {product.totalScans} scans
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#202223' }}>
                        {product.citationRate}%
                      </div>
                      <div style={{ fontSize: '12px', color: '#9e9e9e' }}>
                        Citation Rate
                      </div>
                    </div>
                    <Link
                      to={`/app/products/${product.id}`}
                      style={{
                        background: '#2196f3',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Optimize
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ color: '#9e9e9e', marginBottom: '16px' }}>No products analyzed yet</p>
            <Link
              to="/app/products"
              style={{
                background: '#2196f3',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-block'
              }}
            >
              Analyze your first product
            </Link>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#202223' }}>
          ⚡ Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/app/products" style={{
            background: '#f5f5f5',
            color: '#202223',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e0e0e0'
          }}>
            📦 View All Products
          </Link>
          <Link to="/app/analytics" style={{
            background: '#f5f5f5',
            color: '#202223',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e0e0e0'
          }}>
            📊 Analytics
          </Link>
          <Link to="/app/assistant" style={{
            background: '#f5f5f5',
            color: '#202223',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e0e0e0'
          }}>
            🤖 AI Assistant
          </Link>
        </div>
      </div>
    </div>
  );
}
