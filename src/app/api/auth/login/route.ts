import { NextResponse } from 'next/server';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import bcrypt from 'bcrypt';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

export async function POST(request: Request) {
  const { email, password } = await request.json();

  try {
    const params = {
      TableName: 'Users',
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': { S: email },
      },
    };

    const command = new QueryCommand(params);
    const data = await client.send(command);

    if (!data.Items || data.Items.length === 0) {
      return NextResponse.json({ message: '帳號或密碼不正確' }, { status: 401 });
    }

    const userItem = unmarshall(data.Items[0]);
    const match = await bcrypt.compare(password, userItem.password);

    if (!match) {
      return NextResponse.json({ message: '帳號或密碼不正確' }, { status: 401 });
    }

    delete userItem.password;
    const userCookie = JSON.stringify(userItem);

    const response = NextResponse.json({ message: '登入成功', user: userItem }, { status: 200 });
    response.cookies.set('user', userCookie, { path: '/', httpOnly: true, secure: true });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
