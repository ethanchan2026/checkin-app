import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL?.trim() || 'onboarding@resend.dev';
const FORCE_SEND = process.env.FORCE_SEND === 'true';
const TARGET_EMAIL = process.env.TARGET_EMAIL?.trim().toLowerCase() || '';

const requiredConfig = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY,
};
const missingConfig = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingConfig.length > 0) {
  console.error(`❌ 缺少环境变量: ${missingConfig.join(', ')}`);
  process.exit(1);
}

// 💡 关键配置：显式禁用 auth 持久化与 realtime websocket，避免服务端环境报错
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
});

const MILESTONE_INTERVALS = [0, 1, 4, 11, 25];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getCurrentHourInTimezone(timezone = 'Asia/Shanghai') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
    return formatter.format(new Date());
  } catch (e) {
    const utcHour = new Date().getUTCHours();
    return String((utcHour + 8) % 24).padStart(2, '0');
  }
}

function getTodayStrInTimezone(timezone = 'Asia/Shanghai') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    });
    return formatter.format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

function getDaysPassed(dateStr, todayStr) {
  const start = new Date(dateStr).getTime();
  const today = new Date(todayStr).getTime();
  return Math.floor((today - start) / (1000 * 60 * 60 * 24));
}

async function run() {
  console.log('🚀 开始基于多时区调度复习任务扫描...');
  if (FORCE_SEND) {
    console.log(`🧪 手动测试模式：忽略提醒时间，仅处理 ${TARGET_EMAIL || '全部用户'}。`);
  }

  // 1. 获取所有用户的个性化配置（提醒时间 + 时区）
  const { data: profiles, error: profileErr } = await supabase
    .from('user_profiles')
    .select('user_id, reminder_time, timezone');

  if (profileErr) {
    throw new Error(`读取 user_profiles 失败: ${profileErr.message}`);
  }

  const userConfigMap = {};
  if (profiles) {
    profiles.forEach(p => {
      userConfigMap[p.user_id] = {
        reminder_time: p.reminder_time || '08:00',
        timezone: p.timezone || 'Asia/Shanghai',
      };
    });
  }

  // 2. 拉取全部资料卡片
  const { data: items, error } = await supabase
    .from('knowledge_base')
    .select('*');

  if (error || !items) {
    console.error('❌ 拉取知识库失败:', error);
    process.exit(1);
  }

  // 3. 逐个用户判断是否符合其本地时间的提醒条件
  const userTasksMap = {};

  items.forEach(item => {
    if (!item.user_email) return;
    if (TARGET_EMAIL && item.user_email.toLowerCase() !== TARGET_EMAIL) return;

    const config = userConfigMap[item.user_id] || {
      reminder_time: '08:00',
      timezone: 'Asia/Shanghai',
    };

    const userCurrentHour = getCurrentHourInTimezone(config.timezone);
    const userTodayStr = getTodayStrInTimezone(config.timezone);
    const userTargetHour = config.reminder_time.split(':')[0];

    // 如果用户所在时区的当前时刻与设定小时不符，跳过本轮
    if (!FORCE_SEND && userCurrentHour !== userTargetHour) {
      return;
    }

    const daysPassed = getDaysPassed(item.uploadDate, userTodayStr);
    let stageNumber = null;

    const milestoneIdx = MILESTONE_INTERVALS.indexOf(daysPassed);
    if (milestoneIdx !== -1) {
      stageNumber = milestoneIdx + 1;
    } else if (daysPassed > 25 && (daysPassed - 25) % 30 === 0) {
      stageNumber = 5 + Math.floor((daysPassed - 25) / 30);
    }

    if (stageNumber !== null) {
      if (!userTasksMap[item.user_email]) {
        userTasksMap[item.user_email] = {
          tasks: [],
          todayStr: userTodayStr,
          timezone: config.timezone,
        };
      }
      const title = item.title || item.subject;
      userTasksMap[item.user_email].tasks.push(
        `[${item.subject}] ${title} (第 ${stageNumber} 轮复习)`
      );
    }
  });

  const targetEmails = Object.keys(userTasksMap);
  if (targetEmails.length === 0) {
    const message = FORCE_SEND
      ? `手动测试未找到 ${TARGET_EMAIL || '任何用户'} 今天需要复习的关卡。`
      : '当前整点各时区均无需发送提醒的用户或当前时间段无待复习任务。';
    if (FORCE_SEND) {
      throw new Error(message);
    }
    console.log(`🎉 ${message}`);
    return;
  }

  // 4. 发送个性化提醒邮件
  let failedCount = 0;
  for (const email of targetEmails) {
    const { tasks, todayStr, timezone } = userTasksMap[email];
    const taskListStr = tasks.map((t, idx) => `${idx + 1}. ${t}`).join('\n');
    const taskListHtml = tasks
      .map(task => `<li style="margin: 8px 0;">${escapeHtml(task)}</li>`)
      .join('');

    console.log(`✉️ 正在向 ${email} (${timezone}) 发送 ${tasks.length} 项复习提醒...`);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `复习打卡提醒 <${SENDER_EMAIL}>`,
          to: [email],
          subject: `今日打卡提醒：你有 ${tasks.length} 个复习任务待完成`,
          text: `今天（${todayStr}）需要复习：\n\n${taskListStr}`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #16a34a;">艾宾浩斯复习打卡提醒</h2>
              <p>今天（${escapeHtml(todayStr)}）你有 <strong>${tasks.length}</strong> 个知识点需要复习：</p>
              <ol style="background: #f8fafc; padding: 16px 36px; border-radius: 12px; color: #334155;">
                ${taskListHtml}
              </ol>
              <p style="color: #64748b; font-size: 13px;">保持学习节奏，今天也要加油！</p>
            </div>
          `,
        }),
      });
      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(`Resend 返回 ${response.status}: ${JSON.stringify(responseBody)}`);
      }

      console.log(`✅ 成功发送至 ${email}，Resend ID: ${responseBody?.id}`);
    } catch (err) {
      failedCount += 1;
      console.error(`❌ 发送至 ${email} 失败:`, err);
    }
  }

  if (failedCount > 0) {
    throw new Error(`${failedCount} 封提醒邮件发送失败，请查看上方 Resend 错误。`);
  }

  console.log('🎉 定时任务调度完成！');
}

run().catch(error => {
  console.error('❌ 提醒任务失败:', error);
  process.exitCode = 1;
});
