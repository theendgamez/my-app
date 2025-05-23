export interface UserBehaviorPattern {
  userId: string;
  registrationCount: number; // 註冊活動數量
  successfulPurchases: number; // 成功購買次數
  cancelledTickets: number; // 取消票券數量
  transferCount: number; // 轉讓次數
  avgResponseTime: number; // 平均響應時間
  deviceFingerprints: string[]; // 設備指紋
  ipAddresses: string[]; // IP 地址歷史
  registrationHours: number[]; // 註冊時間分佈
}

export class EnhancedScalperDetector {
  static async analyzeUserBehavior(userId: string): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'very-high';
    reasons: string[];
  }> {
    const pattern = await this.getUserBehaviorPattern(userId);
    const reasons: string[] = [];
    let riskScore = 0;

    // 分析註冊頻率
    if (pattern.registrationCount > 10) {
      riskScore += 0.3;
      reasons.push('註冊活動數量異常高');
    }

    // 分析購買成功率
    const successRate = pattern.successfulPurchases / pattern.registrationCount;
    if (successRate > 0.8) {
      riskScore += 0.2;
      reasons.push('購買成功率異常高');
    }

    // 分析轉讓行為
    const transferRate = pattern.transferCount / pattern.successfulPurchases;
    if (transferRate > 0.5) {
      riskScore += 0.4;
      reasons.push('票券轉讓率過高');
    }

    // 分析設備多樣性
    if (pattern.deviceFingerprints.length > 5) {
      riskScore += 0.2;
      reasons.push('使用多個設備');
    }

    // 分析 IP 多樣性
    if (pattern.ipAddresses.length > 3) {
      riskScore += 0.15;
      reasons.push('使用多個 IP 地址');
    }

    // 分析註冊時間模式
    const timeVariance = this.calculateTimeVariance(pattern.registrationHours);
    if (timeVariance < 2) {
      riskScore += 0.25;
      reasons.push('註冊時間模式過於規律');
    }

    // 響應時間分析（過快可能是機器人）
    if (pattern.avgResponseTime < 1000) {
      riskScore += 0.3;
      reasons.push('操作響應時間異常快');
    }

    // 確定風險等級
    let riskLevel: 'low' | 'medium' | 'high' | 'very-high';
    if (riskScore < 0.3) riskLevel = 'low';
    else if (riskScore < 0.6) riskLevel = 'medium';
    else if (riskScore < 0.8) riskLevel = 'high';
    else riskLevel = 'very-high';

    return { riskScore, riskLevel, reasons };
  }

  private static async getUserBehaviorPattern(userId: string): Promise<UserBehaviorPattern> {
    // 實現獲取用戶行為數據的邏輯
    // 這裡需要查詢數據庫獲取用戶的歷史行為數據
    return {
      userId,
      registrationCount: 0,
      successfulPurchases: 0,
      cancelledTickets: 0,
      transferCount: 0,
      avgResponseTime: 0,
      deviceFingerprints: [],
      ipAddresses: [],
      registrationHours: []
    };
  }

  private static calculateTimeVariance(hours: number[]): number {
    if (hours.length < 2) return 24;
    
    const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
    const variance = hours.reduce((sum, hour) => sum + Math.pow(hour - mean, 2), 0) / hours.length;
    return Math.sqrt(variance);
  }
}
