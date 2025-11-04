import { Link, useLocation } from "react-router";

export default function AppHeader() {
  const location = useLocation();
  
  const links = [
    { path: "/app", label: "Dashboard", icon: "📊" },
    { path: "/app/products", label: "Products", icon: "📦" },
    { path: "/app/analyze", label: "Analyze", icon: "🔍" },
    { path: "/app/optimize", label: "Optimize", icon: "✨" },
    { path: "/app/settings", label: "Settings", icon: "⚙️" },
    { path: "/app/help", label: "Help", icon: "❓" },
  ];

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div
      style={{
        background: "white",
        borderBottom: "1px solid #e0e0e0",
        padding: "0 24px",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#202223", paddingRight: "32px" }}>
          🎯 RankInAI
        </div>
        
        <nav style={{ display: "flex", gap: "4px" }}>
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "16px 20px",
                textDecoration: "none",
                color: isActive(link.path) ? "#2196f3" : "#6d7175",
                borderBottom: isActive(link.path) ? "3px solid #2196f3" : "3px solid transparent",
                fontSize: "14px",
                fontWeight: isActive(link.path) ? "600" : "500",
                transition: "all 0.2s",
              }}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
