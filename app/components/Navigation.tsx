import { Navigation } from "@shopify/polaris";
import { useLocation, useNavigate } from "react-router";
import {
  HomeMajor,
  ProductsMajor,
  AnalyticsMajor,
  CashDollarMajor,
  SettingsMajor,
  ChatMajor
} from "@shopify/polaris-icons";

export function AppNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  return (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            url: '/app',
            label: 'Dashboard',
            icon: HomeMajor,
            selected: location.pathname === '/app',
            onClick: () => navigate('/app')
          },
          {
            url: '/app/products',
            label: 'Products',
            icon: ProductsMajor,
            selected: location.pathname.startsWith('/app/products'),
            onClick: () => navigate('/app/products')
          },
          {
            url: '/app/analytics',
            label: 'Analytics',
            icon: AnalyticsMajor,
            selected: location.pathname === '/app/analytics',
            onClick: () => navigate('/app/analytics')
          },
        ]}
      />
      <Navigation.Section
        title="Support"
        items={[
          {
            url: '/app/assistant',
            label: 'AI Assistant',
            icon: ChatMajor,
            selected: location.pathname === '/app/assistant',
            onClick: () => navigate('/app/assistant')
          },
          {
            url: '/app/pricing',
            label: 'Pricing',
            icon: CashDollarMajor,
            selected: location.pathname === '/app/pricing',
            onClick: () => navigate('/app/pricing')
          },
          {
            url: '/app/settings',
            label: 'Settings',
            icon: SettingsMajor,
            selected: location.pathname === '/app/settings',
            onClick: () => navigate('/app/settings')
          },
        ]}
      />
    </Navigation>
  );
}
