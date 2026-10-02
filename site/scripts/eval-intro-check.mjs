#!/usr/bin/env node
// Score the Intro check's rules (src/lib/server/intro-check-rules.ts) against its test cases, with
// the same model and verdict format as the live check. Reads ANTHROPIC_API_KEY from the repo-root .env.
//   npm run eval:intro
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { INTRO_CASES, INTRO_RULES } from '../src/lib/server/intro-check-rules.ts';

process.loadEnvFile(new URL('../../.env', import.meta.url).pathname);
const client = new Anthropic();
const Verdict = z.object({ allowed: z.boolean() });

async function check(text) {
	const r = await client.messages.parse({
		model: 'claude-haiku-4-5',
		max_tokens: 256,
		system: INTRO_RULES,
		messages: [{ role: 'user', content: `<intro>${text}</intro>` }],
		output_config: { format: zodOutputFormat(Verdict) }
	});
	return r.stop_reason === 'refusal' ? false : r.parsed_output?.allowed;
}

const results = await Promise.all(INTRO_CASES.map(async (c) => ({ ...c, got: await check(c.text) })));
let wrong = 0;
for (const r of results) {
	const ok = r.got === r.allow;
	if (!ok) wrong++;
	console.log(`${ok ? 'ok  ' : 'MISS'} ${r.allow ? 'allow' : 'block'} -> ${r.got ? 'allowed' : 'blocked'}  ${r.text}`);
}
console.log(`\n${results.length - wrong}/${results.length} as expected`);
process.exitCode = wrong ? 1 : 0;
