import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { DatabaseOptimizer } from '@/lib/dbOptimization';
import { writeFile, mkdir } from 'fs/promises';
import { Events } from '@/types';
import path from 'path';
import { ApiResponseBuilder } from '@/lib/apiResponse';
import { CacheManager } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    
    // Check cache first for simple event listings (no filters)
    if (!searchParams.get('page') && !searchParams.get('limit') && !category && !status) {
      const cachedEvents = await CacheManager.getEventListings();
      if (cachedEvents) {
        return NextResponse.json(cachedEvents);
      }
    }
    
    // Build filter
    const filter: Partial<Events> = {};
    if (category) filter.category = category;
    if (status) filter.status = status as Events['status'];
    
    // Use optimized pagination
    const result = await DatabaseOptimizer.findWithPagination(
      'events',
      filter,
      page,
      limit,
      { eventDate: 'asc' } // Sort by event date
    );
    
    // Cache simple event listings
    if (!searchParams.get('page') && !searchParams.get('limit') && !category && !status) {
      await CacheManager.cacheEventListings(result.data as Events[]);
    }
    
    // For backward compatibility, return just the events array if no pagination params
    if (!searchParams.get('page') && !searchParams.get('limit')) {
      return NextResponse.json(result.data);
    }
    
    // Return paginated response with ApiResponseBuilder format
    const responseBuilder = new ApiResponseBuilder();
    return NextResponse.json(
      responseBuilder
        .withPagination(page, limit, result.total)
        .success({
          events: result.data,
          pagination: {
            page,
            limit,
            total: result.total,
            hasMore: result.hasMore,
            totalPages: Math.ceil(result.total / limit)
          }
        })
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    const responseBuilder = new ApiResponseBuilder();
    return NextResponse.json(
      responseBuilder.error('FETCH_EVENTS_ERROR', 'Failed to fetch events'),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const eventId = Math.floor(Math.random() * 1000000).toString();
    
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
      category: formData.get('category') as string,
    };

    await db.events.create(eventData);
    
    // Invalidate events cache after creating new event
    await CacheManager.invalidateEventCache();
    
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