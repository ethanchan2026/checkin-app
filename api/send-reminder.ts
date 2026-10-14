import { createClient } from '@supabase/supabase-js';

interface Request {
  method?: string;
  headers: { authorization?: string };
  body?: { itemId?: string };
}

interface Response {
  status(code: number): Response;
  json(body: unknown): unknown;
}

export default async function handler(request: Request, response: Response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return response.status(401).json({ error: '请先登录' });
  const { SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY, SENDER_EMAIL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !RESEND_API_KEY || !SENDER_EMAIL) {
    return response.status(503).json({ error: '邮件服务尚未配置完成，请检查 Vercel 环境变量' });
  }
  const itemId = request.body?.itemId;
  if (typeof itemId !== 'string' || itemId.length > 100) return response.status(400).json({ error: '资料编号无效' });
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
      },
    });
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user?.email || !user.email_confirmed_at) return response.status(401).json({ error: '请重新登录并确认邮箱' });
    const { data: item, error } = await client.from('knowledge_base').select('id,title,subject,user_id').eq('id', itemId).eq('user_id', user.id).maybeSingle();
    if (error || !item) return response.status(404).json({ error: '未找到当前账户的资料' });
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `new-card/${user.id}/${item.id}` },
      body: JSON.stringify({
        from: `复习打卡提醒 <${SENDER_EMAIL}>`,
        to: [user.email],
        subject: '新复习资料已保存',
        text: `你的资料「${item.title || item.subject}」（${item.subject}）已保存，请打开学习工作台查看复习安排。`,
      }),
    });
    const body = await result.json().catch(() => null);
    if (!result.ok) {
      console.error('Resend delivery failed', result.status, body?.message);
      return response.status(502).json({ error: 'Resend 未接受邮件，请检查已验证发件域名和服务端日志' });
    }
    return response.status(200).json({ id: body?.id });
  } catch {
    return response.status(504).json({ error: '邮件服务连接超时，请稍后重试' });
  }
}
