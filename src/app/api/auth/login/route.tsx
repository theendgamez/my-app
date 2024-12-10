import { NextResponse } from 'next/server';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import bcrypt from 'bcrypt';

const client = new DynamoDBClient({ region: 'ap-southeast-1' });

export async function POST(request: Request) {
  const { email, password } = await request.json();

  try {
    // 查詢 GSI
    const params = {
      TableName: 'Users',
      IndexName: 'email-index', // 使用 GSI
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': { S: email },
      },
    };

    const command = new QueryCommand(params);
    const data = await client.send(command);

    // 檢查是否找到用戶
    if (!data.Items || data.Items.length === 0) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // 提取用戶數據
    const userItem = unmarshall(data.Items[0]);
    const passwordHash = userItem.passwordHash;

    // 驗證密碼
    const match = await bcrypt.compare(password, passwordHash);

    if (!match) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // 返回成功響應，包含使用者資訊
    delete userItem.passwordHash;
    return NextResponse.json({ message: 'Login successful', user: userItem }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
