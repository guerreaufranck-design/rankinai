import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { useEffect } from "react";
import { ChatBot } from "~/components/ChatBot";
import { initSentry } from "~/utils/sentry.client";

export default function App() {
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ChatBot />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
