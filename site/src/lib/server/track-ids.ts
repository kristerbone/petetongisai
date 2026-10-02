import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Resource } from 'sst';
import { trackLine, type Form, type TrackName } from '$lib/track-ids/lines';
import { modalVoice } from './modal-voice';
import { hitTrackIdLimit } from './rate-limit';
import { LookupUnavailable, lookUpTrackName } from './track-names';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

// MusicBrainz and Deezer grow; a track with no match gets looked up again after this long
const NO_MATCH_RETRY_DAYS = 30;
// A render nobody has collected by now (failed, or the GPU never came up) gets started again
const STALE_RENDER_MS = 10 * 60 * 1000;
// Between claiming a line and Modal accepting the render
const STARTING_MS = 30_000;

export type TrackIdLine =
	| { status: 'ready'; audio: Uint8Array }
	| { status: 'rendering' }
	/** Pete says a generic line instead: no name match, the spending cap, too many renders, or a lookup failed */
	| { status: 'generic'; reason: 'no-match' | 'off-air' | 'rate-limited' | 'unavailable' };

const audioKey = (trackId: string, form: Form) => `${trackId}/${form}.wav`;

/**
 * A track's line in Pete's voice. Rendered once, the first time anyone needs it, then cached for
 * everyone: the record in TrackIds says whether it's ready or which render to collect, and the
 * audio lives in the TrackIds bucket. Call it again to poll while it's rendering.
 */
export async function trackIdLine(trackId: string, form: Form, ip: string): Promise<TrackIdLine> {
	const key = `line#${trackId}#${form}`;
	const { Item } = await db.send(new GetCommand({ TableName: Resource.TrackIds.name, Key: { key } }));

	if (Item?.ready) {
		const audio = await storedAudio(trackId, form);
		if (audio) return { status: 'ready', audio };
	} else if (Item?.renderId) {
		const res = await modalVoice(`/renders/${Item.renderId}`);
		if (res.status === 200) {
			const audio = new Uint8Array(await res.arrayBuffer());
			await s3.send(
				new PutObjectCommand({ Bucket: Resource.TrackIdAudio.name, Key: audioKey(trackId, form), Body: audio, ContentType: 'audio/wav' })
			);
			await db.send(
				new UpdateCommand({ TableName: Resource.TrackIds.name, Key: { key }, UpdateExpression: 'SET ready = :t', ExpressionAttributeValues: { ':t': true } })
			);
			return { status: 'ready', audio };
		}
		if (res.status === 202 && Date.now() - Item.startedAt < STALE_RENDER_MS) return { status: 'rendering' };
		if (res.status === 402) return { status: 'generic', reason: 'off-air' };
		// Failed, gone or stuck: render it again below
	} else if (Item && Date.now() - Item.startedAt < STARTING_MS) {
		return { status: 'rendering' };
	}

	let name: TrackName | null;
	try {
		name = await trackName(trackId);
	} catch (e) {
		if (!(e instanceof LookupUnavailable)) throw e;
		console.warn('Track name lookup failed', trackId, e.message);
		return { status: 'generic', reason: 'unavailable' };
	}
	if (!name) return { status: 'generic', reason: 'no-match' };
	if (!(await hitTrackIdLimit(ip)).allowed) return { status: 'generic', reason: 'rate-limited' };

	const text = trackLine(trackId, form, name);
	try {
		await db.send(
			new PutCommand({
				TableName: Resource.TrackIds.name,
				Item: { key, text, startedAt: Date.now() },
				// Only one visitor starts each render; replacing a stale one needs the record unchanged
				ConditionExpression: 'attribute_not_exists(#k) OR startedAt = :prev',
				ExpressionAttributeNames: { '#k': 'key' },
				ExpressionAttributeValues: { ':prev': Item?.startedAt ?? 0 }
			})
		);
	} catch (e) {
		if (e instanceof ConditionalCheckFailedException) return { status: 'rendering' };
		throw e;
	}

	const res = await modalVoice('/renders', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text })
	});
	if (!res.ok) {
		await db.send(new DeleteCommand({ TableName: Resource.TrackIds.name, Key: { key } }));
		if (res.status === 402) return { status: 'generic', reason: 'off-air' };
		console.error('Track ID render refused', res.status, await res.text());
		return { status: 'generic', reason: 'unavailable' };
	}
	const { id } = await res.json();
	await db.send(
		new UpdateCommand({ TableName: Resource.TrackIds.name, Key: { key }, UpdateExpression: 'SET renderId = :id', ExpressionAttributeValues: { ':id': id } })
	);
	return { status: 'rendering' };
}

/** The track's name, looked up once and kept (a miss is retried after NO_MATCH_RETRY_DAYS). */
async function trackName(trackId: string): Promise<TrackName | null> {
	const key = `name#${trackId}`;
	const { Item } = await db.send(new GetCommand({ TableName: Resource.TrackIds.name, Key: { key } }));
	if (Item) return Item.noMatch ? null : { title: Item.title, artist: Item.artist };

	const name = await lookUpTrackName(trackId);
	await db.send(
		new PutCommand({
			TableName: Resource.TrackIds.name,
			Item: name
				? { key, ...name }
				: { key, noMatch: true, expires: Math.ceil(Date.now() / 1000) + NO_MATCH_RETRY_DAYS * 86_400 }
		})
	);
	return name;
}

async function storedAudio(trackId: string, form: Form): Promise<Uint8Array | null> {
	try {
		const obj = await s3.send(new GetObjectCommand({ Bucket: Resource.TrackIdAudio.name, Key: audioKey(trackId, form) }));
		return (await obj.Body?.transformToByteArray()) ?? null;
	} catch (e) {
		if (e instanceof NoSuchKey) return null;
		throw e;
	}
}
