export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (!pathname || pathname === '/') {
			return Response.redirect(env.README_REDIRECT, 307);
		}

		const [actor, format] = pathname.toLowerCase().slice(1).split('@');

		let avatar = await env.avatars.get(actor);

		const expirationTtl = Number(env.CACHE_EXPIRY_TTL);

		if (!avatar) {
			avatar = await fetch(`${env.BLUESKY_GET_PROFILE}?actor=${actor}`, { method: 'GET' })
				.then<{ avatar: string }>((response) => response.json())
				.then<string>((profile) => profile.avatar || 'not-found');

			await env.avatars.put(actor, avatar, { expirationTtl });
		}

		const headers = {
			'Cache-Control': `s-maxage=${expirationTtl}, max-age=31536000, stale-while-revalidate=31536000`,
		};

		if (!avatar || !avatar.startsWith(`${env.BLUESKY_CDN}/img/avatar`)) {
			return new Response(`Avatar not found for ${actor}.`, {
				status: 404,
				headers,
			});
		}

		return new Response(null, {
			status: 307,
			headers: {
				Location: format ? avatar.replace(/@([a-z]+)$/, `@${format}`) : avatar,
				...headers,
			},
		});
	},
};
