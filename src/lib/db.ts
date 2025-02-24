import { DynamoDBClient, ScanCommand, PutItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand , GetItemCommand} from "@aws-sdk/client-dynamodb";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";
import { Events, Users, Payment , Ticket} from '@/types'; // Import the interfaces

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

// Database utility
const db = {
  event: {
    findMany: async () => {
      const params = {
        TableName: 'Events',
      };
      const command = new ScanCommand(params);
      const data = await client.send(command);
      return data.Items?.map((item) => unmarshall(item)) as Events[];
    },
    create: async (data: Events) => {
      const params = {
        TableName: 'Events',
        Item: marshall(data),
      };
      const command = new PutItemCommand(params);
      await client.send(command);
      return data;
    },
    findById: async (eventId: string) => {
      const params = {
        TableName: 'Events',
        Key: marshall({ eventId }), // Ensure 'eventId' is the primary key
      };
      const command = new GetItemCommand(params);
      const result = await client.send(command);
      if (result.Item) {
        return unmarshall(result.Item) as Events;
      }
      return null;
    },
    update: async (eventId: string, updates: Partial<Events>) => {
      const updateExpressions: string[] = [];
      const expressionAttributeValues: { [key: string]: unknown } = {};
      const expressionAttributeNames: { [key: string]: string } = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeValues[`:${key}`] = value;
          expressionAttributeNames[`#${key}`] = key;
        }
      });

      const params = {
        TableName: 'Events',
        Key: marshall({ eventId }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ExpressionAttributeNames: expressionAttributeNames
      };

      const command = new UpdateItemCommand(params);
      await client.send(command);
      return updates;
    },
    delete: async (eventId: string) => {
      const params = {
        TableName: 'Events',
        Key: marshall({ eventId }),
      };
      const command = new DeleteItemCommand(params);
      await client.send(command);
    },
    updateZoneMax: async (eventId: string, zoneName: string, newMax: number) => {
      // Fetch the current item to find the index of the zone
      const getItemParams = {
        TableName: 'Events',
        Key: marshall({ eventId }),
      };
      
      const getItemCommand = new GetItemCommand(getItemParams);
      const currentItem = await client.send(getItemCommand);
      const zones = currentItem.Item ? unmarshall(currentItem.Item).zones : []; // Unmarshall the item

      // Find the index of the zone
      const zoneIndex = zones.findIndex(zone => zone.name === zoneName);
      
      if (zoneIndex === -1) {
        throw new Error(`Zone ${zoneName} not found`);
      }

      const params = {
        TableName: 'Events',
        Key: marshall({ eventId }),
        UpdateExpression: `SET zones[${zoneIndex}].#max = :newMax`,
        ExpressionAttributeValues: marshall({ ':newMax': newMax.toString() }), // Convert to string if needed
        ExpressionAttributeNames: {
          '#max': 'max', // Use a placeholder for the reserved keyword
        },
      };
      
      const command = new UpdateItemCommand(params);
      await client.send(command);
      return { zoneName, newMax };
    },
    
    // Update the zone Remaining
    updateZoneRemaining: async (eventId: string, zoneName: string, newRemaining: number) => {
      // Fetch the current item to find the index of the zone
      const getItemParams = {
        TableName: 'Events',
        Key: marshall({ eventId }),
      };
      
      const getItemCommand = new GetItemCommand(getItemParams);
      const currentItem = await client.send(getItemCommand);
      const zones = currentItem.Item ? unmarshall(currentItem.Item).zones : []; // Unmarshall the item
      
      // Find the index of the zone
      const zoneIndex = zones.findIndex(zone => zone.name === zoneName);
      
      if (zoneIndex === -1) {
        throw new Error(`Zone ${zoneName} not found`);
      }

      const params = {
        TableName: 'Events',
        Key: marshall({ eventId }),
        UpdateExpression: `SET zones[${zoneIndex}].#remaining = :newRemaining`,
        ExpressionAttributeValues: marshall({ ':newRemaining': newRemaining.toString() }), // Convert to string if needed
        ExpressionAttributeNames: {
          '#remaining': 'remaining', // Use a placeholder for the reserved keyword
        },
      };
      
      const command = new UpdateItemCommand(params);
      await client.send(command);
      return { zoneName, newRemaining };
    }
  },
  users: {
    findByVerificationCode: async (verificationCode: string): Promise<Users | null> => {
      const params = {
        TableName: 'Users',
        IndexName: 'verificationCode-index',
        KeyConditionExpression: 'verificationCode = :token',
        ExpressionAttributeValues: marshall({ ':token': verificationCode }),
        Limit: 1,
      };
      const command = new QueryCommand(params);
      const result = await client.send(command);
      if (result.Items && result.Items.length > 0) {
        return unmarshall(result.Items[0]) as Users;
      }
      return null;
    },
    findByEmail: async (email: string): Promise<Users | null> => {
      const params = {
        TableName: 'Users',
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: marshall({ ':email': email }),
        Limit: 1,
      };
      const command = new QueryCommand(params);
      const result = await client.send(command);
      if (result.Items && result.Items.length > 0) {
        return unmarshall(result.Items[0]) as Users;
      }
      return null;
    },
    create: async (data: Users) => {
      const params = {
        TableName: 'Users',
        Item: marshall(data),
      };
      const command = new PutItemCommand(params);
      await client.send(command);
      return data;
    },
    update: async (userId: string, updates: Partial<Users>) => {
      const updateExpressions: string[] = [];
      const expressionAttributeValues: { [key: string]: unknown } = {};
      const expressionAttributeNames: { [key: string]: string } = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeValues[`:${key}`] = value;
          expressionAttributeNames[`#${key}`] = key;
        }
      });

      const params = {
        TableName: 'Users',
        Key: marshall({ userId }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ExpressionAttributeNames: expressionAttributeNames
      };

      const command = new UpdateItemCommand(params);
      await client.send(command);
      return updates;
    },
    delete: async (userId: string) => {
      const params = {
        TableName: 'Users',
        Key: marshall({ userId }),
      };
      const command = new DeleteItemCommand(params);
      await client.send(command);
    },
    getAdmin: async () => {
      const params = {
        TableName: 'Users',
        FilterExpression: '#isAdmin = :isAdmin',
        ExpressionAttributeValues: marshall({ ':isAdmin': true }),
        ExpressionAttributeNames: { '#isAdmin': 'isAdmin' },
      };
      const command = new ScanCommand(params);
      const result = await client.send(command);
      if (result.Items && result.Items.length > 0) {
        return unmarshall(result.Items[0]) as Users;
      }
      return null;
    }
  },
  payments: {
    create: async (paymentData: Payment) => {
      await client.send(new PutItemCommand({
        TableName: 'Payments',
        Item: marshall(paymentData),
      }));
      return paymentData;
    },
    findById: async (paymentId: string) => {
      const params = {
        TableName: 'Payments',
        Key: marshall({ paymentId })
      };
      const result = await client.send(new GetItemCommand(params));
      return result.Item ? unmarshall(result.Item) as Payment : null;
    },
    findByUser: async (userId: string) => {
      const params = {
        TableName: 'Payments',
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: marshall({
          ':userId': userId
        })
      };
      const result = await client.send(new QueryCommand(params));
      return result.Items?.map(item => unmarshall(item) as Payment) || [];
    }
  },
  tickets: {
    create: async (ticketData: Ticket) => {
      const params = {
        TableName: 'Tickets',
        Item: marshall(ticketData),
      };
      const command = new PutItemCommand(params);
      await client.send(command);
      return ticketData;
    },
    findMany: async () => {
      const params = {
        TableName: 'Tickets',
      };
      const command = new ScanCommand(params);
      const data = await client.send(command);
      return data.Items?.map((item) => unmarshall(item)) as Ticket[];
    },
    findByUser: async (userId: string) => {
      const params = {
        TableName: 'Tickets',
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: marshall({
          ':userId': userId
        })
      };
      const result = await client.send(new QueryCommand(params));
      return result.Items?.map(item => unmarshall(item) as Ticket) || [];
    },
    findByEvent: async (eventId: string, zone: string) => {
      const params = {
        TableName: 'Tickets',
        IndexName: 'eventId-index',
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: marshall({
          ':eventId': eventId,
          ':zone': zone
        })
      };
      const result = await client.send(new QueryCommand(params));
      return result.Items?.map(item => unmarshall(item) as Ticket) || [];
    },
    findById: async (ticketId: string) => {
      const params = {
        TableName: 'Tickets',
        Key: marshall({ ticketId })
      };
      const result = await client.send(new GetItemCommand(params));
      return result.Item ? unmarshall(result.Item) as Ticket : null;
    },
    update: async (ticketId: string, updates: Partial<Ticket>) => {
      const params = {
        TableName: 'Tickets',
        Key: marshall({ ticketId }),
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeValues: marshall({ ':status': updates.status }),
        ExpressionAttributeNames: { '#status': 'status' }
      };
      await client.send(new UpdateItemCommand(params));
      return { ticketId, ...updates };
      },
  }
};

export default db;