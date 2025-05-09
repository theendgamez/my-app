export const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://machine-learning-l8r1.onrender.com';

// Update the parameter type to match the ML model's expected field names
export async function predictScalper(features: {
  popularity: number;
  is_common_provider: number;
  domain_length: number;
  has_numbers: number;
  is_common_tld: number;
  entropy: number;
  has_suspicious_keyword: number;
}) {
  try {
    console.log(`Making request to ML service: ${ML_SERVICE_URL}/predict`);
    const res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(features),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`ML service error (${res.status}): ${errorText}`);
    }

    return res.json();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`predictScalper error: ${errorMessage}`);
    console.error(`Error details:`, err);

    // Return fallback prediction to prevent complete failure
    return {
      prediction: 0,
      error: errorMessage,
      fallback: true
    };
  }
}
