import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { env } from '$env/dynamic/private';
import { Resource } from 'sst';
import { fadeAfterDays, fadesAt, hasFaded } from './fade';
import { deleteDedicationAudio, keepIntroForDedication } from './intros';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export type Dedication = {
	id: string;
	introId: string;
	/** `spotify:track:…`, `spotify:playlist:…` or `mixcloud:/user/show/`; null when the Dedication has no music */
	music: string | null;
	createdAt: number;
	lastOpenedAt: number | null;
	/** DynamoDB TTL (epoch seconds), pushed back on every open */
	fadesAt: number;
};

const fadeDays = () => fadeAfterDays(env.FADE_AFTER_DAYS);

export class DedicationRemoved extends Error {}

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
export async function createDedication(introId: string, music: string | null): Promise<string> {
	const claim = `intro#${introId}`;
	const id = newId();
	try {
		await db.send(
			new PutCommand({
				TableName: Resource.Dedications.name,
				// Kept after a removal so the same Intro can't be re-sent; held Intros only last an
				// hour, so the claim expires after a day
				Item: { id: claim, dedicationId: id, fadesAt: fadesAt(Date.now(), 1) },
				ConditionExpression: 'attribute_not_exists(id)'
			})
		);
	} catch (e) {
		if (!(e instanceof ConditionalCheckFailedException)) throw e;
		const { Item } = await db.send(new GetCommand({ TableName: Resource.Dedications.name, Key: { id: claim } }));
		if (!(await getDedication(Item!.dedicationId))) throw new DedicationRemoved();
		return Item!.dedicationId;
	}
	await keepIntroForDedication(introId, id);
	const now = Date.now();
	await db.send(
		new PutCommand({
			TableName: Resource.Dedications.name,
			Item: { id, introId, music, createdAt: now, lastOpenedAt: null, fadesAt: fadesAt(now, fadeDays()) } satisfies Dedication
		})
	);
	return id;
}

export async function getDedication(id: string): Promise<Dedication | null> {
	if (!/^[A-Za-z0-9_-]{22}$/.test(id)) return null;
	const { Item } = await db.send(new GetCommand({ TableName: Resource.Dedications.name, Key: { id } }));
	if (!Item || !('createdAt' in Item) || hasFaded(Item, Date.now())) return null;
	// Dedications made before Mixcloud kept their Spotify link in spotifyUri
	return { ...Item, music: Item.music ?? Item.spotifyUri ?? null } as Dedication;
}

/** Opening a Dedication pushes its Fade back by the full period. */
export async function markOpened(id: string) {
	const now = Date.now();
	await db.send(
		new UpdateCommand({
			TableName: Resource.Dedications.name,
			Key: { id },
			UpdateExpression: 'SET lastOpenedAt = :now, fadesAt = :fade',
			ConditionExpression: 'attribute_exists(id)',
			ExpressionAttributeValues: { ':now': now, ':fade': fadesAt(now, fadeDays()) }
		})
	);
}

/**
 * Fade a Dedication now (ADR 0003): any visitor may, with no confirmation. Deletes the record and
 * its Intro audio together. When DynamoDB's TTL fades a record instead, the table stream
 * (functions/fader.ts) deletes the audio.
 */
export async function fadeDedication(id: string) {
	await Promise.all([
		db.send(new DeleteCommand({ TableName: Resource.Dedications.name, Key: { id } })),
		deleteDedicationAudio(id)
	]);
}
