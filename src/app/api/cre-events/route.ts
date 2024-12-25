import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Import the db module
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { Events } from '@/app/api/types'; // Import the Events interface
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const eventId = uuidv4();
    
    // Extract form data with validation
    const eventName = formData.get('name') as string;
    const eventDate = formData.get('date') as string;
    const zones = JSON.parse(formData.get('zones') as string);
    const photo = formData.get('photo') as File;

    // Validate required fields
    if (!eventName?.trim() || !eventDate?.trim() || !zones || !photo) {
      return NextResponse.json(
        { error: '所有欄位都是必填的' },
        { status: 400 }
      );
    }

    const uniqueFileName = `${eventId}-${photo.name}`;
    await savePhoto(photo, uniqueFileName);

    const eventData: Events = {
      eventId,
      eventName,
      eventDate,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      registerDate: formData.get('registerDate') as string,
      endregisterDate: formData.get('endregisterDate') as string,
      drawDate: formData.get('drawDate') as string,
      zones,
      photoUrl: `/img/${uniqueFileName}`,
      createdAt: new Date().toISOString(),
      status: 'Prepare'
    };

    await db.event.create(eventData);
    return NextResponse.json({ message: '活動建立成功', event: eventData }, { status: 201 });

  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: '建立活動時發生錯誤' },
      { status: 500 }
    );
  }
}

async function savePhoto(photo: File, filename: string) {
  const imgDir = path.join(process.cwd(), 'public', 'img');
  await mkdir(imgDir, { recursive: true });
  const filePath = path.join(imgDir, filename);
  const bytes = await photo.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));
}