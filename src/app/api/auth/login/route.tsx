// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import bcrypt from 'bcrypt';

const dynamoDB = new AWS.DynamoDB.DocumentClient( {region: 'ap-southeast-1' });

export async function POST(request: Request) {
  const { email, password } = await request.json();

  try {
    // Fetch user from DynamoDB
    const params = {
      TableName: 'user',
      Key: { email },
    };

    const data = await dynamoDB.get(params).promise();

    if (!data.Item) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Compare passwords
    const match = await bcrypt.compare(password, data.Item.passwordHash);
    if (!match) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // TODO: Generate a token or session as needed

    return NextResponse.json({ message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}