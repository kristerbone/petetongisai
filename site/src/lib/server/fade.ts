/** How long a Dedication lasts without being opened (ADR 0003). Set per stage in sst.config.ts. */
export function fadeAfterDays(env: string | undefined): number {
	const days = Number(env);
	return Number.isFinite(days) && days > 0 ? days : 30;
}

/** DynamoDB TTL value (epoch seconds): the moment a Dedication fades if nobody opens it again. */
export function fadesAt(openedOrCreatedMs: number, days: number): number {
	return Math.ceil(openedOrCreatedMs / 1000 + days * 86_400);
}

/** DynamoDB's TTL sweep can lag by a day or two, so expired records are treated as gone on read. */
export function hasFaded(item: { fadesAt?: number }, nowMs: number): boolean {
	return item.fadesAt !== undefined && item.fadesAt * 1000 <= nowMs;
}
