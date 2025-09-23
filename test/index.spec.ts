import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Bluesky Avatar fetcher', () => {
	beforeAll(() => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
	});

	afterEach(() => fetchMock.assertNoPendingInterceptors());

	it('Adds avatar URL to key value store when cache is empty', async () => {
		const request = new IncomingRequest('http://example.com/example.com');

		fetchMock
			.get('https://public.api.bsky.app')
			.intercept({ method: 'GET', path: '/xrpc/app.bsky.actor.getProfile', query: { actor: 'example.com' } })
			.reply(200, JSON.stringify({ avatar: 'https://cdn.bsky.app/img/avatar/example.png' }));

		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env);
		await waitOnExecutionContext(ctx);

		expect(await env.avatars.get('example.com')).toBe('https://cdn.bsky.app/img/avatar/example.png');
		expect(response.headers.get('Location')).toBe(`https://cdn.bsky.app/img/avatar/example.png`);
	});

	it('Serves value from avatars key value store', async () => {
		const request = new IncomingRequest('http://example.com/example.com');

		await env.avatars.put('example.com', 'https://cdn.bsky.app/img/avatar/example.png', {
			expirationTtl: 60,
		});

		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env);
		await waitOnExecutionContext(ctx);

		expect(response.headers.get('Location')).toBe(`https://cdn.bsky.app/img/avatar/example.png`);
	});

	it('Includes edge and client caching headers in response', async () => {
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
