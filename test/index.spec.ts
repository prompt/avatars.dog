import { env, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Bluesky Avatar fetcher', () => {
	beforeAll(async () => {
		fetchMock.activate();
		fetchMock.disableNetConnect();

		await env.avatars.put('cached.example', 'https://cdn.bsky.app/img/avatar/example.png', {
			expirationTtl: 60,
		});
	});

	afterEach(() => fetchMock.assertNoPendingInterceptors());

	it('Adds avatar URL to key value store when cache is empty', async () => {
		const actor = 'uncached.example';

		fetchMock
			.get('https://public.api.bsky.app')
			.intercept({ method: 'GET', path: '/xrpc/app.bsky.actor.getProfile', query: { actor } })
			.reply(200, JSON.stringify({ avatar: 'https://cdn.bsky.app/img/avatar/example.png' }));

		const response = await worker.fetch(new IncomingRequest(`https://example.com/${actor}`), env);

		expect(await env.avatars.get(actor)).toBe('https://cdn.bsky.app/img/avatar/example.png');
		expect(response.headers.get('Location')).toBe(`https://cdn.bsky.app/img/avatar/example.png`);
	});

	it('Serves value from avatars key value store', async () => {
		const response = await worker.fetch(new IncomingRequest('http://example.com/cached.example'), env);

		expect(response.headers.get('Location')).toBe(`https://cdn.bsky.app/img/avatar/example.png`);
	});

	it('Includes edge and client caching headers in response', async () => {
		const response = await worker.fetch(new IncomingRequest('http://example.com/cached.example'), env);

		expect(response.headers.get('Location')).toBe(`https://cdn.bsky.app/img/avatar/example.png`);
		expect(response.headers.get('Cache-Control')).toBe(`s-maxage=300, max-age=31536000, stale-while-revalidate=31536000`);
	});

	it('Redirects index to documentation URL', async () => {
		const response = await worker.fetch(new IncomingRequest('http://example.com'), env);
		expect(response.headers.get('Location')).toBe(`https://github.com/prompt/avatars.dog`);
	});
});
