export type SpotifyLink = { kind: 'track' | 'playlist'; id: string; uri: string };

const ID = '([A-Za-z0-9]{22})';
const PATTERNS = [
	// https://open.spotify.com/track/<id>?si=…, including /intl-xx/ and /embed/ variants
	new RegExp(`^https?://open\\.spotify\\.com/(?:intl-[a-z-]+/)?(?:embed/)?(track|playlist)/${ID}(?:[/?#].*)?$`),
	// spotify:track:<id>
	new RegExp(`^spotify:(track|playlist):${ID}$`)
];

/** Parse a Spotify track or playlist link. Albums, artists, podcasts and anything else return null. */
export function parseSpotifyLink(input: string): SpotifyLink | null {
	const text = input.trim();
	for (const pattern of PATTERNS) {
		const m = text.match(pattern);
		if (m) {
			const kind = m[1] as SpotifyLink['kind'];
			return { kind, id: m[2], uri: `spotify:${kind}:${m[2]}` };
		}
	}
	return null;
}
