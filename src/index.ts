export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (!pathname || pathname === '/') {
			return Response.redirect(env.README_REDIRECT, 307);
		}

		const [actor, format] = pathname.toLowerCase().slice(1).split('@');

		let avatar = await env.avatars.get(actor);

		if (!avatar) {
			avatar = await fetch(`${env.BLUESKY_GET_PROFILE}?actor=${actor}`, { method: 'GET' })
				.then<{ avatar: string }>((response) => response.json())
				.then<string>((profile) => profile.avatar || '404');

			await env.avatars.put(actor, avatar, {
				expirationTtl: parseInt(env.CACHE_EXPIRY_TTL || 3600),
			});
		}

		if (!avatar || !avatar.startsWith(`${env.BLUESKY_CDN}/img/avatar`)) {
			return new Response(`Avatar not found for ${actor}.`, { status: 404 });
		}

		return Response.redirect(format ? avatar.replace(/@([a-z]+)$/, `@${format}`) : avatar, 307);
	},
};
