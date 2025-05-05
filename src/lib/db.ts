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
import { Events, Users, Payment, Ticket, Booking, Friendship } from '@/types';

/**
 * Initialize DynamoDB client with environment credentials
 */
const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Creates a DynamoDB update expression from an object of updates
 * @param updates - Object containing fields to update
 * @returns Object with expression components for DynamoDB update
 */
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

/**
 * Error handling wrapper for database operations
 * @param operation - Async function to execute
 * @returns Result of the operation
 * @throws Enhanced error with context
 */
async function executeDbCommand<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database operation failed:`, error);
    throw new Error(`Database operation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transaction implementation for atomic operations
 */
export class Transaction {
  private writeItems: TransactWriteItem[] = [];
  private client: DynamoDBClient;

  constructor(client: DynamoDBClient) {
    this.client = client;
  }

  /**
   * Payment operations within a transaction
   */
  payments = {
    /**
     * Creates a payment within the transaction
     * @param payment - Payment data
     */
    create: async (payment: Payment): Promise<void> => {
      this.writeItems.push({
        Put: {
          TableName: 'Payments',
          Item: marshall(payment, { removeUndefinedValues: true })
        }
      });
    }
  };

  /**
   * Booking operations within a transaction
   */
  bookings = {
    /**
     * Updates a booking within the transaction
     * @param bookingToken - Booking token identifier
     * @param updates - Fields to update
     */
    update: async (bookingToken: string, updates: Partial<Booking>): Promise<void> => {
      const { updateExpressions, expressionAttributeValues, expressionAttributeNames } = 
        createUpdateExpression(updates);

      this.writeItems.push({
        Update: {
          TableName: 'Bookings',
          Key: marshall({ bookingToken }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: marshall(expressionAttributeValues, { removeUndefinedValues: true }),
          ExpressionAttributeNames: expressionAttributeNames
        }
      });
    }
  };

  /**
   * Event operations within a transaction
   */
  events = {
    /**
     * Updates zone remaining tickets within the transaction
     * @param eventId - Event identifier
     * @param zoneName - Zone name to update
     * @param newRemaining - New remaining tickets count
     */
    updateZoneRemaining: async (eventId: string, zoneName: string, newRemaining: number): Promise<void> => {
      // First we need to get the current event to find the zone index
      const currentEvent = await db.events.findById(eventId);
      if (!currentEvent) throw new Error(`Event with ID ${eventId} not found`);
      
      const zones = currentEvent.zones || [];
      const zoneIndex: number = zones.findIndex((zone: { name: string }) => zone.name === zoneName);
      
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

  /**
   * Ticket operations within a transaction
   */
  tickets = {
    /**
     * Creates a ticket within the transaction
     * @param ticket - Ticket data
     */
    create: async (ticket: Ticket): Promise<void> => {
      this.writeItems.push({
        Put: {
          TableName: 'Tickets',
          Item: marshall(ticket, { removeUndefinedValues: true })
        }
      });
    }
  };

  /**
   * Commits the transaction to the database
   * @throws Error if the transaction fails
   */
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

/**
 * Type definition for the database handler
 */
interface DbHandler {
  events: {
    findMany(): Promise<Events[]>;
    create(data: Events): Promise<Events>;
    findById(eventId: string): Promise<Events | null>;
    update(eventId: string, updates: Partial<Events>): Promise<Events>;
    delete(eventId: string): Promise<void>;
    updateZoneProperty(
      eventId: string,
      zoneName: string,
      propertyName: string,
      newValue: string | number
    ): Promise<{ zoneName: string; [key: string]: string | number }>;
    updateZoneMax(eventId: string, zoneName: string, newMax: number): Promise<{ zoneName: string; [key: string]: string | number }>;
    updateZoneRemaining(eventId: string, zoneName: string, newRemaining: number): Promise<{ zoneName: string; [key: string]: string | number }>;
  };
  users: {
    findMany(): Promise<Users[]>;
    findByVerificationCode(verificationCode: string): Promise<Users | null>;
    findByEmail(email: string): Promise<Users | null>;
    findById(userId: string): Promise<Users | null>;
    create(data: Users): Promise<Users>;
    update(userId: string, updates: Partial<Users>): Promise<Users>;
    delete(userId: string): Promise<void>;
    getAdmin(): Promise<Users | null>;
  };
  payments: {
    create(paymentData: Payment): Promise<Payment>;
    findById(paymentId: string): Promise<Payment | null>;
    findByUser(userId: string): Promise<Payment[]>;
    findMany(): Promise<Payment[]>;
    update(paymentId: string, updates: Partial<Payment>): Promise<Payment>;
  };
  tickets: {
    create(ticketData: Ticket): Promise<Ticket>;
    findMany(): Promise<Ticket[]>;
    findByUser(userId: string): Promise<Ticket[]>;
    findByEvent(eventId: string, zone: string): Promise<Ticket[]>;
    findAvailableByEvent(eventId: string, zone: string, quantity: number): Promise<Ticket[]>;
    findById(ticketId: string): Promise<Ticket | null>;
    findByPayment(paymentId: string): Promise<Ticket[]>;
    update(ticketId: string, updates: Partial<Ticket>): Promise<Ticket>;
    transfer(ticketId: string, newUserId: string, newUserRealName: string): Promise<Ticket>;
  };
  bookings: {
    create(bookingData: Booking): Promise<Booking>;
    createIntent(bookingData: Booking): Promise<Booking>;
    findIntentByToken(bookingToken: string): Promise<Booking | null>;
    scanAllBookings(): Promise<Booking[]>;
    findByUser(userId: string): Promise<Booking[]>;
    delete(bookingToken: string): Promise<void>;
  };
  registration: {
    findByToken(registrationToken: string): Promise<unknown | null>;
    create(data: unknown): Promise<unknown>;
    update(registrationToken: string, updates: Partial<unknown>): Promise<unknown>;
    delete(registrationToken: string): Promise<void>;
    findByUser(userId: string): Promise<unknown[]>;
    findByEvent(eventId: string): Promise<unknown[]>;
    findByEventAndUser(eventId: string, userId: string): Promise<unknown[]>;
    findByEventAndStatus(eventId: string, status: string): Promise<unknown[]>;
    findByUserRecentDrawn(userId: string): Promise<unknown[]>;
    findMany(): Promise<unknown[]>;
  };
  lottery: {
    create(data: unknown): Promise<unknown>;
    findById(lotteryId: string): Promise<unknown | null>;
    findByEvent(eventId: string): Promise<unknown[]>;
    findByUserAndEvent(userId: string, eventId: string): Promise<unknown[]>;
  };
  friends: {
    create(friendshipData: Friendship): Promise<Friendship>;
    findById(friendshipId: string): Promise<Friendship | null>;
    findByUser(userId: string): Promise<Friendship[]>;
    findPendingByUser(userId: string): Promise<Friendship[]>;
    findByUsers(userId1: string, userId2: string): Promise<Friendship | null>;
    accept(friendshipId: string): Promise<Friendship>;
    reject(friendshipId: string): Promise<void>;
    remove(friendshipId: string): Promise<void>;
  };
  scanTable(tableName: string): Promise<unknown[]>;
  transaction<T>(callback: (trx: DbHandler) => Promise<T>): Promise<T>;
}

/**
 * Database handler with operations for all entity types
 */ 
export const db: DbHandler = {
  /**
   * Event-related database operations
   */
  events: {
    /**
     * Retrieves all events
     * @returns Array of events
     */
    findMany: async (): Promise<Events[]> => {
      return executeDbCommand(async () => {
        const command = new ScanCommand({ TableName: 'Events' });
        const data = await client.send(command);
        return data.Items?.map((item) => unmarshall(item) as Events) || [];
      });
    },

    /**
     * Creates a new event
     * @param data - Event data
     * @returns Created event
     */
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

    /**
     * Finds an event by ID
     * @param eventId - Event identifier
     * @returns Event or null if not found
     */
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

    /**
     * Updates an event
     * @param eventId - Event identifier
     * @param updates - Fields to update
     * @returns Updated event
     */
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

    /**
     * Deletes an event
     * @param eventId - Event identifier
     */
    delete: async (eventId: string): Promise<void> => {
      return executeDbCommand(async () => {
        const command = new DeleteItemCommand({
          TableName: 'Events',
          Key: marshall({ eventId })
        });
        await client.send(command);
      });
    },

    /**
     * Updates a specific property of an event zone
     * @param eventId - Event identifier
     * @param zoneName - Zone name
     * @param propertyName - Property to update
     * @param newValue - New value
     * @returns Object with updated details
     */
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
        const zoneIndex: number = zones.findIndex((zone: { name: string }) => zone.name === zoneName);
        
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
    
    /**
     * Updates the maximum tickets for a zone
     * @param eventId - Event identifier
     * @param zoneName - Zone name
     * @param newMax - New maximum value
     */
    updateZoneMax: async (eventId: string, zoneName: string, newMax: number) => {
      return db.events.updateZoneProperty(eventId, zoneName, 'max', newMax);
    },
    
    /**
     * Updates the remaining tickets for a zone
     * @param eventId - Event identifier
     * @param zoneName - Zone name
     * @param newRemaining - New remaining value
     */
    updateZoneRemaining: async (eventId: string, zoneName: string, newRemaining: number) => {
      // BUGFIX: Change 'remaining' to 'zoneQuantity' to match the actual property name in the database
      return db.events.updateZoneProperty(eventId, zoneName, 'zoneQuantity', newRemaining);
    }
  },

  /**
   * User-related database operations
   */
  users: {
    /**
     * Retrieves all users
     * @returns Array of users
     */
    findMany: async (): Promise<Users[]> => {
      return executeDbCommand(async () => {
        const command = new ScanCommand({ TableName: 'Users' });
        const data = await client.send(command);
        return data.Items?.map((item) => unmarshall(item) as Users) || [];
      });
    },


    /**
     * Finds a user by verification code
     * @param verificationCode - Verification code
     * @returns User or null if not found
     */
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

    /**
     * Finds a user by email
     * @param email - User email
     * @returns User or null if not found
     */
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

    /**
     * Finds a user by ID
     * @param userId - User identifier
     * @returns User or null if not found
     */
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

    /**
     * Creates a new user
     * @param data - User data
     * @returns Created user
     */
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

    /**
     * Updates a user
     * @param userId - User identifier
     * @param updates - Fields to update
     * @returns Updated user
     */
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

    /**
     * Deletes a user
     * @param userId - User identifier
     */
    delete: async (userId: string): Promise<void> => {
      return executeDbCommand(async () => {
        const command = new DeleteItemCommand({
          TableName: 'Users',
          Key: marshall({ userId })
        });
        await client.send(command);
      });
    },

    /**
     * Finds admin users
     * @returns Admin user or null if not found
     */
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

  /**
   * Payment-related database operations
   */
  payments: {
    /**
     * Creates a new payment
     * @param paymentData - Payment data
     * @returns Created payment
     */
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

    /**
     * Finds a payment by ID
     * @param paymentId - Payment identifier
     * @returns Payment or null if not found
     */
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

    /**
     * Finds payments by user
     * @param userId - User identifier
     * @returns Array of payments
     */
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
    },

    findMany : async (): Promise<Payment[]> => {
      return executeDbCommand(async () => {
        const command = new ScanCommand({
          TableName: 'Payments'
        });
        
        const data = await client.send(command);
        return data.Items?.map((item) => unmarshall(item) as Payment) || [];
      });
    },
    update : async (paymentId: string, updates: Partial<Payment>): Promise<Payment> => {
      return executeDbCommand(async () => {
        const currentPayment = await db.payments.findById(paymentId);
        if (!currentPayment) throw new Error(`Payment with ID ${paymentId} not found`);
        
        const { updateExpressions, expressionAttributeValues, expressionAttributeNames } = 
          createUpdateExpression(updates);

        const command = new UpdateItemCommand({
          TableName: 'Payments',
          Key: marshall({ paymentId }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'ALL_NEW'
        });
        
        const result = await client.send(command);
        return result.Attributes ? (unmarshall(result.Attributes) as Payment) : { ...currentPayment, ...updates };
      });
    }
  },

  /**
   * Ticket-related database operations
   */
  tickets: {
    /**
     * Creates a new ticket
     * @param ticketData - Ticket data
     * @returns Created ticket
     */
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

    /**
     * Retrieves all tickets
     * @returns Array of tickets
     */
    findMany: async (): Promise<Ticket[]> => {
      return executeDbCommand(async () => {
        const command = new ScanCommand({
          TableName: 'Tickets'
        });
        
        const data = await client.send(command);
        return data.Items?.map((item) => unmarshall(item) as Ticket) || [];
      });
    },

    /**
     * Finds tickets by user
     * @param userId - User identifier
     * @returns Array of tickets
     */
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

    /**
     * Finds tickets by event and zone
     * @param eventId - Event identifier
     * @param zone - Zone name
     * @returns Array of tickets
     */
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

    /**
     * Finds available tickets by event and zone
     * @param eventId - Event identifier
     * @param zone - Zone name
     * @param quantity - Maximum number of tickets to return
     * @returns Array of available tickets
     */
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

    /**
     * Finds a ticket by ID
     * @param ticketId - Ticket identifier
     * @returns Ticket or null if not found
     */
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

    /**
     * Finds tickets by payment
     * @param paymentId - Payment identifier
     * @returns Array of tickets
     */
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

    /**
     * Updates a ticket
     * @param ticketId - Ticket identifier
     * @param updates - Fields to update
     * @returns Updated ticket
     */
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
    },

    /**
     * Transfer ticket to another user
     * @param ticketId - Ticket identifier
     * @param newUserId - New user identifier
     * @param newUserRealName - New user's real name
     * @returns Updated ticket
     */
    transfer: async (ticketId: string, newUserId: string, newUserRealName: string): Promise<Ticket> => {
      return executeDbCommand(async () => {
        const currentTicket = await db.tickets.findById(ticketId);
        if (!currentTicket) throw new Error(`Ticket with ID ${ticketId} not found`);
        
        const command = new UpdateItemCommand({
          TableName: 'Tickets',
          Key: marshall({ ticketId }),
          UpdateExpression: 'SET userId = :newUserId, userRealName = :newUserRealName, transferredAt = :transferredAt',
          ExpressionAttributeValues: marshall({
            ':newUserId': newUserId,
            ':newUserRealName': newUserRealName,
            ':transferredAt': new Date().toISOString()
          }),
          ReturnValues: 'ALL_NEW'
        });
        
        const result = await client.send(command);
        return result.Attributes ? unmarshall(result.Attributes) as Ticket : {
          ...currentTicket,
          userId: newUserId,
          userRealName: newUserRealName
        } as Ticket;
      });
    }
  },

  /**
   * Booking-related database operations
   */
  bookings: {
    /**
     * Creates a new booking
     * @param bookingData - Booking data
     * @returns Created booking
     */
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

    /**
     * Creates a booking intent (preliminary booking)
     * @param bookingData - Booking data
     * @returns Created booking intent
     */
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

    /**
     * Finds a booking intent by token
     * @param bookingToken - Booking token
     * @returns Booking or null if not found
     */
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

    /**
     * Retrieves all bookings
     * @returns Array of bookings
     */
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
    },

    /**
     * Finds bookings by user
     * @param userId - User identifier
     * @returns Array of bookings
     */
    findByUser: async (userId: string): Promise<Booking[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Bookings',
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: marshall({ ':userId': userId })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item) as Booking) || [];
      });
    },

    /**
     * Deletes a booking
     * @param bookingToken - Booking token
     */
    delete: async (bookingToken: string): Promise<void> => {
      return executeDbCommand(async () => {
        const command = new DeleteItemCommand({
          TableName: 'Bookings',
          Key: marshall({ bookingToken })
        });
        await client.send(command);
      });
    },
  },

  registration: {
    /**
     * Finds a registration by token
     * @param registrationToken - Registration token
     * @returns Registration or null if not found
     */
    findByToken: async (registrationToken: string): Promise<unknown | null> => {
      return executeDbCommand(async () => {
        try {
          // Use GetItemCommand instead of QueryCommand since registrationToken is the primary key
          const command = new GetItemCommand({
            TableName: 'Registration',
            Key: marshall({ registrationToken })
          });
          
          const result = await client.send(command);
          return result.Item ? unmarshall(result.Item) : null;
        } catch (error) {
          // If primary key access fails for some reason, fall back to scan
          console.warn('Primary key lookup failed, falling back to scan:', error);
          const scanCommand = new ScanCommand({
            TableName: 'Registration',
            FilterExpression: 'registrationToken = :token',
            ExpressionAttributeValues: marshall({ ':token': registrationToken }),
            Limit: 1
          });
          
          const scanResult = await client.send(scanCommand);
          return scanResult.Items && scanResult.Items.length > 0 
            ? unmarshall(scanResult.Items[0]) 
            : null;
        }
      });
    },
    create: async (data: unknown): Promise<unknown> => {
      return executeDbCommand(async () => {
        const command = new PutItemCommand({
          TableName: 'Registration',
          Item: marshall(data)
        });
        await client.send(command);
        return data;
      });
    },
    update: async (registrationToken: string, updates: Partial<unknown>): Promise<unknown> => {
      return executeDbCommand(async () => {
        const currentRegistration = await db.registration.findByToken(registrationToken);
        if (!currentRegistration) throw new Error(`Registration with token ${registrationToken} not found`);
        
        const { updateExpressions, expressionAttributeValues, expressionAttributeNames } = 
          createUpdateExpression(updates);

        const command = new UpdateItemCommand({
          TableName: 'Registration',
          Key: marshall({ registrationToken }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'ALL_NEW'
        });
        
        const result = await client.send(command);
        return result.Attributes ? unmarshall(result.Attributes) : { ...currentRegistration, ...updates };
      });
    },
    delete: async (registrationToken: string): Promise<void> => {
      return executeDbCommand(async () => {
        const command = new DeleteItemCommand({
          TableName: 'Registration',
          Key: marshall({ registrationToken })
        });
        await client.send(command);
      });
    },
    findByUser: async (userId: string): Promise<unknown[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Registration',
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: marshall({ ':userId': userId })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item)) || [];
      });
    },
    findByEvent: async (eventId: string): Promise<unknown[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Registration',
          IndexName: 'eventId-index',
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: marshall({ ':eventId': eventId })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item)) || [];
      });
    },
    findByEventAndUser: async (eventId: string, userId: string): Promise<unknown[]> => {
      return executeDbCommand(async () => {
        // First, try to query using the userId index which is more likely to exist
        try {
          const command = new QueryCommand({
            TableName: 'Registration',
            IndexName: 'userId-index',
            KeyConditionExpression: 'userId = :userId',
            FilterExpression: 'eventId = :eventId',
            ExpressionAttributeValues: marshall({ 
              ':userId': userId,
              ':eventId': eventId 
            })
          });
          
          const result = await client.send(command);
          return result.Items?.map(item => unmarshall(item)) || [];
        } catch (error) {
          console.warn('Failed to query by userId-index with filter, falling back to scan:', error);
          
          // If the above fails, fall back to a scan operation with filters
          // This is less efficient but more reliable if indexes are missing
          const command = new ScanCommand({
            TableName: 'Registration',
            FilterExpression: 'eventId = :eventId AND userId = :userId',
            ExpressionAttributeValues: marshall({ 
              ':eventId': eventId,
              ':userId': userId 
            })
          });
          
          const result = await client.send(command);
          return result.Items?.map(item => unmarshall(item)) || [];
        }
      });
    },
    findByEventAndStatus: async (eventId: string, status: string): Promise<unknown[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Registration',
          IndexName: 'eventId-status-index',
          KeyConditionExpression: 'eventId = :eventId AND status = :status',
          ExpressionAttributeValues: marshall({ ':eventId': eventId, ':status': status })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item)) || [];
      });
    },
    findByUserRecentDrawn: async (userId: string): Promise<unknown[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Registration',
          IndexName: 'userId-recentDrawn-index',
          KeyConditionExpression: 'userId = :userId AND recentDrawn = :recentDrawn',
          ExpressionAttributeValues: marshall({ ':userId': userId, ':recentDrawn': true })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item)) || [];
      });
    },
    /**
     * Retrieves all registrations
     * @returns Array of registrations
     */
    findMany: async (): Promise<unknown[]> => {
      return executeDbCommand(async () => {
        const command = new ScanCommand({
          TableName: 'Registration'
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item)) || [];
      });
    },
  },
  lottery: {
    /**
     * Finds a lottery by ID
     * @param lotteryId - Lottery identifier
     * @returns Lottery or null if not found
     */
    create : async (data: unknown): Promise<unknown> => {
      return executeDbCommand(async () => {
        const command = new PutItemCommand({
          TableName: 'Lottery',
          Item: marshall(data)
        });
        await client.send(command);
        return data;
      });
    },
    findById: async (lotteryId: string): Promise<unknown | null> => {
      return executeDbCommand(async () => {
        const command = new GetItemCommand({
          TableName: 'Lottery',
          Key: marshall({ lotteryId })
        });
        
        const result = await client.send(command);
        return result.Item ? unmarshall(result.Item) : null;
      });
    },
    /**
     * Finds lotteries by event
     * @param eventId - Event identifier
     * @returns Array of lotteries
     */
    findByEvent: async (eventId: string): Promise<unknown[]> => {
      return executeDbCommand(async () => {
        const command = new QueryCommand({
          TableName: 'Lottery',
          IndexName: 'eventId-index',
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: marshall({ ':eventId': eventId })
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item)) || [];
      });
    },
    findByUserAndEvent(
      userId: string,
      eventId: string
    ): Promise<unknown[]> {
      return executeDbCommand(async () => {
        try {
          // Try using userId index with filter instead of non-existent compound index
          const command = new QueryCommand({
            TableName: 'Lottery',
            IndexName: 'userId-index', // Use just the userId index if it exists
            KeyConditionExpression: 'userId = :userId',
            FilterExpression: 'eventId = :eventId',
            ExpressionAttributeValues: marshall({ 
              ':userId': userId, 
              ':eventId': eventId 
            })
          });
          
          const result = await client.send(command);
          return result.Items?.map(item => unmarshall(item)) || [];
        } catch (error) {
          console.warn('Failed to query by userId-index, falling back to scan:', error);
          
          // Fallback to a scan operation with filters
          const command = new ScanCommand({
            TableName: 'Lottery',
            FilterExpression: 'userId = :userId AND eventId = :eventId',
            ExpressionAttributeValues: marshall({ 
              ':userId': userId, 
              ':eventId': eventId 
            })
          });
          
          const result = await client.send(command);
          return result.Items?.map(item => unmarshall(item)) || [];
        }
      });
    }
  },

  /**
   * Friendship-related database operations
   */
  friends: {
    /**
     * Creates a new friendship request
     * @param friendshipData - Friendship data
     * @returns Created friendship
     */
    create: async (friendshipData: Friendship): Promise<Friendship> => {
      return executeDbCommand(async () => {
        // Ensure friendshipId exists - it's required as the primary key
        if (!friendshipData.friendshipId) {
          throw new Error("friendshipId is required for creating friendship records");
        }
        
        console.log("Pre-marshall data:", friendshipData);
        
        // Create completely manual DynamoDB attribute map
        const item: { [key: string]: { S: string } } = {
          friendshipId: { S: friendshipData.friendshipId },
          requesterId: { S: friendshipData.requesterId },
          requesterName: { S: friendshipData.requesterName || "" },
          recipientId: { S: friendshipData.recipientId },
          recipientName: { S: friendshipData.recipientName || "" },
          status: { S: friendshipData.status },
          createdAt: { S: friendshipData.createdAt },
          userRelationship: { S: friendshipData.userRelationship || `user#${friendshipData.requesterId}` }
        };
        
        if (friendshipData.acceptedAt) {
          item["acceptedAt"] = { S: friendshipData.acceptedAt };
        }
        
        const command = new PutItemCommand({
          TableName: 'Friendships',
          Item: item
        });
        
        
        await client.send(command);
        return friendshipData;
      });
    },
    findById: async (friendshipId: string): Promise<Friendship | null> => {
      return executeDbCommand(async () => {
        const command = new GetItemCommand({
          TableName: 'Friendships',
          Key: marshall({ friendshipId })
        });
        
        const result = await client.send(command);
        return result.Item ? (unmarshall(result.Item) as Friendship) : null;
      });
    },

    /**
     * Finds all friendships for a user
     * @param userId - User identifier
     * @returns Array of friendships
     */
    findByUser: async (userId: string): Promise<Friendship[]> => {
      return executeDbCommand(async () => {
        // Use scan operation with filters instead of the non-existent index
        const command = new ScanCommand({
          TableName: 'Friendships',
          FilterExpression: '(requesterId = :userId OR recipientId = :userId) AND #statusAttr = :status',
          ExpressionAttributeValues: marshall({ 
            ':userId': userId,
            ':status': 'accepted' 
          }),
          ExpressionAttributeNames: {
            '#statusAttr': 'status'
          }
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item) as Friendship) || [];
      });
    },

    /**
     * Finds pending friendship requests for a user
     * @param userId - User identifier
     * @returns Array of pending friendships
     */
    findPendingByUser: async (userId: string): Promise<Friendship[]> => {
      return executeDbCommand(async () => {
        // Use scan operation with filters instead of the non-existent index
        const command = new ScanCommand({
          TableName: 'Friendships',
          FilterExpression: 'recipientId = :userId AND #statusAttr = :status',
          ExpressionAttributeValues: marshall({ 
            ':userId': userId,
            ':status': 'pending' 
          }),
          ExpressionAttributeNames: {
            '#statusAttr': 'status'
          }
        });
        
        const result = await client.send(command);
        return result.Items?.map(item => unmarshall(item) as Friendship) || [];
      });
    },

    /**
     * Finds friendship between two users
     * @param userId1 - First user identifier
     * @param userId2 - Second user identifier
     * @returns Friendship or null if not found
     */
    findByUsers: async (userId1: string, userId2: string): Promise<Friendship | null> => {
      return executeDbCommand(async () => {
        // First attempt: user1 -> user2
        const command1 = new QueryCommand({
          TableName: 'Friendships',
          IndexName: 'requesterId-recipientId-index',
          KeyConditionExpression: 'requesterId = :userId1 AND recipientId = :userId2',
          ExpressionAttributeValues: marshall({ 
            ':userId1': userId1,
            ':userId2': userId2 
          })
        });
        
        let result = await client.send(command1);
        if (result.Items && result.Items.length > 0) {
          return unmarshall(result.Items[0]) as Friendship;
        }
        
        // Second attempt: user2 -> user1
        const command2 = new QueryCommand({
          TableName: 'Friendships',
          IndexName: 'requesterId-recipientId-index',
          KeyConditionExpression: 'requesterId = :userId2 AND recipientId = :userId1',
          ExpressionAttributeValues: marshall({ 
            ':userId1': userId1,
            ':userId2': userId2 
          })
        });
        
        result = await client.send(command2);
        if (result.Items && result.Items.length > 0) {
          return unmarshall(result.Items[0]) as Friendship;
        }
        
        return null;
      });
    },

    /**
     * Accept a friendship request
     * @param friendshipId - Friendship identifier
     * @returns Updated friendship
     */
    accept: async (friendshipId: string): Promise<Friendship> => {
      return executeDbCommand(async () => {
        const now = new Date().toISOString();
        const command = new UpdateItemCommand({
          TableName: 'Friendships',
          Key: marshall({ friendshipId }),
          UpdateExpression: 'SET #status = :status, acceptedAt = :acceptedAt, userRelationship = :userRelation',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: marshall({ 
            ':status': 'accepted',
            ':acceptedAt': now,
            ':userRelation': 'user#all' // Indexed for querying all users' friendships
          }),
          ReturnValues: 'ALL_NEW'
        });
        
        const result = await client.send(command);
        return result.Attributes ? unmarshall(result.Attributes) as Friendship : { 
          friendshipId,
          status: 'accepted',
          acceptedAt: now
        } as Friendship;
      });
    },

    /**
     * Reject a friendship request
     * @param friendshipId - Friendship identifier
     */
    reject: async (friendshipId: string): Promise<void> => {
      return executeDbCommand(async () => {
        const command = new DeleteItemCommand({
          TableName: 'Friendships',
          Key: marshall({ friendshipId })
        });
        
        await client.send(command);
      });
    },

    /**
     * Remove a friendship
     * @param friendshipId - Friendship identifier
     */
    remove: async (friendshipId: string): Promise<void> => {
      return executeDbCommand(async () => {
        const command = new DeleteItemCommand({
          TableName: 'Friendships',
          Key: marshall({ friendshipId })
        });
        
        await client.send(command);
      });
    }
  },

  /**
   * Scans a table for all items
   * @param tableName - Table name
   * @returns Array of items
   */
  scanTable: async (tableName: string): Promise<unknown[]> => {
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

  /**
   * Execute operations within a transaction
   * @param callback Function that executes database operations within a transaction
   */
  transaction: async <T>(callback: (trx: DbHandler) => Promise<T>): Promise<T> => {
    try {
      const result = await callback(db);
      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }
};

export default db;
