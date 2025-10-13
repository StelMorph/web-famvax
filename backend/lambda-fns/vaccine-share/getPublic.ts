import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { createHandler } from '../common/middleware';
import { docClient } from '../common/clients';

const JSON_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

const ok = (body: any) => ({
  statusCode: 200,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const err = (code: number, body: any) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

async function getItemSafe(table: string, key: Record<string, any>) {
  return docClient.send(new GetCommand({ TableName: table, Key: key }));
}

export const handler = createHandler({
  // 👇 THIS makes the endpoint public (no device/auth)
  access: { public: true },
  schema: z.object({}),
  handler: async (event: any) => {
    const debug = event?.queryStringParameters?.debug === '1';

    // 0) Read env INSIDE the handler so module init can never throw
    const LINKS_TABLE = process.env.VACCINE_SHARE_LINKS_TABLE_NAME;
    const VACCINES_TBL = process.env.VACCINES_TABLE_NAME;
    const PROFILES_TBL = process.env.PROFILES_TABLE_NAME;

    if (!LINKS_TABLE || !VACCINES_TBL || !PROFILES_TBL) {
      console.error('Missing env', { LINKS_TABLE, VACCINES_TBL, PROFILES_TBL });
      return err(500, { message: 'Internal Server Error', ...(debug ? { where: 'env' } : {}) });
    }

    try {
      const token = event?.pathParameters?.token;
      if (!token) return err(400, { message: 'Missing token' });

      // 1) token -> link
      let link;
      try {
        const res = await getItemSafe(LINKS_TABLE, { token });
        link = res.Item;
      } catch (e) {
        console.error('DDB get link failed:', e);
        return err(500, {
          message: 'Internal Server Error',
          ...(debug ? { where: 'get link' } : {}),
        });
      }
      if (!link) return err(404, { message: 'Not found' });

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = link.expiresAtEpoch ?? link.expiresAt ?? 0;
      if (!expiresAt || expiresAt <= now) return err(410, { message: 'Expired' });

      // normalize id fields
      const vaccineId = link.vaccineId ?? link.vId ?? link.vaccine_id ?? link.id;
      const profileId = link.profileId ?? link.pId ?? link.profile_id;

      if (!vaccineId) {
        console.error('Link missing vaccineId', link);
        return err(500, {
          message: 'Internal Server Error',
          ...(debug ? { where: 'link missing vaccineId' } : {}),
        });
      }
      if (!profileId) {
        console.error('Link missing profileId', link);
        return err(500, {
          message: 'Internal Server Error',
          ...(debug ? { where: 'link missing profileId' } : {}),
        });
      }

      // 2) vaccine (try both common PK names)
      let vaccine: any | undefined;
      try {
        let res = await getItemSafe(VACCINES_TBL, { vaccineId });
        vaccine = res.Item;
        if (!vaccine) {
          res = await getItemSafe(VACCINES_TBL, { id: vaccineId });
          vaccine = res.Item;
        }
      } catch (e) {
        console.error('DDB get vaccine failed:', e, { table: VACCINES_TBL, keyTried: vaccineId });
        return err(500, {
          message: 'Internal Server Error',
          ...(debug ? { where: 'get vaccine' } : {}),
        });
      }
      if (!vaccine) return err(404, { message: 'Record missing' });

      // 3) profile (best-effort, not fatal)
      let profile: any | undefined;
      try {
        let res = await getItemSafe(PROFILES_TBL, { profileId });
        profile = res.Item;
        if (!profile) {
          res = await getItemSafe(PROFILES_TBL, { id: profileId });
          profile = res.Item;
        }
      } catch (e) {
        console.error('DDB get profile failed:', e, { table: PROFILES_TBL, keyTried: profileId });
      }

      const minProfile = profile
        ? {
            profileId: profile.profileId ?? profile.id,
            name: profile.name ?? profile.fullName ?? profile.title,
          }
        : undefined;

      return ok({ token, expiresAt, profile: minProfile, vaccine });
    } catch (e) {
      console.error('getPublic fatal:', e);
      return err(500, { message: 'Internal Server Error' });
    }
  },
});
