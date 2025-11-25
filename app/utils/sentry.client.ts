import * as Sentry from "@sentry/react";

export function initSentry() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: "https://f4ad26170b037a93016f17c2465584bb6a451022145515b624.ingest.us.sentry.io/4518042496289776",
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: process.env.NODE_ENV || "production",
    });
  }
}
