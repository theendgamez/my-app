import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, UpdateItemCommand, ReturnValue } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

export async function POST(request: NextRequest) {
  try {
    const { userId, userName, email, phoneNumber } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const params = {
      TableName: 'Users',
      Key: marshall({ userId }),
      UpdateExpression: 'SET userName = :userName, email = :email, phoneNumber = :phoneNumber',
      ExpressionAttributeValues: marshall({
        ':userName': userName,
        ':email': email,
        ':phoneNumber': phoneNumber,
      }),
      ReturnValues: ReturnValue.ALL_NEW,
    };

    const command = new UpdateItemCommand(params);
    const result = await client.send(command);

    if (result.Attributes) {
      const updatedUser = unmarshall(result.Attributes);
      return NextResponse.json(
        { message: 'Profile updated successfully', user: updatedUser },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}