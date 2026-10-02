import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';
import { decide } from './rate-limit-window';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Record one Play-with-text for this IP; returns whether it's within the hourly limit. */
export async function hitPlayLimit(ip: string) {
	const key = `play#${ip}`;
	for (let attempt = 0; attempt < 3; attempt++) {
		const { Item } = await db.send(
			new GetCommand({ TableName: Resource.RateLimits.name, Key: { key }, ConsistentRead: true })
		);
		const now = Date.now();
		const result = decide(Item?.hits ?? [], now);
		if (!result.allowed) return result;
		try {
			await db.send(
				new PutCommand({
					TableName: Resource.RateLimits.name,
					Item: { key, hits: result.hits, version: (Item?.version ?? 0) + 1, expires: Math.ceil(now / 1000) + 3600 },
					// Optimistic lock: two Plays from one IP at once can't both squeeze in
					ConditionExpression: 'attribute_not_exists(#k) OR version = :v',
					ExpressionAttributeNames: { '#k': 'key' },
					ExpressionAttributeValues: { ':v': Item?.version ?? 0 }
				})
			);
			return result;
		} catch (e) {
			if (!(e instanceof ConditionalCheckFailedException)) throw e;
		}
	}
	throw new Error('Rate limit contention');
}
