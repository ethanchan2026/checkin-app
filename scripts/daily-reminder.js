// scripts/daily-reminder.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

// 检查环境变量是否存在
if (!RESEND_API_KEY) {
  console.error('❌ 致命错误: RESEND_API_KEY 环境变量为空！请检查 GitHub Secret 配置。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

const MILESTONE_INTERVALS = [0, 1, 4, 11, 25];

function getBeijingTodayStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000);
  return beijingTime.toISOString().split('T')[0];
}

function getDaysPassed(dateStr) {
  if (!dateStr) return -1;
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const start = new Date(cleanDateStr).getTime();
  const today = new Date(getBeijingTodayStr()).getTime();
  return Math.round((today - start) / (1000 * 60 * 60 * 24));
}

async function runReminder() {
  const todayStr = getBeijingTodayStr();
  console.log(`🚀 [${todayStr}] 开始扫描今日到期复习任务...`);
  console.log(`📧 当前配置的发件人: <${SENDER_EMAIL}>`);
  
  const { data: items, error } = await supabase
    .from('knowledge_base')
    .select('*');

  if (error) {
    console.error('❌ 获取 Supabase 数据失败:', error);
    process.exit(1);
  }

  console.log(`📦 读取到 ${items?.length || 0} 条卡片记录`);

  const userTasksMap = {};

  items.forEach((item, index) => {
    const itemDate = item.uploadDate || item.uploaddate || item.created_at;
    const userEmail = item.user_email;

    if (!userEmail || !itemDate) return;

    const daysPassed = getDaysPassed(itemDate);
    let stageNumber = null;
    const stageIndex = MILESTONE_INTERVALS.indexOf(daysPassed);

    if (stageIndex !== -1) {
      stageNumber = stageIndex + 1;
    } else if (daysPassed > 25 && (daysPassed - 25) % 30 === 0) {
      stageNumber = 5 + Math.floor((daysPassed - 25) / 30);
    }

    if (stageNumber !== null) {
      if (!userTasksMap[userEmail]) {
        userTasksMap[userEmail] = [];
      }
      userTasksMap[userEmail].push({
        subject: item.subject || '复习任务',
        stage: stageNumber,
      });
    }
  });

  const userEmails = Object.keys(userTasksMap);
  if (userEmails.length === 0) {
    console.log('🎉 今日无待复习任务。');
    return;
  }

  for (const email of userEmails) {
    const tasks = userTasksMap[email];
    const taskListHtml = tasks
      .map((t, idx) => `<li style="margin: 8px 0;"><strong>#${idx + 1} [${t.subject}]</strong> — 第 ${t.stage} 次复习</li>`)
      .join('');

    console.log(`✉️ 正在向 ${email} 提交 Resend 发信请求...`);

    try {
      const response = await resend.emails.send({
        from: `复习打卡提醒 <${SENDER_EMAIL}>`,
        to: email,
        subject: `🦉 今日打卡提醒：你有 ${tasks.length} 个复习任务待完成！`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #22c55e;">🦉 艾宾浩斯复习打卡提醒</h2>
            <p>Hi 学习达人，今天你有 <strong>${tasks.length}</strong> 个知识点需要复习：</p>
            <ul style="background: #f8fafc; padding: 15px 30px; border-radius: 12px; color: #334155;">
              ${taskListHtml}
            </ul>
            <p style="color: #64748b; font-size: 13px;">保持连胜天数，今天也要加油哦！💪</p>
          </div>
        `,
      });

      if (response.error) {
        console.error(`❌ Resend 接口明确返回错误:`, JSON.stringify(response.error, null, 2));
      } else {
        console.log(`🎉 邮件发送成功！Resend ID: ${response.data?.id}`);
      }
    } catch (err) {
      console.error(`💥 发送网络/代码异常:`, err);
    }
  }
}

runReminder();