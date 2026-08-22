import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少 Supabase 环境变量');
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

  // 1. 获取所有用户的个性化配置（提醒时间 + 时区）
  const { data: profiles, error: profileErr } = await supabase
    .from('user_profiles')
    .select('user_id, reminder_time, timezone');

  if (profileErr) {
    console.warn('⚠️ 读取 user_profiles 失败或表不存在:', profileErr.message);
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

    const config = userConfigMap[item.user_id] || {
      reminder_time: '08:00',
      timezone: 'Asia/Shanghai',
    };

    const userCurrentHour = getCurrentHourInTimezone(config.timezone);
    const userTodayStr = getTodayStrInTimezone(config.timezone);
    const userTargetHour = config.reminder_time.split(':')[0];

    // 如果用户所在时区的当前时刻与设定小时不符，跳过本轮
    if (userCurrentHour !== userTargetHour) {
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
    console.log('🎉 当前整点各时区均无需发送提醒的用户或当前时间段无待复习任务。');
    return;
  }

  // 4. 发送个性化提醒邮件
  for (const email of targetEmails) {
    const { tasks, todayStr, timezone } = userTasksMap[email];
    const taskListStr = tasks.map((t, idx) => `${idx + 1}. ${t}`).join('\n');

    console.log(`✉️ 正在向 ${email} (${timezone}) 发送 ${tasks.length} 项复习提醒...`);

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: email,
          user_email: email,
          task_count: tasks.length,
          task_list: taskListStr,
          date: todayStr,
        },
        {
          publicKey: EMAILJS_PUBLIC_KEY,
          privateKey: EMAILJS_PRIVATE_KEY,
        }
      );
      console.log(`✅ 成功发送至 ${email}`);
    } catch (err) {
      console.error(`❌ 发送至 ${email} 失败:`, err);
    }
  }

  console.log('🎉 定时任务调度完成！');
}

run();