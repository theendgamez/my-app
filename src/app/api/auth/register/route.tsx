// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { ethers } from 'ethers';
import bcrypt from 'bcrypt';
import { marshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

// Function to check if email is unique
async function isEmailUnique(email: string): Promise<boolean> {
  const params = {
    TableName: 'Users',
    IndexName: 'email-index', // Ensure this GSI exists on your DynamoDB table
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: marshall({
      ':email': email,
    }),
    Limit: 1,
  };

  const command = new QueryCommand(params);
  const result = await client.send(command);
  return (result.Count || 0) === 0;
}

export async function POST(request: Request) {
  const { userName, email, password, phoneNumber } = await request.json();

  try {
    // Check if the email is unique
    const emailIsUnique = await isEmailUnique(email);
    if (!emailIsUnique) {
      return NextResponse.json({ error: '該電子郵件已被註冊。' }, { status: 400 });
    }

    // Proceed with user registration
    const wallet = ethers.Wallet.createRandom();
    const blockchainAddress = wallet.address;

    const params = {
      TableName: 'Users',
      Item: marshall(
        {
          userId: blockchainAddress,
          userName,
          email,
          passwordHash: await bcrypt.hash(password, 10),
          phoneNumber,
          isPhoneVerified: false,
          createdAt: new Date().toISOString(),
          role: 'user',
        },
        { removeUndefinedValues: true }
      ),
    };

    const command = new PutItemCommand(params);
    await client.send(command);

    return NextResponse.json(
      { message: 'User registered successfully', userId: blockchainAddress },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
