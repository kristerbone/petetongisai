import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Resource } from 'sst';

const s3 = new S3Client({});
const HELD_FOR_MS = 60 * 60 * 1000; // Send (ticket 11) can reuse a rendered Intro for an hour

const key = (id: string) => `intros/${id}.wav`;

/** Keep a rendered Intro server-side so Send never has to upload audio from the browser. */
export async function holdIntro(id: string, wav: ArrayBuffer) {
	await s3.send(
		new PutObjectCommand({ Bucket: Resource.Intros.name, Key: key(id), Body: new Uint8Array(wav), ContentType: 'audio/wav' })
	);
}

/** A held Intro, or null if there isn't one or it's over an hour old (the bucket deletes it after a day). */
export async function heldIntro(id: string): Promise<Uint8Array | null> {
	try {
		const obj = await s3.send(new GetObjectCommand({ Bucket: Resource.Intros.name, Key: key(id) }));
		if (!obj.LastModified || Date.now() - obj.LastModified.getTime() > HELD_FOR_MS) return null;
		return (await obj.Body?.transformToByteArray()) ?? null;
	} catch (e) {
		if (e instanceof NoSuchKey) return null;
		throw e;
	}
}
