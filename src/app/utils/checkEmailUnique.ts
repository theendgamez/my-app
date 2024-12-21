import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

export async function checkEmailUnique(email: string): Promise<boolean> {
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

  return queryResult.Count === 0;
}