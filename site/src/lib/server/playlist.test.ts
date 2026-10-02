import { describe, expect, it } from 'vitest';
import { parseEmbedPage } from './playlist';

const page = (trackList: unknown) =>
	`<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
		props: { pageProps: { state: { data: { entity: { type: 'playlist', trackList } } } } }
	})}</script></html>`;

describe('parseEmbedPage', () => {
	it('takes playable tracks’ ids and durations, never their titles', () => {
		const tracks = parseEmbedPage(
			page([
				{ uri: 'spotify:track:7amZOsSt4VuR9WTwXUo2R1', duration: 68928, title: 'One', isPlayable: true },
				{ uri: 'spotify:track:0wQCVBiCJfpjjeQr0bhyiX', duration: 60116, title: 'Two', isPlayable: false },
				{ uri: 'spotify:episode:5VD0r0qDYCJvYGNO5wX4ch', duration: 1000, title: 'Podcast', isPlayable: true }
			])
		);
		expect(tracks).toEqual([{ trackId: '7amZOsSt4VuR9WTwXUo2R1', durationMs: 68928 }]);
	});

	it('returns null when the page has changed shape', () => {
		expect(parseEmbedPage('<html></html>')).toBeNull();
		expect(parseEmbedPage(page(undefined))).toBeNull();
	});
});
