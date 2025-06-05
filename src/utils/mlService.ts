// 確保環境變量一致
export const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://machine-learning-l8r1.onrender.com';

type BatchUser = {
  userId: string;
  email: string;
};

export async function batchAnalyzeUsers(users: BatchUser[]) {
  try {
    console.log(`Making request to ML service: ${ML_SERVICE_URL}/analyze-users`);
    const response = await fetch(`${ML_SERVICE_URL}/analyze-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        users: users.map(user => ({
          userId: user.userId,
          email: user.email,
        }))
      }),
      signal: AbortSignal.timeout(10000) // 添加 10 秒超時
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('批量分析用戶錯誤:', error);
    return { error: true, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function predictScalper(users: BatchUser[]) {
  return batchAnalyzeUsers(users);
}