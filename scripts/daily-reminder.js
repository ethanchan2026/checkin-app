// scripts/daily-reminder.js (原生 Fetch 零依赖版本，不依赖任何第三方包)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

console.log('==================================================');
console.log('🚀 脚本已启动');
console.log('1. 检查环境变量:');
console.log(' - SUPABASE_URL:', SUPABASE_URL ? '✅ 已配置' : '❌ 缺失 (请在 GitHub Secrets 检查)');
console.log(' - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ 已配置' : '❌ 缺失 (请在 GitHub Secrets 检查)');
console.log(' - RESEND_API_KEY:', RESEND_API_KEY ? '✅ 已配置' : '❌ 缺失 (请在 GitHub Secrets 检查)');
console.log(' - SENDER_EMAIL:', SENDER_EMAIL);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  console.error('❌ 致命错误：缺少关键环境变量，请检查 GitHub 仓库 Secrets 配置！');
  process.exit(1);
}

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
  const todayStr = getBeijingTodayStr();
  console.log(`2. 今日北京时间: [${todayStr}]，正在请求 Supabase 数据库...`);

  // 原生 REST API 请求 Supabase
  let items = [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_base?select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('❌ Supabase 请求失败:', res.status, errText);
      process.exit(1);
    }

    items = await res.json();
    console.log(`3. 成功读取到 ${items.length} 条资料卡片`);
  } catch (err) {
    console.error('❌ 连接 Supabase 发生异常:', err);
    process.exit(1);
  }

  if (items.length === 0) {
    console.log('⚠️ 数据库中没有卡片，任务结束。');
    return;
  }

  // 整理今日任务
  const userTasksMap = {};

  items.forEach((item, index) => {
    const itemDate = item.uploadDate || item.uploaddate || item.created_at;
    const userEmail = item.user_email;

    if (!userEmail || !itemDate) return;

    const daysPassed = getDaysPassed(itemDate);
    console.log(` - 卡片 #${index + 1} [${item.subject || '未命名'}] 上传日期: ${itemDate} -> 距今: ${daysPassed} 天 (用户: ${userEmail})`);

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
  console.log(`4. 今日命中有复习任务的用户数: ${userEmails.length}`);

  if (userEmails.length === 0) {
    console.log('🎉 今日所有卡片均不在复习窗口内。');
    return;
  }

  // 原生调用 Resend API 发送邮件
  for (const email of userEmails) {
    const tasks = userTasksMap[email];
    const taskListHtml = tasks
      .map((t, idx) => `<li style="margin: 8px 0;"><strong>#${idx + 1} [${t.subject}]</strong> — 第 ${t.stage} 次复习</li>`)
      .join('');

    console.log(`5. 正在向 ${email} 发送包含 ${tasks.length} 个任务的邮件...`);

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      });

      const resendData = await emailRes.json();
      if (!emailRes.ok) {
        console.error(`❌ Resend 接口返回错误:`, resendData);
      } else {
        console.log(`🎉 邮件发送成功！Resend ID:`, resendData.id);
      }
    } catch (err) {
      console.error(`❌ 发信网络异常:`, err);
    }
  }

  console.log('==================================================');
}

main();