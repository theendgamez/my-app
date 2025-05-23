'use client';

import { useState, useCallback } from 'react';
import { useScalperDetection } from './useScalperDetection';

interface EnhancedDetectionOptions {
  thresholds?: {
    high: number;
    medium: number;
    low: number;
  };
  includeUserBehavior?: boolean;
}

interface ScalperDetectionFeatures {
  domain_frequency: number;
  is_temporary: number;
  is_suspicious: number;
  is_mainstream: number;
  domain_length: number;
  [key: string]: unknown;  // For other potential properties
}

interface UserBehaviorMetrics {
  registrationCount: number;
  successRate: number;
  transferRate: number;
  deviceFingerprints: number;
  ipAddresses: number;
  timeVariance: number;
}

export interface EnhancedScalperPrediction {
  isScalper: boolean;
  probability: number;
  riskLevel: 'very-high' | 'high' | 'medium' | 'low';
  confidenceScore: number;
  reasons: string[];
  userBehavior?: UserBehaviorMetrics;
}

export function useEnhancedScalperDetection(options: EnhancedDetectionOptions = {}) {
  const { 
    thresholds = { high: 0.8, medium: 0.6, low: 0.4 },
    includeUserBehavior = false 
  } = options;

  const { detectScalper, prediction: basePrediction, loading: baseLoading, error: baseError } = useScalperDetection();
  
  const [enhancedPrediction, setEnhancedPrediction] = useState<EnhancedScalperPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeEnhanced = useCallback(async (features: ScalperDetectionFeatures, userId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // First, get base ML prediction
      const baseResult = await detectScalper(features);
      if (!baseResult) {
        throw new Error('Failed to get base prediction');
      }
      
      // Initialize enhanced prediction
      const reasons: string[] = [];
      let confidenceScore = 0.8; // Default confidence in ML model
      let userBehavior: UserBehaviorMetrics | undefined;
      
      // Get additional user behavior if requested and userId is provided
      if (includeUserBehavior && userId) {
        try {
          const response = await fetch(`/api/users/${userId}/behavior`, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const behaviorData = await response.json();
            userBehavior = {
              registrationCount: behaviorData.registrationCount || 0,
              successRate: behaviorData.successRate || 0,
              transferRate: behaviorData.transferRate || 0,
              deviceFingerprints: behaviorData.deviceFingerprints?.length || 1,
              ipAddresses: behaviorData.ipAddresses?.length || 1,
              timeVariance: behaviorData.timeVariance || 0
            };
            
            // Add behavior-based reasons
            if (userBehavior.registrationCount > 10) {
              reasons.push('高註冊頻率');
              confidenceScore += 0.05;
            }
            
            if (userBehavior.successRate > 0.8) {
              reasons.push('異常高的購票成功率');
              confidenceScore += 0.05;
            }
            
            if (userBehavior.transferRate > 0.5) {
              reasons.push('頻繁轉讓票券');
              confidenceScore += 0.1;
            }
            
            if (userBehavior.deviceFingerprints > 3) {
              reasons.push('使用多個設備');
              confidenceScore += 0.05;
            }
            
            if (userBehavior.timeVariance < 2 && userBehavior.registrationCount > 5) {
              reasons.push('註冊時間模式過於規律');
              confidenceScore += 0.05;
            }
          }
        } catch (err) {
          console.warn('Failed to get user behavior data:', err);
          // Continue with just ML-based prediction
        }
      }
      
      // Add ML-based reasons
      if (features.domain_frequency > 20) {
        reasons.push('郵箱域名使用頻率異常高');
      }
      
      if (features.is_temporary === 1) {
        reasons.push('使用臨時郵箱');
      }
      
      if (features.is_suspicious === 1) {
        reasons.push('使用可疑郵箱域名');
      }
      
      // Determine risk level
      let riskLevel: 'very-high' | 'high' | 'medium' | 'low';
      if (baseResult.probability > thresholds.high) riskLevel = 'very-high';
      else if (baseResult.probability > thresholds.medium) riskLevel = 'high';
      else if (baseResult.probability > thresholds.low) riskLevel = 'medium';
      else riskLevel = 'low';
      
      // Cap confidence score at 0.99
      confidenceScore = Math.min(0.99, confidenceScore);
      
      // Create enhanced prediction
      const enhanced: EnhancedScalperPrediction = {
        isScalper: baseResult.is_scalper === 1,
        probability: baseResult.probability,
        riskLevel,
        confidenceScore,
        reasons: reasons.length > 0 ? reasons : ['基於域名特徵的純機器學習推斷'],
        ...(userBehavior ? { userBehavior } : {})
      };
      
      setEnhancedPrediction(enhanced);
      return enhanced;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [detectScalper, includeUserBehavior, thresholds]);

  return {
    analyzeEnhanced,
    prediction: enhancedPrediction,
    basePrediction,
    loading: loading || baseLoading,
    error: error || baseError
  };
}
