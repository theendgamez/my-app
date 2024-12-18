import { NextResponse } from 'next/server';
import { DynamoDBClient, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import jwt from 'jsonwebtoken';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const jwtSecret = process.env.JWT_SECRET!;
const jwtExpiry = '1h'; // Configurable expiry time

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: '驗證令牌缺失。' }, { status: 400 });
    }

    const params = {
      TableName: 'Users',
      IndexName: 'verificationCode-index',
      KeyConditionExpression: 'verificationCode = :token',
      ExpressionAttributeValues: marshall({ ':token': token }),
      Limit: 1,
    };

    const command = new QueryCommand(params);
    const result = await client.send(command);

    if (result.Items && result.Items.length > 0) {
      const user = unmarshall(result.Items[0]);

      const updateParams = {
        TableName: 'Users',
        Key: marshall({ userId: user.userId }),
        UpdateExpression: 'SET isEmailVerified = :true REMOVE verificationCode',
        ExpressionAttributeValues: marshall({ ':true': true }),
      };

      const updateCommand = new UpdateItemCommand(updateParams);
      await client.send(updateCommand);

      const authToken = jwt.sign(
        { userId: user.userId, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: jwtExpiry }
      );

      return NextResponse.json({
        message: '驗證成功！',
        token: authToken,
        user: {
          userId: user.userId,
          userName: user.userName || user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
        },
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: '無效的驗證令牌。' }, { status: 400 });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 });
  }
}
