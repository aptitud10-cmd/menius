/**
 * Social media auto-publishing module.
 *
 * Required env vars (per platform, leave unset to skip that platform):
 *   FACEBOOK_PAGE_ID              – numeric Facebook Page ID
 *   FACEBOOK_PAGE_ACCESS_TOKEN    – long-lived Page access token (never expires if refreshed)
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID – IG Business Account ID linked to the Page
 *   LINKEDIN_ORG_ID               – LinkedIn Organization numeric ID
 *   LINKEDIN_ACCESS_TOKEN         – OAuth 2.0 token with r_organization_social + w_member_social
 *   AUTO_PUBLISH_SOCIAL           – set to "true" to enable; anything else = dry-run (saves to DB only)
 *
 * Token notes:
 *   - Facebook/Instagram: exchange a short-lived user token for a long-lived Page token via
 *     GET /oauth/access_token?grant_type=fb_exchange_token  (lasts ~60 days, then refresh again)
 *   - LinkedIn: tokens expire every 60 days; refresh via the OAuth refresh flow.
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('social-publish');

export interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
  skipped?: boolean;
}

/* ─── Feature flag ───────────────────────────────────────────────────────── */
export function isAutoPublishEnabled(): boolean {
  return process.env.AUTO_PUBLISH_SOCIAL === 'true';
}

/* ─── Facebook ───────────────────────────────────────────────────────────── */
async function publishToFacebook(
  text: string,
  imageUrl: string | null,
): Promise<PublishResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim();
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();

  if (!pageId || !token) {
    return { platform: 'facebook', success: false, skipped: true, error: 'FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN not configured' };
  }

  try {
    let endpoint: string;
    let body: Record<string, string>;

    if (imageUrl) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body = { url: imageUrl, message: text, access_token: token };
    } else {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      body = { message: text, access_token: token };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.error?.message ?? `HTTP ${res.status}`;
      logger.error('Facebook publish failed', { error: msg });
      return { platform: 'facebook', success: false, error: msg };
    }

    const postId = data.post_id ?? data.id;
    logger.info('Facebook published', { postId });
    return { platform: 'facebook', success: true, postId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Facebook publish error', { error: msg });
    return { platform: 'facebook', success: false, error: msg };
  }
}

/* ─── Instagram ──────────────────────────────────────────────────────────── */
async function publishToInstagram(
  text: string,
  imageUrl: string | null,
): Promise<PublishResult> {
  const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();

  if (!igAccountId || !token) {
    return { platform: 'instagram', success: false, skipped: true, error: 'INSTAGRAM_BUSINESS_ACCOUNT_ID / FACEBOOK_PAGE_ACCESS_TOKEN not configured' };
  }

  if (!imageUrl) {
    return { platform: 'instagram', success: false, error: 'Instagram requires an image URL' };
  }

  try {
    // Step 1 – Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption: text, access_token: token }),
      },
    );
    const containerData = await containerRes.json();

    if (!containerRes.ok || containerData.error || !containerData.id) {
      const msg = containerData.error?.message ?? `Container HTTP ${containerRes.status}`;
      logger.error('Instagram container creation failed', { error: msg });
      return { platform: 'instagram', success: false, error: msg };
    }

    // Step 2 – Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
      },
    );
    const publishData = await publishRes.json();

    if (!publishRes.ok || publishData.error) {
      const msg = publishData.error?.message ?? `Publish HTTP ${publishRes.status}`;
      logger.error('Instagram publish failed', { error: msg });
      return { platform: 'instagram', success: false, error: msg };
    }

    logger.info('Instagram published', { postId: publishData.id });
    return { platform: 'instagram', success: true, postId: publishData.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Instagram publish error', { error: msg });
    return { platform: 'instagram', success: false, error: msg };
  }
}

/* ─── LinkedIn ───────────────────────────────────────────────────────────── */
async function publishToLinkedIn(
  text: string,
  imageUrl: string | null,
): Promise<PublishResult> {
  const orgId = process.env.LINKEDIN_ORG_ID?.trim();
  const token = process.env.LINKEDIN_ACCESS_TOKEN?.trim();

  if (!orgId || !token) {
    return { platform: 'linkedin', success: false, skipped: true, error: 'LINKEDIN_ORG_ID / LINKEDIN_ACCESS_TOKEN not configured' };
  }

  const author = `urn:li:organization:${orgId}`;
  const liHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'LinkedIn-Version': '202406',
    'X-Restli-Protocol-Version': '2.0.0',
  };

  try {
    let imageUrn: string | null = null;

    if (imageUrl) {
      // Step 1 – Initialize image upload
      const initRes = await fetch(
        'https://api.linkedin.com/rest/images?action=initializeUpload',
        {
          method: 'POST',
          headers: liHeaders,
          body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
        },
      );

      if (initRes.ok) {
        const initData = await initRes.json();
        const uploadUrl: string | undefined = initData.value?.uploadUrl;
        const urn: string | undefined = initData.value?.image;

        if (uploadUrl && urn) {
          // Step 2 – Upload binary image
          const imgRes = await fetch(imageUrl);
          const imgBuffer = await imgRes.arrayBuffer();
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: imgBuffer,
          });

          if (uploadRes.ok) {
            imageUrn = urn;
          } else {
            logger.warn('LinkedIn image upload failed, falling back to text-only', { status: uploadRes.status });
          }
        }
      } else {
        logger.warn('LinkedIn image init failed, falling back to text-only', { status: initRes.status });
      }
    }

    // Step 3 – Create post
    const postBody: Record<string, unknown> = {
      author,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    if (imageUrn) {
      postBody.content = { media: { id: imageUrn } };
    }

    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: liHeaders,
      body: JSON.stringify(postBody),
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      const msg = `LinkedIn HTTP ${postRes.status}: ${errText.slice(0, 300)}`;
      logger.error('LinkedIn publish failed', { error: msg });
      return { platform: 'linkedin', success: false, error: msg };
    }

    // LinkedIn returns the post ID in the x-restli-id header
    const postId = postRes.headers.get('x-restli-id') ?? undefined;
    logger.info('LinkedIn published', { postId });
    return { platform: 'linkedin', success: true, postId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('LinkedIn publish error', { error: msg });
    return { platform: 'linkedin', success: false, error: msg };
  }
}

/* ─── n8n Webhook dispatcher ─────────────────────────────────────────────── */
async function publishViaN8n(
  platform: string,
  text: string,
  imageUrl: string | null,
  postDbId: string | null,
): Promise<PublishResult> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { platform, success: false, skipped: true, error: 'N8N_WEBHOOK_URL not configured' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, text, image_url: imageUrl, post_db_id: postDbId }),
    });

    if (!res.ok) {
      const msg = `n8n webhook HTTP ${res.status}`;
      logger.error('n8n webhook failed', { platform, error: msg });
      return { platform, success: false, error: msg };
    }

    logger.info('n8n webhook accepted', { platform });
    return { platform, success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('n8n webhook error', { platform, error: msg });
    return { platform, success: false, error: msg };
  }
}

/* ─── Dispatcher ─────────────────────────────────────────────────────────── */
export async function publishPost(
  platform: string,
  caption: string,
  hashtags: string,
  imageUrl: string | null,
  postDbId?: string | null,
): Promise<PublishResult> {
  const text = [caption, hashtags].filter(Boolean).join('\n\n');

  if (process.env.N8N_WEBHOOK_URL?.trim()) {
    return publishViaN8n(platform, text, imageUrl, postDbId ?? null);
  }

  switch (platform) {
    case 'facebook':  return publishToFacebook(text, imageUrl);
    case 'instagram': return publishToInstagram(text, imageUrl);
    case 'linkedin':  return publishToLinkedIn(text, imageUrl);
    default:
      return { platform, success: false, error: `Unknown platform: ${platform}` };
  }
}
