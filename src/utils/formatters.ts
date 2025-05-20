/**
 * Format a currency value to HKD format
 * @param amount Amount to format
 * @param zeroValueText Optional text to show when amount is zero
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | undefined, zeroValueText = 'HKD 0'): string {
  // Handle empty values
  if (amount === undefined || amount === null || amount === '') {
    return zeroValueText;
  }
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle zero value
  if (numAmount === 0) {
    return zeroValueText;
  }
  
  // Format with HKD and thousands separators
  return `HKD ${numAmount.toLocaleString('en-HK')}`;
}

/**
 * Format a date string for consistent display
 * @param dateString The date to format
 * @param fallbackText Text to show when date is invalid or missing
 * @returns Formatted date string
 */
export function formatDate(dateString?: string | null, fallbackText = '未知日期'): string {
  if (!dateString) return fallbackText;
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return fallbackText;
    }
    
    return date.toLocaleString('zh-HK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallbackText;
  }
}
