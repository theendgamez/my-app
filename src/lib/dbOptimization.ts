import db from '@/lib/db';
import { Events, Users, Ticket, Payment, Booking } from '@/types';

interface PaginationResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

interface SortOptions {
  [key: string]: 'asc' | 'desc';
}

// Type mapping for collections
type CollectionTypeMap = {
  events: Events;
  users: Users;
  tickets: Ticket;
  payments: Payment;
  bookings: Booking;
};

// Type for record with string keys
type RecordWithStringKeys = Record<string, unknown>;

export class DatabaseOptimizer {
  // 批量操作 - 使用更好的類型約束
  static async batchInsert<K extends keyof CollectionTypeMap>(
    collection: K,
    items: CollectionTypeMap[K][],
    batchSize: number = 100
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // 根據不同的集合類型執行批量插入
      for (const item of batch) {
        switch (collection) {
          case 'events':
            await db.events.create(item as Events);
            break;
          case 'users':
            await db.users.create(item as Users);
            break;
          case 'tickets':
            await db.tickets.create(item as Ticket);
            break;
          case 'payments':
            await db.payments.create(item as Payment);
            break;
          case 'bookings':
            await db.bookings.create(item as Booking);
            break;
          default:
            throw new Error(`Unsupported collection: ${collection}`);
        }
      }
    }
  }

  // 查詢優化 - 使用更好的類型系統
  static async findWithPagination<K extends keyof CollectionTypeMap>(
    collection: K,
    filter: Partial<CollectionTypeMap[K]>,
    page: number = 1,
    limit: number = 20,
    sort?: SortOptions
  ): Promise<PaginationResult<CollectionTypeMap[K]>> {
    // 對於 DynamoDB，我們需要使用現有的查詢方法
    let allData: CollectionTypeMap[K][] = [];
    
    switch (collection) {
      case 'events':
        allData = (await db.events.findMany()) as CollectionTypeMap[K][];
        break;
      case 'users':
        allData = (await db.users.findMany()) as CollectionTypeMap[K][];
        break;
      case 'tickets':
        allData = (await db.tickets.findMany()) as CollectionTypeMap[K][];
        break;
      case 'payments':
        allData = (await db.payments.findMany()) as CollectionTypeMap[K][];
        break;
      case 'bookings':
        // 假設有 bookings 的查詢方法
        allData = [] as CollectionTypeMap[K][];
        break;
      default:
        throw new Error(`Unsupported collection: ${collection}`);
    }
    
    // 在內存中應用過濾器
    let filteredData = allData.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        if (value === undefined) return true;
        return (item as unknown as RecordWithStringKeys)[key] === value;
      });
    });
    
    // 在內存中應用排序
    if (sort) {
      filteredData = filteredData.sort((a, b) => {
        for (const [key, direction] of Object.entries(sort)) {
          const aVal = (a as unknown as RecordWithStringKeys)[key];
          const bVal = (b as unknown as RecordWithStringKeys)[key];
          
          // 安全的比較函數
          if (aVal == null && bVal == null) continue;
          if (aVal == null) return direction === 'asc' ? -1 : 1;
          if (bVal == null) return direction === 'asc' ? 1 : -1;
          
          // 數字比較
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            continue;
          }
          
          // 字符串比較
          const aStr = String(aVal);
          const bStr = String(bVal);
          const comparison = aStr.localeCompare(bStr);
          if (comparison !== 0) {
            return direction === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }
    
    const total = filteredData.length;
    const skip = (page - 1) * limit;
    const data = filteredData.slice(skip, skip + limit);

    return {
      data,
      total,
      hasMore: skip + data.length < total
    };
  }

  // 事務處理 - 使用現有的事務系統
  static async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    // 檢查 db.transaction 是否存在
    if (typeof db.transaction === 'function') {
      return await db.transaction(async () => {
        return await operation();
      });
    } else {
      // 如果沒有事務支持，直接執行操作
      console.warn('Database transaction not supported, executing operation directly');
      return await operation();
    }
  }

  // 新增：批量更新方法
  static async batchUpdate<K extends keyof CollectionTypeMap>(
    collection: K,
    updates: Array<{ id: string; data: Partial<CollectionTypeMap[K]> }>,
    batchSize: number = 50
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        try {
          switch (collection) {
            case 'events':
              await db.events.update(update.id, update.data as Partial<Events>);
              break;
            case 'users':
              await db.users.update(update.id, update.data as Partial<Users>);
              break;
            case 'tickets':
              await db.tickets.update(update.id, update.data as Partial<Ticket>);
              break;
            case 'payments':
              await db.payments.update(update.id, update.data as Partial<Payment>);
              break;
            default:
              throw new Error(`Unsupported collection for update: ${collection}`);
          }
          successful++;
        } catch (error) {
          failed++;
          errors.push(`Failed to update ${update.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return { successful, failed, errors };
  }

  // 新增：批量刪除方法 - 修改為使用狀態更新而不是實際刪除
  static async batchSoftDelete<K extends keyof Pick<CollectionTypeMap, 'events' | 'users'>>(
    collection: K,
    ids: string[],
    batchSize: number = 50
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      for (const id of batch) {
        try {
          switch (collection) {
            case 'events':
              // 軟刪除 - 更新狀態為已刪除
              await db.events.update(id, { status: 'deleted' } as Partial<Events>);
              break;
            case 'users':
              // 軟刪除 - 更新狀態為已停用
              await db.users.update(id, { isActive: false } as Partial<Users>);
              break;
            default:
              throw new Error(`Unsupported collection for soft delete: ${collection}`);
          }
          successful++;
        } catch (error) {
          failed++;
          errors.push(`Failed to soft delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return { successful, failed, errors };
  }

  // 新增：票券狀態批量更新
  static async batchUpdateTicketStatus(
    ticketIds: string[],
    status: 'available' | 'sold' | 'used' | 'cancelled',
    batchSize: number = 50
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < ticketIds.length; i += batchSize) {
      const batch = ticketIds.slice(i, i + batchSize);
      
      for (const ticketId of batch) {
        try {
          await db.tickets.update(ticketId, { status });
          successful++;
        } catch (error) {
          failed++;
          errors.push(`Failed to update ticket ${ticketId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return { successful, failed, errors };
  }
}
