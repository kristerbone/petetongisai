import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Resource } from 'sst';
import { z } from 'zod';
import { INTRO_RULES } from './intro-check-rules';

const client = new Anthropic({ apiKey: Resource.AnthropicApiKey.value, timeout: 10_000, maxRetries: 1 });

const Verdict = z.object({ allowed: z.boolean() });

/** Ask Claude Haiku whether Pete can say this line. Throws if the check itself fails, so callers fail closed. */
export async function checkIntro(text: string): Promise<boolean> {
	const response = await client.messages.parse({
		model: 'claude-haiku-4-5',
		max_tokens: 256,
		system: INTRO_RULES,
		messages: [{ role: 'user', content: `<intro>${text}</intro>` }],
		output_config: { format: zodOutputFormat(Verdict) }
	});
	if (response.stop_reason === 'refusal') return false;
	if (!response.parsed_output) throw new Error(`Intro check returned no verdict (${response.stop_reason})`);
	return response.parsed_output.allowed;
}
