import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import { Login } from './Login';

// ========================================================
// 🔗 Supabase 配置
// ========================================================
const SUPABASE_URL = 'https://oabwpouymbntlhvfbint.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYndwb3V5bWJudGxodmZiaW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNTUwOTQsImV4cCI6MjEwMTgzMTA5NH0.mxV1y9WCR0iOikcf5DaHKxwS_UDKpv-_Mj46Zx9LUd0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const EMAILJS_SERVICE_ID = 'service_4uqz6bs';
const EMAILJS_TEMPLATE_ID = 'template_f6qilz5';
const EMAILJS_PUBLIC_KEY = 'M2sx40O9a6A-sMtH7';

interface RevisionLog {
  stage: number | string;
  imageUrl: string;
  date: string;
  aiFeedback?: string;
}

interface KnowledgeItem {
  id: string;
  subject: string;
  imageUrl: string;
  uploadDate: string;
  revisions?: RevisionLog[];
  user_id?: string;
  user_email?: string;
}

interface LeaderboardUser {
  user_email: string;
  streak: number;
  xp: number;
  isCurrent: boolean;
}

const DEFAULT_SUBJECTS = ['语文', '数学', '英语', '物理', '化学'];
const MILESTONE_INTERVALS = [0, 1, 4, 11, 25];

const TRANSLATIONS = {
  zh: {
    home: '主页',
    leaderboard: '排行榜',
    profile: '个人中心',
    uploadTitle: '📸 上传新复习资料',
    clickUpload: '点击拍照 / 选择初次学习笔记照片',
    saveBtn: '保存资料并生成阶段复习关卡',
    todayTasks: '🎯 今日复习关卡',
    noTasks: '🎉 今天没有需要复习的任务，快去上传新资料吧！',
    databaseTitle: '📂 资料历史数据库',
    all: '全部',
    addSubject: '+ 新增',
    deleteSet: '删除整套资料',
    mastered: '✅ 已掌握',
    challenge: '挑战 ➔',
    nativeNotice: '🔔 系统原生通知',
    enableNotice: '开启设备提醒权限',
    noticeEnabled: '通知权限已开启',
    logout: '🚪 退出登录',
    deleteAccount: '⚠️ 注销（删除）账户',
    deleteConfirm: '警告：注销账户将永久清空您在云端的所有卡片与复习历史记录且无法恢复，确定要注销吗？',
    rankTitle: '🏆 学习达人排行榜',
    myStats: '📊 你的学习战绩',
    customSubTitle: '🏷️ 你的专属科目',
    langSwitch: '🌐 语言切换 / Language',
    enterSubject: '输入新自定义科目名称：',
    reviewNotice: '📸 上传本次复习重写笔记/答题照片',
    completeBtn: '掌握知识点，打卡过关！ 🎉',
    close: '关闭',
    totalPhotos: '张笔记',
    clickToEnlarge: '🔍 点击查看原图',
    feedbackTitle: '💬 问题反馈与建议',
    feedbackPlaceholder: '遇到 Bug 或有好的建议？请告诉我们...',
    submitFeedback: '提交建议发送至邮箱 ✉️',
    sending: '正在发送...',
    feedbackSuccess: '🎉 感谢你的反馈！建议已成功发送到开发者的邮箱。',
    noRankData: '尚无其他活跃用户，快去邀请朋友一起来打卡吧！',
    initialReview: '初次复习',
    dayStageText: (stage: number) => `第 ${stage} 次复习`,
    aiCorrectionBtn: '🤖 让 Gemini AI 批改与纠错',
    aiAnalyzing: '🤖 Gemini 正在深度比对与批改笔记中...',
    aiResultTitle: '💡 Gemini 智能批改诊断报告',
    setApiKey: '🔑 设置 Gemini API Key',
  },
  en: {
    home: 'Home',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    uploadTitle: '📸 Upload New Study Material',
    clickUpload: 'Click to Take Photo / Choose Initial Notes',
    saveBtn: 'Save & Generate Review Levels',
    todayTasks: "🎯 Today's Review Levels",
    noTasks: '🎉 No review tasks today. Go upload new materials!',
    databaseTitle: '📂 Study Material Library',
    all: 'All',
    addSubject: '+ Add',
    deleteSet: 'Delete Deck',
    mastered: '✅ Mastered',
    challenge: 'Start ➔',
    nativeNotice: '🔔 System Notification',
    enableNotice: 'Enable Device Notification',
    noticeEnabled: 'Notification Enabled',
    logout: '🚪 Sign Out',
    deleteAccount: '⚠️ Delete Account Data',
    deleteConfirm: 'WARNING: This will permanently delete all your cards & study logs from the cloud. Are you sure?',
    rankTitle: '🏆 Learning Leaderboard',
    myStats: '📊 Your Learning Stats',
    customSubTitle: '🏷️ Your Custom Subjects',
    langSwitch: '🌐 Language / 语言切换',
    enterSubject: 'Enter new custom subject name:',
    reviewNotice: '📸 Upload Review Notes Photo',
    completeBtn: 'Mastered & Complete Level! 🎉',
    close: 'Close',
    totalPhotos: 'Notes',
    clickToEnlarge: '🔍 Tap to view fullscreen',
    feedbackTitle: '💬 Feedback & Suggestions',
    feedbackPlaceholder: 'Encountered a bug or have ideas? Let us know...',
    submitFeedback: 'Submit Feedback to Email ✉️',
    sending: 'Sending...',
    feedbackSuccess: '🎉 Thank you! Your feedback has been sent to the developer.',
    noRankData: 'No other active users yet. Invite your friends to join!',
    initialReview: 'Initial Review',
    dayStageText: (stage: number) => `Stage ${stage} Review`,
    aiCorrectionBtn: '🤖 Grade & Correct with Gemini AI',
    aiAnalyzing: '🤖 Gemini is analyzing and correcting your notes...',
    aiResultTitle: '💡 Gemini AI Diagnostic Report',
    setApiKey: '🔑 Set Gemini API Key',
  }
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const [lang, setLang] = useState<'zh' | 'en'>(
    () => (localStorage.getItem('app_lang') as 'zh' | 'en') || 'zh'
  );
  const t = TRANSLATIONS[lang];

  const [currentTab, setCurrentTab] = useState<'home' | 'leaderboard' | 'profile'>('home');
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);

  const [streak, setStreak] = useState<number>(1);
  const [xp, setXp] = useState<number>(20);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  
  const [realLeaderboard, setRealLeaderboard] = useState<LeaderboardUser[]>([]);

  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedUploadSubject, setSelectedUploadSubject] = useState<string>('语文');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reviewNewImage, setReviewNewImage] = useState<string | null>(null);

  // 🤖 API Key 状态管理
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem('custom_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);

  // 🔍 全屏大图灯箱
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<string>(
    () => ('Notification' in window ? Notification.permission : 'unsupported')
  );

  const [feedback, setFeedback] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const [activeModalItem, setActiveModalItem] = useState<{ 
    item: KnowledgeItem; 
    stageNumber: number;
    type: 'review' | 'viewFolder' 
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
      fetchCustomSubjects();
      fetchLeaderboard();
    }
  }, [session]);

  const toggleLanguage = () => {
    const nextLang = lang === 'zh' ? 'en' : 'zh';
    setLang(nextLang);
    localStorage.setItem('app_lang', nextLang);
  };

  function getTodayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function getDaysPassed(dateStr: string) {
    const start = new Date(dateStr).getTime();
    const today = new Date(getTodayStr()).getTime();
    return Math.floor((today - start) / (1000 * 60 * 60 * 24));
  }

  const todayTasks = items.flatMap(item => {
    const daysPassed = getDaysPassed(item.uploadDate);
    const stageIndex = MILESTONE_INTERVALS.indexOf(daysPassed);
    if (stageIndex !== -1) {
      return [{ item, stageNumber: stageIndex + 1 }];
    }

    if (daysPassed > 25 && (daysPassed - 25) % 30 === 0) {
      const monthlyCycle = Math.floor((daysPassed - 25) / 30);
      return [{ item, stageNumber: 5 + monthlyCycle }];
    }

    return [];
  });

  async function fetchCustomSubjects() {
    const { data, error } = await supabase
      .from('custom_subjects')
      .select('name')
      .order('created_at', { ascending: true });

    if (!error && data) {
      const customNames = data.map(item => item.name);
      const combined = Array.from(new Set([...DEFAULT_SUBJECTS, ...customNames]));
      setSubjects(combined);
    }
  }

  const handleAddCustomSubject = async () => {
    const newSub = prompt(t.enterSubject);
    if (newSub && newSub.trim() && session) {
      const trimmed = newSub.trim();
      if (!subjects.includes(trimmed)) {
        const { error } = await supabase
          .from('custom_subjects')
          .insert([{ name: trimmed, user_id: session.user.id }]);

        if (!error) {
          setSubjects([...subjects, trimmed]);
          setSelectedUploadSubject(trimmed);
        } else {
          alert(`添加失败：${error.message}`);
        }
      }
    }
  };

  const handleConfigureApiKey = () => {
    const inputKey = prompt('请输入你的 Gemini API Key:', userApiKey);
    if (inputKey !== null) {
      const cleanKey = inputKey.trim();
      setUserApiKey(cleanKey);
      localStorage.setItem('custom_gemini_api_key', cleanKey);
      alert(cleanKey ? '✅ Gemini API Key 已成功保存！' : '⚠️ 已清除 API Key');
    }
  };

  async function fetchData() {
    if (!session?.user?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data);
    }

    const savedStreak = localStorage.getItem(`checkin_streak_${session.user.id}`);
    const savedXp = localStorage.getItem(`checkin_xp_${session.user.id}`);
    const savedCompleted = localStorage.getItem(`checkin_completed_${session.user.id}_${getTodayStr()}`);

    if (savedStreak) setStreak(Number(savedStreak));
    if (savedXp) setXp(Number(savedXp));
    if (savedCompleted) setCompletedToday(JSON.parse(savedCompleted));
    setLoading(false);
  }

  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('user_id, user_email');

    if (!error && data) {
      const userMap: { [email: string]: { count: number; userId: string } } = {};

      data.forEach(item => {
        if (item.user_email) {
          if (!userMap[item.user_email]) {
            userMap[item.user_email] = { count: 0, userId: item.user_id };
          }
          userMap[item.user_email].count += 1;
        }
      });

      if (session?.user?.email && !userMap[session.user.email]) {
        userMap[session.user.email] = { count: items.length, userId: session.user.id };
      }

      const boardList: LeaderboardUser[] = Object.keys(userMap).map(email => {
        const isCurrent = email === session?.user?.email;
        const count = userMap[email].count;
        const userStreak = isCurrent ? streak : Math.max(1, count);
        const userXp = isCurrent ? xp : count * 20;

        return {
          user_email: email,
          streak: userStreak,
          xp: userXp,
          isCurrent,
        };
      });

      boardList.sort((a, b) => b.xp - a.xp || b.streak - a.streak);
      setRealLeaderboard(boardList);
    }
  }

  const requestNativeNotification = () => {
    if (!('Notification' in window)) {
      alert(lang === 'zh' ? '当前浏览器不支持系统原生通知' : 'Notifications not supported');
      return;
    }

    Notification.requestPermission().then((perm) => {
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification(lang === 'zh' ? '🦉 知识复习打卡' : '🦉 Study Check-in', {
          body: lang === 'zh' ? '已成功开启原生通知提醒！' : 'Native notification enabled!',
        });
      }
    });
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSendingFeedback(true);
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          user_email: session?.user?.email || 'Anonymous',
          message: feedback,
          submit_time: new Date().toLocaleString(),
        },
        EMAILJS_PUBLIC_KEY
      );

      alert(t.feedbackSuccess);
      setFeedback('');
    } catch (err: any) {
      console.error(err);
      alert(lang === 'zh' ? `发送失败: ${err.text || '请检查网络/配置'}` : 'Send failed, please try again.');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setItems([]);
    setSubjects(DEFAULT_SUBJECTS);
  };

  const handleDeleteAccount = async () => {
    if (window.confirm(t.deleteConfirm)) {
      if (session?.user?.id) {
        setLoading(true);
        try {
          const { error } = await supabase.rpc('delete_user_account');

          if (error) {
            await supabase.from('knowledge_base').delete().eq('user_id', session.user.id);
            await supabase.from('custom_subjects').delete().eq('user_id', session.user.id);
          } else {
            await supabase.from('custom_subjects').delete().eq('user_id', session.user.id);
          }

          localStorage.removeItem(`checkin_streak_${session.user.id}`);
          localStorage.removeItem(`checkin_xp_${session.user.id}`);
          
          alert(
            lang === 'zh'
              ? '🎉 账号与个人数据已彻底销毁！'
              : '🎉 Account & data permanently deleted!'
          );
          
          handleLogout();
        } catch (err: any) {
          alert(`注销出错：${err.message || '网络异常'}`);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const compressImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(compressedDataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) compressImage(file, setPreviewImage);
  };

  const handleReviewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, (base64) => {
        setReviewNewImage(base64);
        setAiFeedback('');
      });
    }
  };

// 🤖 核心功能：自动探测可用模型 + 原生 Fetch 智能批改 (已适配最新模型)
  const handleGeminiCorrection = async () => {
    if (!activeModalItem || !reviewNewImage) {
      alert(lang === 'zh' ? '请先上传本次复习的笔记/答题照片！' : 'Please upload your review notes first!');
      return;
    }

    let activeKey = (userApiKey || '').trim();
    if (!activeKey) {
      const inputKey = prompt('检测到尚未配置 Gemini API Key，请输入您的 API Key:');
      if (!inputKey || !inputKey.trim()) {
        alert('未提供 API Key，无法使用 AI 批改功能。');
        return;
      }
      activeKey = inputKey.trim();
      setUserApiKey(activeKey);
      localStorage.setItem('custom_gemini_api_key', activeKey);
    }

    setIsAiAnalyzing(true);
    try {
      const originalBase64 = activeModalItem.item.imageUrl.split(',')[1];
      const reviewBase64 = reviewNewImage.split(',')[1];

      // 1. 优先尝试获取当前 API Key 真实支持的模型列表
      let candidateModels = [
        'gemini-3.6-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ];

      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}`
        );
        const listData = await listRes.json();
        
        if (listData.models && Array.isArray(listData.models)) {
          const availableGemini = listData.models
            .filter(
              (m: any) =>
                m.supportedGenerationMethods?.includes('generateContent') &&
                m.name?.includes('gemini')
            )
            .map((m: any) => m.name.replace('models/', ''));
          
          if (availableGemini.length > 0) {
            candidateModels = availableGemini;
          }
        }
      } catch (e) {
        console.warn('动态探测模型失败，将使用预设模型列表', e);
      }

      const promptText = `
你是一位极其资深且富有耐心的全科金牌教师。
用户正在进行艾宾浩斯第 ${activeModalItem.stageNumber} 轮复习打卡。
【图1】是原始的学习笔记/原题/知识点标准内容；
【图2】是用户今天本次复习默写、重写或解题的照片。

请针对【图2】进行详细的批改与纠错：
1. 🎯 【完成度与正误判定】：分析用户是否掌握了核心公式/知识点/推导过程。
2. 🔍 【错因与漏洞诊断】：精准指出漏写、笔误、符号错误或理解偏差的地方。
3. 💡 【名师记忆口诀与点拨】：给出 1~2 句话的高效记忆技巧或巩固建议。

请使用精炼、鼓励且排版清晰的 Markdown 输出（可适当使用 Emoji）。
`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: originalBase64,
                },
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: reviewBase64,
                },
              },
            ],
          },
        ],
      };

      let responseText = '';
      let lastErrorMessage = '';

      for (const modelName of candidateModels) {
        try {
          const cleanModelName = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${activeKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            }
          );

          const data = await res.json();

          if (res.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            responseText = data.candidates[0].content.parts[0].text;
            break;
          } else if (data.error) {
            lastErrorMessage = data.error.message;
            // 若模型不可用/已弃用，继续尝试列表中下一个可用模型
            continue;
          }
        } catch (err: any) {
          lastErrorMessage = err.message;
          continue;
        }
      }

      if (responseText) {
        setAiFeedback(responseText);
      } else {
        throw new Error(lastErrorMessage || '所有可用模型均未能成功响应');
      }
    } catch (err: any) {
      console.error('Gemini 批改失败:', err);
      const errMsg = err.message || '';
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        alert('❌ API Key 鉴权失败，请确认 Key 是否完整正确');
      } else if (errMsg.includes('Failed to fetch')) {
        alert('🌐 网络连接失败：调用 Google 服务需要开启网络代理环境。');
      } else {
        alert(`AI 批改遇到异常: ${errMsg}`);
      }
    } finally {
      setIsAiAnalyzing(false);
    }
  };
  const handleSaveNewKnowledge = async () => {
    if (!previewImage || !session) return;

    const newItemData = {
      subject: selectedUploadSubject,
      imageUrl: previewImage,
      uploadDate: getTodayStr(),
      revisions: [],
      user_id: session.user.id,
      user_email: session.user.email
    };

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert([newItemData])
      .select();

    if (!error && data) {
      setItems([data[0], ...items]);
      setPreviewImage(null);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      fetchLeaderboard();
    } else {
      alert(`Error: ${error?.message}`);
    }
  };

  const handleCompleteTask = async (taskId: string, item: KnowledgeItem, stageNumber?: number) => {
    if (completedToday.includes(taskId)) return;

    let updatedRevisions = item.revisions ? [...item.revisions] : [];
    if (reviewNewImage && stageNumber) {
      updatedRevisions.push({
        stage: stageNumber,
        imageUrl: reviewNewImage,
        date: getTodayStr(),
        aiFeedback: aiFeedback || undefined,
      });
    }

    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        return { ...i, revisions: updatedRevisions };
      }
      return i;
    });
    setItems(updatedItems);

    await supabase
      .from('knowledge_base')
      .update({ revisions: updatedRevisions })
      .eq('id', item.id);

    const newCompleted = [...completedToday, taskId];
    setCompletedToday(newCompleted);
    localStorage.setItem(`checkin_completed_${session?.user?.id}_${getTodayStr()}`, JSON.stringify(newCompleted));

    const newXp = xp + 20;
    setXp(newXp);
    localStorage.setItem(`checkin_xp_${session?.user?.id}`, newXp.toString());

    if (newCompleted.length === todayTasks.length) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem(`checkin_streak_${session?.user?.id}`, newStreak.toString());
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 } });
    } else {
      confetti({ particleCount: 40, spread: 50 });
    }

    setReviewNewImage(null);
    setAiFeedback('');
    setActiveModalItem(null);
    fetchLeaderboard();
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('确定要删除这套资料吗？')) {
      await supabase.from('knowledge_base').delete().eq('id', id);
      const filtered = items.filter(i => i.id !== id);
      setItems(filtered);
      setActiveModalItem(null);
      fetchLeaderboard();
    }
  };

  const filteredDatabaseItems = selectedSubject === 'ALL'
    ? items
    : items.filter(item => item.subject === selectedSubject);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-xs animate-pulse font-sans">
        🦉 正在同步云端数据...
      </div>
    );
  }

  if (!session) {
    return <Login onSuccess={() => {}} lang={lang} onToggleLang={toggleLanguage} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-24 font-sans">
      {/* 顶部状态栏 */}
      <header className="sticky top-0 z-20 bg-white border-b-2 border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 font-extrabold text-orange-500 text-lg">
            🔥 <span>{streak}</span>
          </div>
          <div className="flex items-center gap-1 font-extrabold text-yellow-500 text-lg">
            ⚡ <span>{xp} XP</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="text-xs bg-slate-100 hover:bg-slate-200 font-extrabold px-2.5 py-1 rounded-xl transition-all border border-slate-300"
          >
            🌐 {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </header>

      {/* 1. 🏠 主页 */}
      {currentTab === 'home' && (
        <main className="max-w-md mx-auto p-4 space-y-6">
          {loading && (
            <div className="text-center py-2 text-xs text-indigo-500 font-bold animate-pulse">
              🔄 正在同步云端资料...
            </div>
          )}

          {/* 📸 上传新资料 */}
          <section className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-lg text-slate-700 flex items-center gap-2">
              {t.uploadTitle}
            </h2>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {subjects.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedUploadSubject(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedUploadSubject === sub
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
              <button
                onClick={handleAddCustomSubject}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0 border border-indigo-200"
              >
                {t.addSubject}
              </button>
            </div>

            <label className="block border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 rounded-2xl p-4 text-center cursor-pointer transition-all">
              <span className="text-sm font-bold text-indigo-600">{t.clickUpload}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            {previewImage && (
              <div className="space-y-3">
                <div 
                  onClick={() => setFullScreenImage(previewImage)}
                  className="h-36 w-full overflow-hidden rounded-2xl border bg-slate-100 cursor-pointer relative group"
                >
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-lg backdrop-blur-sm">
                    {t.clickToEnlarge}
                  </div>
                </div>
                <button
                  onClick={handleSaveNewKnowledge}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-extrabold rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-lg"
                >
                  {t.saveBtn}
                </button>
              </div>
            )}
          </section>

          {/* 🎯 今日复习关卡 */}
          <section className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-700">{t.todayTasks}</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold">
                {todayTasks.length} 关卡
              </span>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm font-medium">
                {t.noTasks}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-1">
                {todayTasks.map(({ item, stageNumber }, index) => {
                  const taskId = `${item.id}_stage${stageNumber}`;
                  const isDone = completedToday.includes(taskId);

                  return (
                    <button
                      key={taskId}
                      onClick={() => {
                        setReviewNewImage(null);
                        setAiFeedback('');
                        setActiveModalItem({ item, stageNumber, type: 'review' });
                      }}
                      className={`w-full p-4 rounded-2xl font-extrabold flex justify-between items-center transition-all ${
                        isDone
                          ? 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                          : 'bg-green-500 hover:bg-green-600 text-white border-b-4 border-green-700 active:border-b-0 active:translate-y-1 shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs">
                          #{index + 1}
                        </span>
                        <span>
                          [{item.subject}] {stageNumber === 1 ? t.initialReview : t.dayStageText(stageNumber)}
                        </span>
                      </div>
                      <span>{isDone ? t.mastered : t.challenge}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 📂 资料历史数据库 */}
          <section className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-700 flex items-center gap-2">
                {t.databaseTitle}
              </h2>
              <span className="text-xs text-slate-400 font-bold">{items.length} 套</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedSubject('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  selectedSubject === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t.all}
              </button>
              {subjects.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedSubject === sub
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {filteredDatabaseItems.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">暂无资料</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredDatabaseItems.map(item => {
                  const totalPhotos = 1 + (item.revisions ? item.revisions.length : 0);
                  return (
                    <div 
                      key={item.id} 
                      className="bg-slate-50 rounded-2xl p-2 border border-slate-200 flex flex-col space-y-2 group overflow-hidden"
                    >
                      <div 
                        onClick={() => setActiveModalItem({ item, stageNumber: 1, type: 'viewFolder' })}
                        className="relative cursor-pointer overflow-hidden rounded-xl bg-slate-200 h-28 w-full shrink-0"
                      >
                        <img 
                          src={item.imageUrl} 
                          alt="Cover" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 block" 
                        />
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full backdrop-blur-sm">
                          📁 {totalPhotos} {t.totalPhotos}
                        </div>
                      </div>

                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {item.subject}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.uploadDate}</span>
                      </div>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-[10px] text-red-400 hover:text-red-600 text-right px-1 pt-0.5"
                      >
                        {t.deleteSet}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {/* 2. 🏆 排行榜 */}
      {currentTab === 'leaderboard' && (
        <main className="max-w-md mx-auto p-4 space-y-6">
          <section className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
            <h2 className="font-extrabold text-xl text-slate-800 text-center flex items-center justify-center gap-2">
              {t.rankTitle}
            </h2>

            <div className="bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-2xl p-4 flex justify-between items-center shadow-lg">
              <div>
                <p className="text-xs font-bold opacity-80">{t.myStats}</p>
                <p className="text-sm font-extrabold truncate max-w-[180px]">
                  {session?.user?.email}
                </p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-xs opacity-80">Streak</p>
                  <p className="text-lg font-black">🔥 {streak}</p>
                </div>
                <div>
                  <p className="text-xs opacity-80">XP</p>
                  <p className="text-lg font-black">⚡ {xp}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {realLeaderboard.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {t.noRankData}
                </div>
              ) : (
                realLeaderboard.map((user, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <div 
                      key={user.user_email} 
                      className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${
                        user.isCurrent 
                          ? 'bg-amber-50 border-2 border-amber-300 shadow-sm' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{medal}</span>
                        <div>
                          <p className={`font-extrabold text-xs ${user.isCurrent ? 'text-amber-800' : 'text-slate-700'}`}>
                            {user.user_email?.split('@')[0]} {user.isCurrent ? '(You)' : ''}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {idx === 0 ? 'Top Scholar' : `Rank #${idx + 1}`}
                          </p>
                        </div>
                      </div>
                      <div className="font-black text-amber-600 text-xs">
                        🔥 {user.streak} 天 · ⚡ {user.xp} XP
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </main>
      )}

      {/* 3. 👤 个人中心 */}
      {currentTab === 'profile' && (
        <main className="max-w-md mx-auto p-4 space-y-6">
          <section className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-5">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-green-500 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg border-b-4 border-green-700 pt-1">
                🦉
              </div>
              <h2 className="font-extrabold text-lg text-slate-800">
                {session?.user?.email}
              </h2>
              <span className="inline-block bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">
                PRO 学习者
              </span>
            </div>

            <div className="space-y-3 pt-2 border-t">
              {/* 🔑 API Key 设置 */}
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border">
                <div>
                  <p className="text-xs font-bold text-slate-700">{t.setApiKey}</p>
                  <p className="text-[10px] text-slate-400">
                    {userApiKey ? `已配置 (***${userApiKey.slice(-4)})` : '未配置 (点击右侧配置)'}
                  </p>
                </div>
                <button
                  onClick={handleConfigureApiKey}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-sm transition-all"
                >
                  {userApiKey ? '修改 Key' : '配置 Key'}
                </button>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border">
                <span className="text-xs font-bold text-slate-700">{t.langSwitch}</span>
                <button
                  onClick={toggleLanguage}
                  className="text-xs bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-sm"
                >
                  {lang === 'zh' ? '中文 ➔ EN' : 'EN ➔ 中文'}
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">{t.customSubTitle}</span>
                  <button
                    onClick={handleAddCustomSubject}
                    className="text-xs bg-green-500 text-white font-extrabold px-2.5 py-1 rounded-xl"
                  >
                    {t.addSubject}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {subjects.map(s => (
                    <span key={s} className="bg-white px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 border">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-700">{t.nativeNotice}</p>
                  <p className="text-[10px] text-slate-400">
                    {notificationPermission === 'granted' ? t.noticeEnabled : '开启设备提醒权限'}
                  </p>
                </div>
                <button
                  onClick={requestNativeNotification}
                  disabled={notificationPermission === 'granted'}
                  className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all ${
                    notificationPermission === 'granted'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-indigo-500 text-white border-indigo-600 hover:bg-indigo-600'
                  }`}
                >
                  {notificationPermission === 'granted' ? '✅ 已开启' : t.enableNotice}
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border space-y-2">
                <span className="text-xs font-bold text-slate-700">{t.feedbackTitle}</span>
                <form onSubmit={handleSendFeedback} className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder={t.feedbackPlaceholder}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingFeedback}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md disabled:opacity-50"
                  >
                    {sendingFeedback ? t.sending : t.submitFeedback}
                  </button>
                </form>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl border border-slate-300 transition-all text-xs"
              >
                {t.logout}
              </button>

              <div className="pt-2">
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold rounded-2xl border border-red-200 transition-all text-xs"
                >
                  {t.deleteAccount}
                </button>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 📌 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-slate-200 px-6 py-2 shadow-2xl max-w-md mx-auto flex justify-around items-center">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-1 transition-all ${
            currentTab === 'home' ? 'text-green-500 scale-110 font-extrabold' : 'text-slate-400 font-bold'
          }`}
        >
          <span className="text-2xl">🏠</span>
          <span className="text-[10px]">{t.home}</span>
        </button>

        <button
          onClick={() => setCurrentTab('leaderboard')}
          className={`flex flex-col items-center gap-1 transition-all ${
            currentTab === 'leaderboard' ? 'text-amber-500 scale-110 font-extrabold' : 'text-slate-400 font-bold'
          }`}
        >
          <span className="text-2xl">🏆</span>
          <span className="text-[10px]">{t.leaderboard}</span>
        </button>

        <button
          onClick={() => setCurrentTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${
            currentTab === 'profile' ? 'text-indigo-500 scale-110 font-extrabold' : 'text-slate-400 font-bold'
          }`}
        >
          <span className="text-2xl">👤</span>
          <span className="text-[10px]">{t.profile}</span>
        </button>
      </nav>

      {/* Modal 业务弹窗 */}
      {activeModalItem && (
        <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl text-xs">
                {activeModalItem.item.subject} · {activeModalItem.stageNumber === 1 ? t.initialReview : t.dayStageText(activeModalItem.stageNumber)}
              </span>
              <button
                onClick={() => {
                  setActiveModalItem(null);
                  setReviewNewImage(null);
                  setAiFeedback('');
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* 🎯 复习挑战与 AI 批改弹窗 */}
            {activeModalItem.type === 'review' && (
              <div className="space-y-4">
                <div 
                  onClick={() => setFullScreenImage(activeModalItem.item.imageUrl)}
                  className="max-h-[35vh] overflow-hidden rounded-2xl bg-slate-900 flex items-center justify-center p-1 cursor-pointer group relative"
                >
                  <img
                    src={activeModalItem.item.imageUrl}
                    alt="Original"
                    className="w-full h-auto object-contain rounded-xl group-hover:scale-102 transition-transform"
                  />
                  <div className="absolute bottom-2 bg-black/70 text-white text-[11px] px-3 py-1 rounded-full font-bold backdrop-blur-md opacity-90">
                    {t.clickToEnlarge}
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <label className="block border-2 border-dashed border-green-300 hover:border-green-500 bg-green-50/50 rounded-2xl p-2.5 text-center cursor-pointer transition-all">
                    <span className="text-xs font-bold text-green-700">
                      {t.reviewNotice}
                    </span>
                    <input type="file" accept="image/*" onChange={handleReviewImageUpload} className="hidden" />
                  </label>

                  {reviewNewImage && (
                    <div className="space-y-2">
                      <div 
                        onClick={() => setFullScreenImage(reviewNewImage)}
                        className="relative h-24 w-full overflow-hidden rounded-xl border bg-slate-100 cursor-pointer group"
                      >
                        <img src={reviewNewImage} alt="New note" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                          {t.clickToEnlarge}
                        </div>
                      </div>

                      {/* 🤖 Gemini AI 纠错触发按钮 */}
                      <button
                        onClick={handleGeminiCorrection}
                        disabled={isAiAnalyzing}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {isAiAnalyzing ? t.aiAnalyzing : t.aiCorrectionBtn}
                      </button>
                    </div>
                  )}

                  {/* 💡 AI 批改诊断结果卡片 */}
                  {aiFeedback && (
                    <div className="bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-700">
                      <div className="font-extrabold text-indigo-700 flex items-center gap-1">
                        {t.aiResultTitle}
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed text-[11px] max-h-48 overflow-y-auto bg-white/70 p-2.5 rounded-xl border border-indigo-100">
                        {aiFeedback}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleCompleteTask(
                    `${activeModalItem.item.id}_stage${activeModalItem.stageNumber}`,
                    activeModalItem.item,
                    activeModalItem.stageNumber
                  )}
                  className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-extrabold rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-lg"
                >
                  {t.completeBtn}
                </button>
              </div>
            )}

            {/* 📂 资料库相册弹窗 */}
            {activeModalItem.type === 'viewFolder' && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="bg-slate-50 rounded-2xl p-3 border space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span>📌 原始学习笔记</span>
                    <span>{activeModalItem.item.uploadDate}</span>
                  </div>
                  <div 
                    onClick={() => setFullScreenImage(activeModalItem.item.imageUrl)}
                    className="relative cursor-pointer group rounded-xl overflow-hidden bg-slate-900"
                  >
                    <img
                      src={activeModalItem.item.imageUrl}
                      alt="Initial"
                      className="w-full h-auto max-h-48 object-contain rounded-xl group-hover:scale-102 transition-transform"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                      {t.clickToEnlarge}
                    </div>
                  </div>
                </div>

                {activeModalItem.item.revisions && activeModalItem.item.revisions.length > 0 && (
                  activeModalItem.item.revisions.map((rev, idx) => (
                    <div key={idx} className="bg-indigo-50/60 rounded-2xl p-3 border border-indigo-100 space-y-2">
                      <div className="flex justify-between text-xs text-indigo-600 font-bold">
                        <span>✏️ 第 {rev.stage} 次复习重写笔记</span>
                        <span>{rev.date}</span>
                      </div>
                      <div 
                        onClick={() => setFullScreenImage(rev.imageUrl)}
                        className="relative cursor-pointer group rounded-xl overflow-hidden bg-slate-900"
                      >
                        <img
                          src={rev.imageUrl}
                          alt={`Stage ${rev.stage}`}
                          className="w-full h-auto max-h-48 object-contain rounded-xl group-hover:scale-102 transition-transform"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                          {t.clickToEnlarge}
                        </div>
                      </div>

                      {rev.aiFeedback && (
                        <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100 text-[11px] text-slate-700 whitespace-pre-wrap">
                          <strong className="text-indigo-600 block mb-1">🤖 Gemini 批改记录：</strong>
                          {rev.aiFeedback}
                        </div>
                      )}
                    </div>
                  ))
                )}

                <button
                  onClick={() => setActiveModalItem(null)}
                  className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-2xl text-xs"
                >
                  {t.close}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔍 全屏大图沉浸式灯箱 */}
      {fullScreenImage && (
        <div 
          onClick={() => setFullScreenImage(null)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-2 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-150"
        >
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 z-50 bg-white/20 hover:bg-white/40 text-white text-lg font-extrabold w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-lg border border-white/30 transition-all"
          >
            ✕
          </button>

          <div className="absolute top-5 text-white/70 text-xs font-bold pointer-events-none">
            {lang === 'zh' ? '点击任意区域返回' : 'Tap anywhere to exit'}
          </div>

          <div className="w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center p-2">
            <img
              src={fullScreenImage}
              alt="Fullscreen View"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-200"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}