// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { ethers } from 'ethers';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

const ticketingEmail = process.env.TICKETING_EMAIL;
const ticketingPass = process.env.TICKETING_PASSWORD;

// Function to send verification code via email
async function sendVerificationCode(email: string, verificationCode: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: ticketingEmail,
      pass: ticketingPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: ticketingEmail,
    to: email,
    subject: '您的驗證碼',
    html: `<p>感謝您的註冊！以下是您的驗證碼：</p>
           <h3>${verificationCode}</h3>
           <p>請在 10 分鐘內完成驗證。</p>`,
  };

  await transporter.sendMail(mailOptions);
}

export async function POST(request: Request) {
  try {
    const { userName, email, password, phoneNumber } = await request.json();

    // 確保 email 是唯一的
    const params = {
      TableName: 'Users',
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': { S: email },
      },
      Limit: 1,
    };

    const queryCommand = new QueryCommand(params);
    const queryResult = await client.send(queryCommand);
    if (queryResult.Count && queryResult.Count > 0) {
      return NextResponse.json({ error: '該電子郵件已被註冊。' }, { status: 400 });
    }

    // 創建區塊鏈地址
    const wallet = ethers.Wallet.createRandom();
    const blockchainAddress = wallet.address;

    // 密碼加密
    const hashedPassword = await bcrypt.hash(password, 10);


    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 生成用戶 ID
    const userId = crypto.randomBytes(16).toString('hex');

    // 儲存用戶數據到 DynamoDB
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
    await sendVerificationCode(email, verificationCode);

    return NextResponse.json({ message: '註冊成功，驗證碼已發送至您的電子郵件。' }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Registration error:', error.message);
    } else {
      console.error('Registration error:', error);
    }
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 });
  }
}