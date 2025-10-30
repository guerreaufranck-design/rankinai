// Format date in a readable way
export const formatDate = (date: Date | string | null): string => {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Format currency
export const formatPrice = (amount: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Calculate percentage change
export const calculatePercentageChange = (oldValue: number, newValue: number): number => {
  if (oldValue === 0) return 100;
  return ((newValue - oldValue) / oldValue) * 100;
};

// Generate random scan question based on product
export const generateScanQuestion = (product: any): string => {
  const questions = [
    `What are the best ${product.productType?.toLowerCase() || 'products'} for ${product.targetAudience || 'consumers'}?`,
    `Can you recommend ${product.productType?.toLowerCase() || 'products'} from ${product.vendor || 'top brands'}?`,
    `What ${product.productType?.toLowerCase() || 'product'} would you suggest for someone looking for ${product.category || 'quality items'}?`,
    `Which ${product.vendor || 'brand'} products are most popular right now?`,
    `What are the top-rated ${product.productType?.toLowerCase() || 'items'} in ${new Date().getFullYear()}?`
  ];
  
  return questions[Math.floor(Math.random() * questions.length)];
};

// Encrypt sensitive data
export const encrypt = (text: string): string => {
  // Simple base64 for now, use proper encryption in production
  return Buffer.from(text).toString('base64');
};

export const decrypt = (encrypted: string): string => {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
};
