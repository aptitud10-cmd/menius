export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO = 'menius';

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const token = process.env.GITHUB_TOKEN;
    if (!token) return NextResponse.json({ error: 'Missing GITHUB_TOKEN' }, { status: 500 });

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=20`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `GitHub API: ${res.status}` }, { status: 502 });
    }

    const commits = await res.json() as Array<{
      sha: string;
      commit: {
        message: string;
        author: { name: string; date: string };
      };
      html_url: string;
    }>;

    return NextResponse.json({
      commits: commits.map(c => ({
        sha: c.sha.slice(0, 7),
        fullSha: c.sha,
        message: c.commit.message.split('\n')[0].slice(0, 100),
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
