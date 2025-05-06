import db from '@/lib/db'; // 假設有一個資料庫模組

// 定義註冊資料的類型
interface Registration {
  userId: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  status: string;
}

// 定義抽籤歷史的類型
interface LotteryHistory {
  userId: string;
  drawDate: Date;
  result: 'won' | 'lost';
}

// 定義用戶抽籤統計資料的類型
interface UserLotteryStats {
  lostCount: number;
  winCount: number;
  activityScore: number;
  consecutiveLosses: number;
  lastLotteryDate?: Date;
}

// 獲取用戶的抽籤歷史
async function getLotteryHistory(userId: string): Promise<LotteryHistory[]> {
  try {
    const registrations = await db.registration.findByUser(userId);
    
    // 將 registration 數據轉換為抽籤歷史格式
    const history: LotteryHistory[] = registrations
      .map((reg: unknown) => {
        const typedReg = reg as Registration;
        return {
          userId: typedReg.userId,
          drawDate: new Date(typedReg.updatedAt || typedReg.createdAt),
          result: (typedReg.status === 'selected' ? 'won' : 'lost') as 'won' | 'lost'
        };
      })
      // 按日期排序，最近的排前面
      .sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime())
      // 限制返回20條記錄
      .slice(0, 20);
    
    return history;
  } catch (error) {
    console.error('Error fetching user lottery history:', error);
    return [];
  }
}

// 計算用戶抽籤統計資料
async function getLotteryStats(userId: string): Promise<UserLotteryStats> {
  try {
    const history = await getLotteryHistory(userId);
    
    const stats: UserLotteryStats = {
      lostCount: 0,
      winCount: 0,
      activityScore: 0,
      consecutiveLosses: 0
    };
    
    // 計算基本統計資料
    let consecutive = 0;
    history.forEach((entry, index) => {
      if (entry.result === 'won') {
        stats.winCount++;
        consecutive = 0;
      } else if (entry.result === 'lost') {
        stats.lostCount++;
        consecutive++;
      }
      
      // 活躍度分數：最近的抽籤活動權重更高
      const recency = Math.max(0, 1 - (index * 0.1));
      stats.activityScore += recency;
    });
    
    stats.consecutiveLosses = consecutive;
    stats.lastLotteryDate = history[0]?.drawDate;
    
    return stats;
  } catch (error) {
    console.error('Error calculating user lottery stats:', error);
    return {
      lostCount: 0,
      winCount: 0,
      activityScore: 0,
      consecutiveLosses: 0
    };
  }
}

// 計算用戶抽籤優先權分數
async function calculatePriorityScore(userId: string): Promise<number> {
  try {
    const stats = await getLotteryStats(userId);
    
    // 優先權計算公式
    const baseScore = 100;
    
    // 連續未中籤加成 (每次連續未中籤增加10分)
    const consecutiveLossBonus = Math.min(50, stats.consecutiveLosses * 10);
    
    // 參與活躍度加成
    const activityBonus = Math.min(30, stats.activityScore * 5);
    
    // 總未中籤次數加成（有上限）
    const totalLossBonus = Math.min(20, stats.lostCount * 2);
    
    // 計算最終分數
    const finalScore = baseScore + consecutiveLossBonus + activityBonus + totalLossBonus;
    
    // 確保分數在有效範圍內
    return Math.max(100, Math.min(200, finalScore));
  } catch (error) {
    console.error('Error calculating priority score:', error);
    return 100; // 返回默認分數
  }
}

const usersDb = {
  getLotteryHistory,
  getLotteryStats,
  calculatePriorityScore
};

export default usersDb;