// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { ethers } from 'ethers';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import sendVerificationCode from '@/app/utils/sendVerifcationCode';
import { checkEmailUnique } from '@/app/utils/checkEmailUnique';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    const { userName, email, password, phoneNumber } = await request.json();

    const isEmailUnique = await checkEmailUnique(email);
    if (!isEmailUnique) {
      return NextResponse.json({ error: '該電子郵件已被註冊。' }, { status: 400 });
    }
    // 創建區塊鏈地址
    const wallet = ethers.Wallet.createRandom();
    const blockchainAddress = wallet.address;

    // 密碼加密
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 儲存用戶數據到 DynamoDB
    userId = uuidv4();
    const putParams = {
      TableName: 'Users',
      Item: {
        userId: { S: userId },
        userName: { S: userName },
        email: { S: email },
        password: { S: hashedPassword },
        phoneNumber: { S: phoneNumber },
        blockchainAddress: { S: blockchainAddress },
        isEmailVerified: { BOOL: false },
        verificationCode: { S: verificationCode },
        createdAt: { S: new Date().toISOString() },
        role: { S: 'user' },
      },
    };

    const putCommand = new PutItemCommand(putParams);
    await client.send(putCommand);

    // 發送驗證碼
    await sendVerificationCode(email, verificationCode).catch((error) => {
      console.error('Failed to send verification code:', error);
    });

    return NextResponse.json(
      { message: '註冊成功，驗證碼已發送至您的電子郵件。' }, { status: 201 });
  } catch (error) {
    if (userId) {
      const deleteParams = {
        TableName: 'Users',
        Key: {
          userId: { S: userId },
        },
      };
      const deleteCommand = new DeleteItemCommand(deleteParams);
      await client.send(deleteCommand).catch((deleteError) => {
        console.error('Failed to delete user after registration error:', deleteError);
      });
    }
    if (error instanceof Error) {
      console.error('Registration error:', error.message);
    } else {
      console.error('Registration error:', error);
    }
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 });
  }
}