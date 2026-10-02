import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';
import { keepIntroForDedication } from './intros';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export type Dedication = { id: string; spotifyUri: string | null; createdAt: number; lastOpenedAt: number | null };

/** 128 random bits, URL-safe: unguessable, so the link is the only way in. */
const newId = () =>
	btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

/**
 * Turn a held Intro into a Dedication. Each Intro becomes at most one Dedication: sending the
 * same Intro again returns the link already made.
 */
export async function createDedication(introId: string, spotifyUri: string | null): Promise<string> {
	const claim = `intro#${introId}`;
	const id = newId();
	try {
		await db.send(
			new PutCommand({
				TableName: Resource.Dedications.name,
				Item: { id: claim, dedicationId: id },
				ConditionExpression: 'attribute_not_exists(id)'
			})
		);
	} catch (e) {
		if (!(e instanceof ConditionalCheckFailedException)) throw e;
		const { Item } = await db.send(new GetCommand({ TableName: Resource.Dedications.name, Key: { id: claim } }));
		return Item!.dedicationId;
	}
	await keepIntroForDedication(introId, id);
	const now = Date.now();
	await db.send(
		new PutCommand({
			TableName: Resource.Dedications.name,
			Item: { id, spotifyUri, createdAt: now, lastOpenedAt: null } satisfies Dedication
		})
	);
	return id;
}

export async function getDedication(id: string): Promise<Dedication | null> {
	if (!/^[A-Za-z0-9_-]{22}$/.test(id)) return null;
	const { Item } = await db.send(new GetCommand({ TableName: Resource.Dedications.name, Key: { id } }));
	return Item && 'createdAt' in Item ? (Item as Dedication) : null;
}

/** Fade (ticket 12) uses this to tell which Dedications nobody has opened for 30 days. */
export async function markOpened(id: string) {
	await db.send(
		new UpdateCommand({
			TableName: Resource.Dedications.name,
			Key: { id },
			UpdateExpression: 'SET lastOpenedAt = :now',
			ConditionExpression: 'attribute_exists(id)',
			ExpressionAttributeValues: { ':now': Date.now() }
		})
	);
}
