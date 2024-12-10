// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { ethers } from 'ethers';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { marshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

export async function POST(request: Request) {
  const { userName,email, password, phoneNumber } = await request.json();

  try {
    const wallet = ethers.Wallet.createRandom();
    const blockchainAddress = wallet.address;

    const params = {
        TableName: 'Users',
        Item: marshall(
            {
                userId: blockchainAddress,
                userName: userName,
                email: email,
                passwordHash: await bcrypt.hash(password, 10),
                phoneNumber: phoneNumber,
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
      { message: 'User registered', userId: blockchainAddress },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
