import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';
import { decide, PLAYS_PER_HOUR, TRACK_ID_RENDERS_PER_HOUR } from './rate-limit-window';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Record one Play-with-text for this IP; returns whether it's within the hourly limit. */
export const hitPlayLimit = (ip: string) => hitLimit(`play#${ip}`, PLAYS_PER_HOUR);

/** Record one new Track ID render for this IP (cached lines don't count). */
export const hitTrackIdLimit = (ip: string) => hitLimit(`track-id#${ip}`, TRACK_ID_RENDERS_PER_HOUR);

async function hitLimit(key: string, limit: number) {
	for (let attempt = 0; attempt < 3; attempt++) {
		const { Item } = await db.send(
			new GetCommand({ TableName: Resource.RateLimits.name, Key: { key }, ConsistentRead: true })
		);
		const now = Date.now();
		const result = decide(Item?.hits ?? [], now, limit);
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
