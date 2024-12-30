import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Import the db module
import { writeFile, mkdir } from 'fs/promises';
import { Events } from '@/components/types'; // Import the Events interface
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const eventId = Math.random().toString(36).substring(8);
    
    // Extract common form data
    const eventName = formData.get('name') as string;
    const eventDate = formData.get('date') as string;
    const zones = JSON.parse(formData.get('zones') as string);
    const photo = formData.get('photo') as File;
    const isDrawMode = formData.get('isDrawMode') === 'true';


    // Validate common required fields
    if (!eventName?.trim() || !eventDate?.trim() || !zones || !photo) {
      return NextResponse.json(
        { error: '所有基本欄位都是必填的' },
        { status: 400 }
      );
    }

    // Validate mode-specific required fields
    if (isDrawMode) {
      const registerDate = formData.get('registerDate');
      const endregisterDate = formData.get('endregisterDate');
      const drawDate = formData.get('drawDate');
      
      if (!registerDate || !endregisterDate || !drawDate) {
        return NextResponse.json(
          { error: '抽籤模式需要填寫所有日期欄位' },
          { status: 400 }
        );
      }
    } else {
      const onSaleDate = formData.get('onSaleDate');
      if (!onSaleDate) {
        return NextResponse.json(
          { error: '請填寫開售日期' },
          { status: 400 }
        );
      }
    }

    const uniqueFileName = `${eventId}-${photo.name}`;
    await savePhoto(photo, uniqueFileName);

    const eventData: Events = {
      eventId,
      eventName,
      eventDate,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      isDrawMode,
      onSaleDate: !isDrawMode ? formData.get('onSaleDate') as string : null,
      registerDate: isDrawMode ? formData.get('registerDate') as string : null,
      endregisterDate: isDrawMode ? formData.get('endregisterDate') as string : null,
      drawDate: isDrawMode ? formData.get('drawDate') as string : null,
      zones,
      photoUrl: `/img/${uniqueFileName}`,
      createdAt: new Date().toISOString(),
      status: 'Prepare',
      category: formData.get('category') as string, // Changed from categories: ...
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