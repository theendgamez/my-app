import { NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import path from 'path';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Extract form data with validation
    const eventId = uuidv4();
    const name = formData.get('name') as string;
    const date = formData.get('date') as string;
    const zones = JSON.parse(formData.get('zones') as string);
    const registerDate = formData.get('registerDate') as string;
    const drawDate = formData.get('drawDate') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const photo = formData.get('photo') as File;

    // Validate required fields
    if (!name?.trim() || !date?.trim() || !zones || !description?.trim() || !photo) {
      return NextResponse.json(
        { error: '所有欄位都是必填的' },
        { status: 400 }
      );
    }

    // Handle file upload
    const uniqueFileName = `${eventId}-${photo.name}`;
    const imgDir = path.join(process.cwd(), 'public', 'img');
    const filePath = path.join(imgDir, uniqueFileName);
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Prepare event data for DynamoDB
    const eventData = {
      eventId,
      name,
      date,
      zones,
      description,
      photoUrl: `/img/${uniqueFileName}`,
      registerDate,
      drawDate,
      location,
      createdAt: new Date().toISOString(),
      status: ''
    };

    // Store in DynamoDB
    const putCommand = new PutItemCommand({
      TableName: 'Events',
      Item: marshall(eventData)
    });

    await client.send(putCommand);

    return NextResponse.json({
      message: '活動建立成功',
      event: eventData
    }, { status: 201 });

  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: '建立活動時發生錯誤' },
      { status: 500 }
    );
  }
}