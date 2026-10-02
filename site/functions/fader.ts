import type { DynamoDBStreamEvent } from 'aws-lambda';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Resource } from 'sst';

const s3 = new S3Client({});

/**
 * Runs when a Dedication record is deleted, whether a visitor removed it or DynamoDB's TTL
 * faded it: deletes its Intro audio, so nothing outlives the record. (Intro claims, ids starting
 * "intro#", expire on their own and have no audio.)
 */
export async function handler(event: DynamoDBStreamEvent) {
	for (const record of event.Records) {
		const old = record.dynamodb?.OldImage;
		const id = old?.id?.S;
		if (record.eventName !== 'REMOVE' || !id || id.startsWith('intro#')) continue;
		await s3.send(new DeleteObjectCommand({ Bucket: Resource.Intros.name, Key: `dedications/${id}.wav` }));
		console.log(`faded ${id}`);
	}
}
