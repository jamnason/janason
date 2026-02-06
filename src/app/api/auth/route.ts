import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const sitePassword = process.env.SITE_PASSWORD;

    // 如果没有设置密码，则默认通过
    if (!sitePassword) {
      return NextResponse.json({ success: true });
    }

    if (password === sitePassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
