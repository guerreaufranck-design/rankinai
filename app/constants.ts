export const PLANS = {
  TRIAL: {
    name: 'Trial',
    price: 0,
    priceDisplay: 'Free',
    credits: 25,
    features: [
      '25 one-time credits',
      'Unlimited product import',
      'ChatGPT & Gemini scans',
      'Basic recommendations'
    ]
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    priceDisplay: '€29/month',
    credits: 100,
    features: [
      '100 credits/month',
      'Detailed analytics',
      'Priority email support',
      'Full scan history'
    ]
  },
  GROWTH: {
    name: 'Growth',
    price: 79,
    priceDisplay: '€79/month',
    credits: 500,
    features: [
      '500 credits/month',
      'Automatic optimization',
      'Smart alerts',
      'Priority support'
    ]
  },
  PRO: {
    name: 'Pro',
    price: 199,
    priceDisplay: '€199/month',
    credits: 2000,
    features: [
      '2000 credits/month',
      'Automatic optimization',
      'CSV/PDF exports',
      '24/7 support'
    ]
  }
};

export const SCAN_COSTS = {
  CHATGPT: 1,
  GEMINI: 1,
  COMPLETE: 3
};

export const CITATION_RATE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  AVERAGE: 40,
  POOR: 20
};

export const getCitationRateTone = (rate: number) => {
  if (rate >= CITATION_RATE_THRESHOLDS.EXCELLENT) return 'success';
  if (rate >= CITATION_RATE_THRESHOLDS.GOOD) return 'info';
  if (rate >= CITATION_RATE_THRESHOLDS.AVERAGE) return 'warning';
  return 'critical';
};
