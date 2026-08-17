// scripts/daily-reminder.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

const MILESTONE_INTERVALS = [0, 1, 4, 11, 25];

// 获取东八区（北京时间）当天的 YYYY-MM-DD
function getBeijingTodayStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000);
  return beijingTime.toISOString().split('T')[0];
}

// 计算相隔天数（按日期字符串 YYYY-MM-DD 计算纯自然日差）
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
  
  // 1. 查询所有卡片数据
  const { data: items, error } = await supabase
    .from('knowledge_base')
    .select('*');

  if (error) {
    console.error('❌ 获取 Supabase 数据失败:', error);
    process.exit(1);
  }

  console.log(`📦 成功从数据库读取到 ${items?.length || 0} 条卡片记录`);

  if (!items || items.length === 0) {
    console.log('⚠️ 数据库中没有任何卡片，任务结束。');
    return;
  }

  // 2. 逐一比对并打印详细分析
  const userTasksMap = {};

  items.forEach((item, index) => {
    // 兼容可能出现的不同日期字段名 (uploadDate / uploaddate / created_at)
    const itemDate = item.uploadDate || item.uploaddate || item.created_at;
    const userEmail = item.user_email || item.user_id;

    if (!userEmail || !itemDate) {
      console.log(`⚠️ 第 ${index + 1} 条记录缺少邮箱或日期，跳过:`, item);
      return;
    }

    const daysPassed = getDaysPassed(itemDate);
    console.log(`🔍 卡片 #${index + 1} [${item.subject || '未命名'}] 上传日期: ${itemDate} -> 距离今天: ${daysPassed} 天 (所属: ${userEmail})`);

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
    console.log('🎉 今日所有用户的卡片均不在复习时间窗口内，任务结束。');
    return;
  }

  // 3. 遍历给有任务的用户发送邮件
  for (const email of userEmails) {
    const tasks = userTasksMap[email];
    const taskListHtml = tasks
      .map((t, idx) => `<li style="margin: 8px 0;"><strong>#${idx + 1} [${t.subject}]</strong> — 第 ${t.stage} 次复习</li>`)
      .join('');

    console.log(`✉️ 正在向 ${email} 发送 ${tasks.length} 个任务的提醒邮件...`);

    try {
      const { data, error: sendErr } = await resend.emails.send({
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

      if (sendErr) {
        console.error(`❌ Resend 发信失败:`, sendErr);
      } else {
        console.log(`✅ 已成功向 ${email} 发送邮件！邮件 ID:`, data?.id);
      }
    } catch (err) {
      console.error(`❌ 发送异常:`, err);
    }
  }
}

runReminder();