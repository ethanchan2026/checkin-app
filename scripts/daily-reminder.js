import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

console.log('--- 1. 脚本已启动 ---');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

console.log('--- 2. 检查环境变量 ---');
console.log('SUPABASE_URL 是否存在:', !!SUPABASE_URL);
console.log('SUPABASE_KEY 是否存在:', !!SUPABASE_SERVICE_ROLE_KEY);
console.log('RESEND_KEY 是否存在:', !!RESEND_API_KEY);
console.log('SENDER_EMAIL:', SENDER_EMAIL);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  console.error('❌ 缺少必要的环境变量，请检查 GitHub Secrets！');
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

async function main() {
  try {
    const todayStr = getBeijingTodayStr();
    console.log(`🚀 [${todayStr}] 开始查询 Supabase 数据库...`);

    const { data: items, error } = await supabase
      .from('knowledge_base')
      .select('*');

    if (error) {
      console.error('❌ Supabase 查询失败:', error);
      process.exit(1);
    }

    console.log(`📦 成功查询到 ${items?.length || 0} 条卡片数据`);

    if (!items || items.length === 0) {
      console.log('⚠️ 数据库为空，无任务需要提醒。');
      return;
    }

    const userTasksMap = {};

    items.forEach((item, index) => {
      const itemDate = item.uploadDate || item.uploaddate || item.created_at;
      const userEmail = item.user_email;

      if (!userEmail || !itemDate) {
        console.log(`⚠️ 卡片 #${index + 1} 缺少邮箱或日期，跳过`);
        return;
      }

      const daysPassed = getDaysPassed(itemDate);
      console.log(`🔍 卡片 #${index + 1} [${item.subject || '未命名'}] 上传日期: ${itemDate} -> 距今: ${daysPassed} 天 (所属: ${userEmail})`);

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
    console.log(`🎯 今日有复习任务的用户数: ${userEmails.length}`);

    if (userEmails.length === 0) {
      console.log('🎉 今日所有卡片均不在复习窗口内。');
      return;
    }

    for (const email of userEmails) {
      const tasks = userTasksMap[email];
      const taskListHtml = tasks
        .map((t, idx) => `<li style="margin: 8px 0;"><strong>#${idx + 1} [${t.subject}]</strong> — 第 ${t.stage} 次复习</li>`)
        .join('');

      console.log(`✉️ 正在向 ${email} 发起 Resend 邮件发送请求...`);

      const result = await resend.emails.send({
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

      if (result.error) {
        console.error('❌ Resend 返回错误:', result.error);
      } else {
        console.log(`🎉 邮件发送成功！Resend ID: ${result.data?.id}`);
      }
    }
  } catch (err) {
    console.error('💥 运行时发生异常:', err);
  } finally {
    console.log('--- 任务执行完毕 ---');
  }
}

// 启动主函数
main();