// Copyright 2023 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import {Buffer} from 'node:buffer';
import {error, IRequest, json, Router, StatusError} from 'itty-router';


export interface Env {
    AUTH: string;
}


const router = Router();
router
    .post('/upload', uploadHandler)
    .all('*', () => error(404));

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        return router.fetch(request, env, ctx).catch(e => {
            console.log('error: ' + e.stack);
            if (e instanceof StatusError) {
                return error(e);
            }
            throw e;
        }).then(json);
    }
};


async function uploadHandler(request: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return error(401, 'missing credentials');
    }

    const prefix = 'Bearer ';
    if (!authHeader.startsWith(prefix)) {
        return error(400, 'auth should be Basic');
    }
    const token = authHeader.slice(prefix.length);
    if (token !== env.AUTH) {
        return error(401, 'invalid auth');
    }

    const digestStream = new crypto.DigestStream('SHA-256');
    if (request.body == null) {
        return error(400);
    }
    await request.body.pipeTo(digestStream);
    const digest = await digestStream.digest;
    return new Response(Buffer.from(digest).toString('base64'), {status: 200});
}
