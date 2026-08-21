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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MILESTONE_INTERVALS = [0, 1, 4, 11, 25];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getDaysPassed(dateStr) {
  const start = new Date(dateStr).getTime();
  const today = new Date(getTodayStr()).getTime();
  return Math.floor((today - start) / (1000 * 60 * 60 * 24));
}

async function run() {
  console.log('🚀 开始扫描今日复习任务...');

  // 1. 获取当前北京时间对应的小时（如 "08", "19", "21"）
  const now = new Date();
  const beijingHour = (now.getUTCHours() + 8) % 24;
  const currentHourStr = String(beijingHour).padStart(2, '0');
  console.log(`⏰ 当前北京时间约为 ${currentHourStr}:00，正在检索该时间段需提醒的用户...`);

  // 2. 获取所有用户的个性化时间配置
  const { data: profiles, error: profileErr } = await supabase
    .from('user_profiles')
    .select('user_id, reminder_time');

  if (profileErr) {
    console.warn('⚠️ 读取 user_profiles 失败或表不存在，将采用默认全量扫描:', profileErr.message);
  }

  // 建立用户提醒时间映射表（未设置的默认 08:00）
  const userTimeMap = {};
  if (profiles) {
    profiles.forEach(p => {
      userTimeMap[p.user_id] = p.reminder_time || '08:00';
    });
  }

  // 3. 拉取所有资料卡片
  const { data: items, error } = await supabase
    .from('knowledge_base')
    .select('*');

  if (error || !items) {
    console.error('❌ 拉取知识库失败:', error);
    process.exit(1);
  }

  // 4. 按用户归类待复习任务
  const userTasksMap = {};

  items.forEach(item => {
    if (!item.user_email) return;

    // 检查该用户设置的提醒时间是否为当前小时
    const userSetTime = userTimeMap[item.user_id] || '08:00';
    const userTargetHour = userSetTime.split(':')[0];

    // 如果当前小时与用户设定的小时不符，跳过当前小时的推送
    if (userTargetHour !== currentHourStr) {
      return;
    }

    const daysPassed = getDaysPassed(item.uploadDate);
    let stageNumber = null;

    const milestoneIdx = MILESTONE_INTERVALS.indexOf(daysPassed);
    if (milestoneIdx !== -1) {
      stageNumber = milestoneIdx + 1;
    } else if (daysPassed > 25 && (daysPassed - 25) % 30 === 0) {
      stageNumber = 5 + Math.floor((daysPassed - 25) / 30);
    }

    if (stageNumber !== null) {
      if (!userTasksMap[item.user_email]) {
        userTasksMap[item.user_email] = [];
      }
      const title = item.title || item.subject;
      userTasksMap[item.user_email].push(`[${item.subject}] ${title} (第 ${stageNumber} 轮复习)`);
    }
  });

  const targetEmails = Object.keys(userTasksMap);
  if (targetEmails.length === 0) {
    console.log(`🎉 北京时间 ${currentHourStr}:00 无需发送提醒的用户或当前时间段无待复习任务。`);
    return;
  }

  // 5. 组装并发送提醒邮件
  for (const email of targetEmails) {
    const tasks = userTasksMap[email];
    const taskListStr = tasks.map((t, idx) => `${idx + 1}. ${t}`).join('\n');

    console.log(`✉️ 正在向 ${email} 发送 ${tasks.length} 项复习提醒...`);

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: email,
          user_email: email,
          task_count: tasks.length,
          task_list: taskListStr,
          date: getTodayStr(),
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

  console.log('🎉 今日定时任务调度完成！');
}

run();