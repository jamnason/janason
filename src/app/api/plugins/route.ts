import { NextRequest, NextResponse } from 'next/server';
import { searchAiPlugins } from '@/lib/github';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'ai plugin';
  const sort = searchParams.get('sort') || 'stars';
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const plugins = await searchAiPlugins(query, sort, page);
    return NextResponse.json(plugins);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch plugins' }, { status: 500 });
  }
}
