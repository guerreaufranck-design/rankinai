import { useState, useEffect } from "react";
import { Link, useLocation, useOutletContext } from "react-router";

interface OutletContext {
  credits: number;
  maxCredits: number;
}

const APP_HANDLE = "rankinai-ai-seo-9x7k";

export default function AppHeader() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { credits = 0, maxCredits = 25 } = useOutletContext<OutletContext>() || {};

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { path: "/app", label: "🏠 Dashboard", exact: true },
    { path: "/app/products", label: "📦 Products" },
    { path: "/app/optimize", label: "✨ Optimize" },
    { path: "/app/analyze", label: "📊 Analytics" },
    { path: "/app/settings", label: "⚙️ Settings" },
    { path: "/app/help", label: "❓ Help" },
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleUpgradeClick = () => {
    const shopDomain = window.location.hostname.includes('myshopify') 
      ? window.location.hostname.replace('.myshopify.com', '')
      : new URLSearchParams(window.location.search).get('shop')?.replace('.myshopify.com', '') || '';
    
    if (shopDomain) {
      window.open(`https://admin.shopify.com/store/${shopDomain}/charges/${APP_HANDLE}/pricing_plans`, "_top");
    }
  };

  return (
    <>
      <header style={{
        background: "white",
        borderBottom: "1px solid #e3e3e3",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: isMobile ? "12px 16px" : "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isMobile && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "8px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "32px",
                  height: "32px",
                  marginLeft: "-8px",
                }}
                aria-label="Toggle menu"
              >
                <span style={{
                  display: "block",
                  width: "20px",
                  height: "2px",
                  backgroundColor: "#202223",
                  marginBottom: "4px",
                  transition: "all 0.3s ease",
                  transform: isMenuOpen ? "rotate(45deg) translateY(6px)" : "none",
                }} />
                <span style={{
                  display: "block",
                  width: "20px",
                  height: "2px",
                  backgroundColor: "#202223",
                  marginBottom: "4px",
                  transition: "all 0.3s ease",
                  opacity: isMenuOpen ? 0 : 1,
                }} />
                <span style={{
                  display: "block",
                  width: "20px",
                  height: "2px",
                  backgroundColor: "#202223",
                  transition: "all 0.3s ease",
                  transform: isMenuOpen ? "rotate(-45deg) translateY(-6px)" : "none",
                }} />
              </button>
            )}

            <Link 
              to="/app" 
              style={{ 
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div style={{
                width: isMobile ? "32px" : "40px",
                height: isMobile ? "32px" : "40px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? "18px" : "20px",
                flexShrink: 0,
              }}>
                🤖
              </div>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: isMobile ? "18px" : "20px",
                  fontWeight: "600", 
                  color: "#202223" 
                }}>
                  RankInAI
                </h1>
                {!isMobile && (
                  <p style={{ 
                    margin: 0, 
                    fontSize: "12px", 
                    color: "#6d7175" 
                  }}>
                    AI Citation Optimizer
                  </p>
                )}
              </div>
            </Link>
          </div>

          {!isMobile && (
            <nav style={{ display: "flex", gap: "8px" }}>
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: isActive(link.path, link.exact) ? "#2196f3" : "#6d7175",
                    background: isActive(link.path, link.exact) ? "#e3f2fd" : "transparent",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(link.path, link.exact)) {
                      e.currentTarget.style.background = "#f5f5f5";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(link.path, link.exact)) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              padding: isMobile ? "6px 10px" : "8px 16px",
              background: "#f0f0f0",
              borderRadius: "8px",
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: "600",
              color: "#202223",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              💳 <span style={{ color: "#2196f3" }}>{credits}</span> credits
            </div>

            {!isMobile && (
              <button
                onClick={handleUpgradeClick}
                style={{
                  padding: "8px 16px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Upgrade Plan
              </button>
            )}
          </div>
        </div>

        {isMobile && (
          <div style={{
            maxHeight: isMenuOpen ? "400px" : "0",
            overflow: "hidden",
            transition: "max-height 0.3s ease-in-out",
            borderTop: isMenuOpen ? "1px solid #e3e3e3" : "none",
          }}>
            <nav style={{
              padding: isMenuOpen ? "12px 16px" : "0 16px",
              background: "white",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}>
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "15px",
                    fontWeight: "500",
                    color: isActive(link.path, link.exact) ? "#2196f3" : "#6d7175",
                    background: isActive(link.path, link.exact) ? "#e3f2fd" : "transparent",
                    transition: "all 0.2s ease",
                    display: "block",
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              <div style={{ padding: "12px 16px 8px" }}>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleUpgradeClick();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  Upgrade Plan
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {isMobile && isMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.3)",
            zIndex: 99,
          }}
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}
