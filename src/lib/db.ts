import {
  DynamoDBClient,
  ScanCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  TransactWriteItemsCommand,
  TransactWriteItem,
} from "@aws-sdk/client-dynamodb";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";
import { Events, Users, Payment, Ticket, Booking } from '@/types';


// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

// Utility functions
const createUpdateExpression = <T>(updates: Partial<T>) => {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  const expressionAttributeNames: Record<string, string> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
      expressionAttributeNames[`#${key}`] = key;
    }
  });

  return {
    updateExpressions,
    expressionAttributeValues,
    expressionAttributeNames
  };
};

// Error handling wrapper
async function executeDbCommand<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database operation failed:`, error);
    throw new Error(`Database operation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Transaction implementation
class Transaction {
  private writeItems: TransactWriteItem[] = [];
  private client: DynamoDBClient;

  constructor(client: DynamoDBClient) {
    this.client = client;
  }

  payments = {
    create: async (payment: Payment): Promise<void> => {
      this.writeItems.push({
        Put: {
          TableName: 'Payments',
          Item: marshall(payment)
        }
      });
    }
  };

  bookings = {
    update: async (bookingToken: string, updates: Partial<Booking>): Promise<void> => {
      const { updateExpressions, expressionAttributeValues, expressionAttributeNames } = 
        createUpdateExpression(updates);

      this.writeItems.push({
        Update: {
          TableName: 'Bookings',
          Key: marshall({ bookingToken }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
          ExpressionAttributeNames: expressionAttributeNames
        }
      });
    }
  };

  events = {
    updateZoneRemaining: async (eventId: string, zoneName: string, newRemaining: number): Promise<void> => {
      // First we need to get the current event to find the zone index
      const currentEvent = await db.events.findById(eventId);
      if (!currentEvent) throw new Error(`Event with ID ${eventId} not found`);
      
      const zones = currentEvent.zones || [];
      const zoneIndex = zones.findIndex(zone => zone.name === zoneName);
      
      if (zoneIndex === -1) throw new Error(`Zone ${zoneName} not found in event ${eventId}`);

      this.writeItems.push({
        Update: {
          TableName: 'Events',
          Key: marshall({ eventId }),
          UpdateExpression: `SET zones[${zoneIndex}].zoneQuantity = :newValue`,
          ExpressionAttributeValues: marshall({ ':newValue': newRemaining.toString() })
        }
      });
    }
  };

  tickets = {
    create: async (ticket: Ticket): Promise<void> => {
      this.writeItems.push({
        Put: {
          TableName: 'Tickets',
          Item: marshall(ticket)
        }
      });
    }
  };

  async commit(): Promise<void> {
    if (this.writeItems.length === 0) {
      return;
    }
    
    try {
      const command = new TransactWriteItemsCommand({
        TransactItems: this.writeItems
      });
      
      await this.client.send(command);
      // Clear items after successful commit
      this.writeItems = [];
    } catch (error) {
      console.error('Transaction failed:', error);
      // Clear items on failure so the transaction can be retried
      this.writeItems = [];
      throw error;
    }
  }
}

// Database handlers by entity
const db = {
  // Events operations
  events: {
    findMany: async (): Promise<Events[]> => {
      return executeDbCommand(async () => {
        const command = new ScanCommand({ TableName: 'Events' });
        const data = await client.send(command);
        return data.Items?.map((item) => unmarshall(item) as Events) || [];
      });
    },

    create: async (data: Events): Promise<Events> => {
      return executeDbCommand(async () => {
        const command = new PutItemCommand({
          TableName: 'Events',
          Item: marshall(data)
        });
        await client.send(command);
        return data;
      });
    },

    findById: async (eventId: string): Promise<Events | null> => {
      return executeDbCommand(async () => {
        const command = new GetItemCommand({
          TableName: 'Events',
          Key: marshall({ eventId })
        });
        const result = await client.send(command);
        return result.Item ? (unmarshall(result.Item) as Events) : null;
      });
    },

    update: async (eventId: string, updates: Partial<Events>): Promise<Events> => {
      return executeDbCommand(async () => {
        // First get the current state
        const currentEvent = await db.events.findById(eventId);
        if (!currentEvent) throw new Error(`Event with ID ${eventId} not found`);
        
        const { updateExpressions, expressionAttributeValues, expressionAttributeNames } = 
          createUpdateExpression(updates);

        const command = new UpdateItemCommand({
          TableName: 'Events',
          Key: marshall({ eventId }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'ALL_NEW'
        });
        
        const result = await client.send(command);
        return result.Attributes ? (unmarshall(result.Attributes) as Events) : { ...currentEvent, ...updates };
      });
    },

    delete: async (eventId: string): Promise<void> => {
      return executeDbCommand(async () => {
        const command = new DeleteItemCommand({
          TableName: 'Events',
          Key: marshall({ eventId })
        });
        await client.send(command);
      });
    },

    updateZoneProperty: async (
      eventId: string, 
      zoneName: string,
      propertyName: string,
      newValue: string | number
    ): Promise<{ zoneName: string, [key: string]: string | number }> => {
      return executeDbCommand(async () => {
        // Get the current event data
        const currentEvent = await db.events.findById(eventId);
        if (!currentEvent) throw new Error(`Event with ID ${eventId} not found`);
        
        const zones = currentEvent.zones || [];
        const zoneIndex = zones.findIndex(zone => zone.name === zoneName);
        
        if (zoneIndex === -1) throw new Error(`Zone ${zoneName} not found in event ${eventId}`);

        // Prepare the update
        const command = new UpdateItemCommand({
          TableName: 'Events',
          Key: marshall({ eventId }),
          UpdateExpression: `SET zones[${zoneIndex}].#propName = :newValue`,
          ExpressionAttributeValues: marshall({ ':newValue': newValue.toString() }),
          ExpressionAttributeNames: {
            '#propName': propertyName,
          }
        });
        
        await client.send(command);
        return { zoneName, [propertyName]: newValue };
      });
    },
    
    updateZoneMax: async (eventId: string, zoneName: string, newMax: number) => {
      return db.events.updateZoneProperty(eventId, zoneName, 'max', newMax);
    },
    
    updateZoneRemaining: async (eventId: string, zoneName: string, newRemaining: number) => {
      return db.events.updateZoneProperty(eventId, zoneName, 'remaining', newRemaining);
    }
  },

  // Users operations
  users: {
    findByVerificationCode: async (verificationCode: string): Promise<Users | null> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Users',
          IndexName: 'verificationCode-index',
          KeyConditionExpression: 'verificationCode = :token',
          ExpressionAttributeValues: marshall({ ':token': verificationCode }),
          Limit: 1
        });
        
        const result = await client.send(command);
        return result.Items && result.Items.length > 0 
          ? (unmarshall(result.Items[0]) as Users) 
          : null;
      });
    },

    findByEmail: async (email: string): Promise<Users | null> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Users',
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: marshall({ ':email': email }),
          Limit: 1
        });
        
        const result = await client.send(command);
        return result.Items && result.Items.length > 0 
          ? (unmarshall(result.Items[0]) as Users) 
          : null;
      });
    },

    findById: async (userId: string): Promise<Users | null> => {
      return executeDbCommand(async () => {
        const command = new GetItemCommand({
          TableName: 'Users',
          Key: marshall({ userId })
        });
        
        const result = await client.send(command);
        return result.Item ? (unmarshall(result.Item) as Users) : null;
      });
    },

    create: async (data: Users): Promise<Users> => {
      return executeDbCommand(async () => {
        const command = new PutItemCommand({
          TableName: 'Users',
          Item: marshall(data)
        });
        await client.send(command);
        return data;
      });
    },

    update: async (userId: string, updates: Partial<Users>): Promise<Users> => {
      return executeDbCommand(async () => {
        const currentUser = await db.users.findById(userId);
        if (!currentUser) throw new Error(`User with ID ${userId} not found`);
        
        const { updateExpressions, expressionAttributeValues, expressionAttributeNames } = 
          createUpdateExpression(updates);

        const command = new UpdateItemCommand({
          TableName: 'Users',
          Key: marshall({ userId }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'ALL_NEW'
        });
        
        const result = await client.send(command);
        return result.Attributes ? (unmarshall(result.Attributes) as Users) : { ...currentUser, ...updates };
      });
    },

    delete: async (userId: string): Promise<void> => {
      return executeDbCommand(async () => {
        const command = new DeleteItemCommand({
          TableName: 'Users',
          Key: marshall({ userId })
        });
        await client.send(command);
      });
    },

    getAdmin: async (): Promise<Users | null> => {
      return executeDbCommand(async () => {
        const command = new ScanCommand({
          TableName: 'Users',
          FilterExpression: '#isAdmin = :isAdmin',
          ExpressionAttributeValues: marshall({ ':isAdmin': true }),
          ExpressionAttributeNames: { '#isAdmin': 'isAdmin' }
        });
        
        const result = await client.send(command);
        return result.Items && result.Items.length > 0 
          ? (unmarshall(result.Items[0]) as Users) 
          : null;
      });
    }
  },

  // Payments operations
  payments: {
    create: async (paymentData: Payment): Promise<Payment> => {
      return executeDbCommand(async () => {
        const command = new PutItemCommand({
          TableName: 'Payments',
          Item: marshall(paymentData)
        });
        await client.send(command);
        return paymentData;
      });
    },

    findById: async (paymentId: string): Promise<Payment | null> => {
      return executeDbCommand(async () => {
        const command = new GetItemCommand({
          TableName: 'Payments',
          Key: marshall({ paymentId })
        });
        
        const result = await client.send(command);
        return result.Item ? (unmarshall(result.Item) as Payment) : null;
      });
    },

    findByUser: async (userId: string): Promise<Payment[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Payments',
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: marshall({ ':userId': userId })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item) as Payment) || [];
      });
    }
  },

  // Tickets operations
  tickets: {
    create: async (ticketData: Ticket): Promise<Ticket> => {
      return executeDbCommand(async () => {
        const command = new PutItemCommand({
          TableName: 'Tickets',
          Item: marshall(ticketData)
        });
        await client.send(command);
        return ticketData;
      });
    },

    findMany: async (): Promise<Ticket[]> => {
      return executeDbCommand(async () => {
        const command = new ScanCommand({
          TableName: 'Tickets'
        });
        
        const data = await client.send(command);
        return data.Items?.map((item) => unmarshall(item) as Ticket) || [];
      });
    },

    findByUser: async (userId: string): Promise<Ticket[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Tickets',
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: marshall({ ':userId': userId })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item) as Ticket) || [];
      });
    },

    findByEvent: async (eventId: string, zone: string): Promise<Ticket[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Tickets',
          IndexName: 'eventId-index',
          KeyConditionExpression: 'eventId = :eventId',
          FilterExpression: 'zone = :zone',
          ExpressionAttributeValues: marshall({
            ':eventId': eventId,
            ':zone': zone
          })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item) as Ticket) || [];
      });
    },

    findAvailableByEvent: async (eventId: string, zone: string, quantity: number): Promise<Ticket[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Tickets',
          IndexName: 'eventId-index',
          KeyConditionExpression: 'eventId = :eventId',
          FilterExpression: 'zone = :zone AND #status = :status',
          ExpressionAttributeValues: marshall({
            ':eventId': eventId,
            ':zone': zone,
            ':status': 'available'
          }),
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          Limit: quantity
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item) as Ticket) || [];
      });
    },

    findById: async (ticketId: string): Promise<Ticket | null> => {
      return executeDbCommand(async () => {
        const command = new GetItemCommand({
          TableName: 'Tickets',
          Key: marshall({ ticketId })
        });
        
        const result = await client.send(command);
        return result.Item ? (unmarshall(result.Item) as Ticket) : null;
      });
    },

    findByPayment: async (paymentId: string): Promise<Ticket[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Tickets',
          IndexName: 'paymentId-index',
          KeyConditionExpression: 'paymentId = :paymentId',
          ExpressionAttributeValues: marshall({ ':paymentId': paymentId })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item) as Ticket) || [];
      });
    },

    update: async (ticketId: string, updates: Partial<Ticket>): Promise<Ticket> => {
      return executeDbCommand(async () => {
        const currentTicket = await db.tickets.findById(ticketId);
        if (!currentTicket) throw new Error(`Ticket with ID ${ticketId} not found`);
        
        const { updateExpressions, expressionAttributeValues, expressionAttributeNames } = 
          createUpdateExpression(updates);

        const command = new UpdateItemCommand({
          TableName: 'Tickets',
          Key: marshall({ ticketId }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'ALL_NEW'
        });
        
        const result = await client.send(command);
        return result.Attributes ? (unmarshall(result.Attributes) as Ticket) : { ...currentTicket, ...updates };
      });
    }
  },

  bookings: {
    create: async (bookingData: Booking): Promise<Booking> => {
      return executeDbCommand(async () => {
        const command = new PutItemCommand({
          TableName: 'Bookings',
          Item: marshall(bookingData)
        });
        await client.send(command);
        return bookingData;
      });
    },
    createIntent: async (bookingData: Booking): Promise<Booking> => {
      return executeDbCommand(async () => {
        const command = new PutItemCommand({
          TableName: 'Bookings',
          Item: marshall(bookingData)
        });
        await client.send(command);
        return bookingData;
      });
    },
    findIntentByToken: async (bookingToken: string): Promise<Booking | null> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Bookings',
          IndexName: 'bookingToken-index',
          KeyConditionExpression: 'bookingToken = :token',
          ExpressionAttributeValues: marshall({ ':token': bookingToken }),
          Limit: 1
        });
        
        const result = await client.send(command);
        return result.Items && result.Items.length > 0 
          ? (unmarshall(result.Items[0]) as Booking) 
          : null;
      });
    },
    scanAllBookings: async (): Promise<Booking[]> => {
      return executeDbCommand(async () => {
        console.log('Scanning all bookings...');
        const command = new ScanCommand({
          TableName: 'Bookings'
        });
        
        const result = await client.send(command);
        console.log(`Found ${result.Items?.length || 0} bookings in scan`);
        return result.Items?.map(item => unmarshall(item) as Booking) || [];
      });
    }
  },
  
  scanTable: async (tableName: string): Promise<any[]> => {
    return executeDbCommand(async () => {
      console.log(`Scanning table: ${tableName}`);
      const command = new ScanCommand({
        TableName: tableName
      });
      
      const result = await client.send(command);
      console.log(`Found ${result.Items?.length || 0} items in ${tableName}`);
      return result.Items?.map(item => unmarshall(item)) || [];
    });
  },

  transaction: async (callback: (transaction: Transaction) => Promise<void>): Promise<void> => {
    const transaction = new Transaction(client);
    try {
      await callback(transaction);
      await transaction.commit();
    } catch (error) {
      console.error('Transaction execution failed:', error);
      throw error;
    }
  }
};

export default db;