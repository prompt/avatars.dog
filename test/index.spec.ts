import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Bluesky Avatar fetcher', () => {
	it('Serves value from avatars key value store', async () => {
		const request = new IncomingRequest('http://example.com/example.com');

		await env.avatars.put('example.com', 'https://cdn.bsky.app/img/avatar/example.png', {
			expirationTtl: 60,
		});

		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env);
		await waitOnExecutionContext(ctx);

		expect(response.headers.get('Location')).toBe(`https://cdn.bsky.app/img/avatar/example.png`);
		expect(response.headers.get('Cache-Control')).toBe(`s-maxage=300, max-age=31536000, stale-while-revalidate=31536000`);
	});

	it('Redirects index to documentation URL', async () => {
		const request = new IncomingRequest('http://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env);
		await waitOnExecutionContext(ctx);
		expect(response.headers.get('Location')).toBe(`https://github.com/prompt/avatars.dog`);
	});
});
