'use client';

import { useState } from 'react';

interface ScalperFeatures {
  domain_frequency: number;
  is_mainstream: number;
  domain_length: number;
  is_suspicious: number;
  is_temporary: number;
}

interface ScalperPrediction {
  is_scalper: number;
  probability: number;
}

export function useScalperDetection() {
  const [prediction, setPrediction] = useState<ScalperPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function detectScalper(features: ScalperFeatures) {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(features),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      setPrediction(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return {
    prediction,
    loading,
    error,
    detectScalper,
  };
}
