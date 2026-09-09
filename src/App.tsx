import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import Cropper, { type Area } from 'react-easy-crop';
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Check,
  Crop,
  Flame,
  FolderOpen,
  GraduationCap,
  Home,
  ImageIcon,
  KeyRound,
  Languages,
  LogOut,
  Medal,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UploadCloud,
  UserRound,
  UserX,
  X,
  Zap,
} from 'lucide-react';
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

// 🌐 常用时区配置列表
const TIMEZONE_OPTIONS = [
  { label: '北京 / 香港 / 台北 / 新加坡 (UTC+8)', value: 'Asia/Shanghai', offset: 8 },
  { label: '东京 / 首尔 (UTC+9)', value: 'Asia/Tokyo', offset: 9 },
  { label: '悉尼 / 墨尔本 (UTC+10)', value: 'Australia/Sydney', offset: 10 },
  { label: '奥克兰 / 新西兰 (UTC+12)', value: 'Pacific/Auckland', offset: 12 },
  { label: '伦敦 / 格林威治标准时间 (UTC+0)', value: 'Europe/London', offset: 0 },
  { label: '巴黎 / 柏林 / 罗马 (UTC+1)', value: 'Europe/Paris', offset: 1 },
  { label: '纽约 / 多伦多 (UTC-5)', value: 'America/New_York', offset: -5 },
  { label: '芝加哥 (UTC-6)', value: 'America/Chicago', offset: -6 },
  { label: '旧金山 / 洛杉矶 / 温哥华 (UTC-8)', value: 'America/Los_Angeles', offset: -8 },
];

interface RevisionLog {
  stage: number | string;
  imageUrl?: string;
  imageUrls?: string[];
  date: string;
  aiFeedback?: string;
  completed?: boolean;
  completedAt?: string;
}

interface KnowledgeItem {
  id: string;
  title?: string;
  subject: string;
  imageUrl?: string;
  imageUrls?: string[];
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

export function getNetworkErrorMessage(error: unknown, fallback: string) {
  const errorRecord = error && typeof error === 'object'
    ? error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    : null;
  const message = error instanceof Error
    ? error.message
    : typeof errorRecord?.message === 'string'
      ? errorRecord.message
      : typeof error === 'string'
        ? error
        : '';
  if (/load failed|failed to fetch|networkerror|network request failed/i.test(message)) {
    return '网络请求失败，请检查网络连接或确认 Vercel 域名已加入 Supabase 的允许列表。';
  }
  if (message) {
    const extra = [errorRecord?.code, errorRecord?.details, errorRecord?.hint]
      .filter(value => typeof value === 'string' && value.trim())
      .join('；');
    return extra ? `${message}（${extra}）` : message;
  }
  return fallback;
}

const DEFAULT_SUBJECTS = ['语文', '数学', '英语', '物理', '化学'];
const MILESTONE_INTERVALS = [0, 1, 4, 11, 25];
const MAX_STORED_IMAGE_DIMENSION = 800;
const TARGET_STORED_IMAGE_BYTES = 280 * 1024;

function getDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

function encodeCanvasForStorage(canvas: HTMLCanvasElement) {
  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (getDataUrlBytes(dataUrl) > TARGET_STORED_IMAGE_BYTES && quality > 0.5) {
    quality = Math.max(0.5, quality - 0.08);
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return dataUrl;
}

function getCloudCompletedTaskIds(items: KnowledgeItem[], date: string) {
  return items.flatMap(item => {
    if (!Array.isArray(item.revisions)) return [];

    return item.revisions.flatMap(revision => {
      const stageNumber = Number(revision.stage);
      if (revision.date !== date || !Number.isFinite(stageNumber)) return [];
      return [`${item.id}_stage${stageNumber}`];
    });
  });
}

type CropTarget = 'new' | 'review';
interface CropSession {
  images: string[];
  currentIndex: number;
  target: CropTarget;
}

const TRANSLATIONS = {
  zh: {
    home: '主页',
    leaderboard: '排行榜',
    profile: '个人中心',
    uploadTitle: '上传新复习资料（可多选）',
    titlePlaceholder: '输入资料/卡片名称（如：三角函数诱导公式）',
    clickUpload: '点击添加笔记或原题照片',
    saveBtn: (count: number) => `保存 ${count} 张资料并生成复习关卡`,
    todayTasks: '今日复习关卡',
    noTasks: '今天没有需要复习的任务，快去上传新资料吧！',
    databaseTitle: '资料历史数据库',
    searchPlaceholder: '搜索卡片名称或科目...',
    all: '全部',
    addSubject: '+ 新增',
    deleteSet: '删除整套资料',
    renameSet: '重命名',
    mastered: '已掌握',
    challenge: '开始挑战',
    nativeNotice: '系统原生通知',
    enableNotice: '开启设备提醒权限',
    noticeEnabled: '通知权限已开启',
    logout: '退出登录',
    deleteAccount: '注销（删除）账户',
    deleteConfirm: '警告：注销账户将永久清空您在云端的所有卡片与复习历史记录且无法恢复，确定要注销吗？',
    rankTitle: '学习达人排行榜',
    myStats: '你的学习战绩',
    customSubTitle: '你的专属科目',
    langSwitch: '语言切换 / Language',
    enterSubject: '输入新自定义科目名称：',
    enterNewTitle: '输入新的卡片/文件夹名称：',
    reviewNotice: '上传本次复习重写笔记或答题照片（可多选）',
    completeBtn: '掌握知识点，打卡过关',
    syncing: '正在同步...',
    close: '关闭',
    totalPhotos: '张笔记',
    clickToEnlarge: '🔍 点击查看原图',
    feedbackTitle: '问题反馈与建议',
    feedbackPlaceholder: '遇到 Bug 或有好的建议？请告诉我们...',
    submitFeedback: '提交建议',
    sending: '正在发送...',
    feedbackSuccess: '🎉 感谢你的反馈！建议已成功发送到开发者的邮箱。',
    noRankData: '尚无其他活跃用户，快去邀请朋友一起来打卡吧！',
    initialReview: '初次复习',
    dayStageText: (stage: number) => `第 ${stage} 次复习`,
    aiCorrectionBtn: '让 Gemini AI 批改与纠错',
    aiAnalyzing: 'Gemini 正在深度比对与批改全部笔记中...',
    aiResultTitle: 'Gemini 智能批改诊断报告',
    setApiKey: '设置 Gemini API Key',
    reminderTimeTitle: '每日邮件提醒时间',
    reminderTimeDesc: '设定每天接收打卡提醒的时间与所在时区',
    timezoneTitle: '所在时区',
    newLevelReminderSent: '✅ 关卡已创建，提醒邮件已发送！',
    newLevelReminderFailed: '关卡已创建，但提醒邮件发送失败',
    cropTitle: '裁剪图片',
    cropHint: '拖动图片调整裁剪区域，滚动条可缩放',
    cropConfirm: '确认裁剪',
    cropCancel: '取消上传',
  },
  en: {
    home: 'Home',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    uploadTitle: 'Upload Study Materials (Multi-image)',
    titlePlaceholder: 'Enter title (e.g. Trig Formulas)',
    clickUpload: '+ Add Note Photos (Multi-select supported)',
    saveBtn: (count: number) => `Save ${count} Notes & Generate Levels`,
    todayTasks: "Today's Review Levels",
    noTasks: 'No review tasks today. Go upload new materials!',
    databaseTitle: 'Study Material Library',
    searchPlaceholder: 'Search by title or subject...',
    all: 'All',
    addSubject: '+ Add',
    deleteSet: 'Delete Deck',
    renameSet: 'Rename',
    mastered: 'Mastered',
    challenge: 'Start',
    nativeNotice: 'System Notification',
    enableNotice: 'Enable Device Notification',
    noticeEnabled: 'Notification Enabled',
    logout: 'Sign Out',
    deleteAccount: 'Delete Account Data',
    deleteConfirm: 'WARNING: This will permanently delete all your cards & study logs from the cloud. Are you sure?',
    rankTitle: 'Learning Leaderboard',
    myStats: 'Your Learning Stats',
    customSubTitle: 'Your Custom Subjects',
    langSwitch: 'Language / 语言切换',
    enterSubject: 'Enter new custom subject name:',
    enterNewTitle: 'Enter new deck/card title:',
    reviewNotice: 'Upload Review Photos (Multi-select)',
    completeBtn: 'Mastered & Complete Level',
    syncing: 'Syncing...',
    close: 'Close',
    totalPhotos: 'Notes',
    clickToEnlarge: '🔍 Tap to view fullscreen',
    feedbackTitle: 'Feedback & Suggestions',
    feedbackPlaceholder: 'Encountered a bug or have ideas? Let us know...',
    submitFeedback: 'Submit Feedback',
    sending: 'Sending...',
    feedbackSuccess: '🎉 Thank you! Your feedback has been sent to the developer.',
    noRankData: 'No other active users yet. Invite your friends to join!',
    initialReview: 'Initial Review',
    dayStageText: (stage: number) => `Stage ${stage} Review`,
    aiCorrectionBtn: 'Grade & Correct with Gemini AI',
    aiAnalyzing: 'Gemini is analyzing and correcting your notes...',
    aiResultTitle: 'Gemini AI Diagnostic Report',
    setApiKey: 'Set Gemini API Key',
    reminderTimeTitle: 'Daily Email Reminder Time',
    reminderTimeDesc: 'Set preferred daily reminder time and timezone',
    timezoneTitle: 'Timezone',
    newLevelReminderSent: '✅ Level created and reminder email sent!',
    newLevelReminderFailed: 'Level created, but the reminder email failed to send',
    cropTitle: 'Crop image',
    cropHint: 'Drag the image to adjust the crop area and use the slider to zoom',
    cropConfirm: 'Confirm crop',
    cropCancel: 'Cancel upload',
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
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  
  const [realLeaderboard, setRealLeaderboard] = useState<LeaderboardUser[]>([]);

  // 🔍 检索与过滤状态
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  // 📸 上传表单状态
  const [newTitle, setNewTitle] = useState<string>('');
  const [selectedUploadSubject, setSelectedUploadSubject] = useState<string>('语文');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [reviewNewImages, setReviewNewImages] = useState<string[]>([]);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState<number | 'free'>(4 / 3);
  const [freeCropSize, setFreeCropSize] = useState({ width: 320, height: 240 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

  // ⏰ 提醒时间与时区状态
  const [reminderTime, setReminderTime] = useState<string>('08:00');
  const [userTimezone, setUserTimezone] = useState<string>('Asia/Shanghai');

  // 🤖 API Key 与 AI 纠错状态
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
  const [syncError, setSyncError] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecking(false);
      setSyncError('');
    }).catch(error => {
      console.error('获取登录状态失败:', error);
      setAuthChecking(false);
      setSyncError(getNetworkErrorMessage(error, '无法连接到登录服务，请稍后重试。'));
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
      fetchUserProfile();
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const refreshSyncedData = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    window.addEventListener('focus', refreshSyncedData);
    document.addEventListener('visibilitychange', refreshSyncedData);
    return () => {
      window.removeEventListener('focus', refreshSyncedData);
      document.removeEventListener('visibilitychange', refreshSyncedData);
    };
  }, [session?.user?.id]);

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

  const sendReviewReminderEmail = async (tasks: Array<{ item: KnowledgeItem; stageNumber: number }>) => {
    const recipientEmail = session?.user?.email;
    if (!recipientEmail) {
      throw new Error(lang === 'zh' ? '当前账户没有可用邮箱' : 'No email address is available for this account');
    }

    const taskList = tasks
      .map(({ item, stageNumber }, index) =>
        `${index + 1}. [${item.subject}] ${item.title || item.subject} (${t.dayStageText(stageNumber)})`
      )
      .join('\n');

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: recipientEmail,
        user_email: recipientEmail,
        task_count: tasks.length,
        task_list: taskList,
        date: getTodayStr(),
      },
      EMAILJS_PUBLIC_KEY
    );
  };

  // 获取用户个人配置（提醒时间与时区）
  const fetchUserProfile = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('reminder_time, timezone')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (data?.reminder_time) {
      setReminderTime(data.reminder_time);
    }
    if (data?.timezone) {
      setUserTimezone(data.timezone);
    } else {
      // 自动侦测当前设备本地时区（作为初始兜底推荐）
      try {
        const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detectedTz && TIMEZONE_OPTIONS.some(tz => tz.value === detectedTz)) {
          setUserTimezone(detectedTz);
        }
      } catch (e) {}
    }
  };

  // ⏰ 保存提醒时间与时区
  const handleSaveReminderSettings = async (newTime: string, newTz: string) => {
    setReminderTime(newTime);
    setUserTimezone(newTz);
    if (!session?.user?.id) return;

    await supabase
      .from('user_profiles')
      .upsert({
        user_id: session.user.id,
        user_email: session.user.email,
        reminder_time: newTime,
        timezone: newTz,
        updated_at: new Date().toISOString(),
      });
  };

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

  const getItemImages = (item: KnowledgeItem): string[] => {
    if (item.imageUrls && item.imageUrls.length > 0) {
      return item.imageUrls;
    }
    return item.imageUrl ? [item.imageUrl] : [];
  };

  const getRevisionImages = (rev: RevisionLog): string[] => {
    if (rev.imageUrls && rev.imageUrls.length > 0) {
      return rev.imageUrls;
    }
    return rev.imageUrl ? [rev.imageUrl] : [];
  };

  async function persistLocalCompletions(
    loadedItems: KnowledgeItem[],
    localCompleted: string[],
    completionDate: string
  ) {
    if (!session?.user?.id || localCompleted.length === 0) return loadedItems;

    return Promise.all(loadedItems.map(async item => {
      const taskPrefix = `${item.id}_stage`;
      const completedStages = localCompleted
        .filter(taskId => taskId.startsWith(taskPrefix))
        .map(taskId => Number(taskId.slice(taskPrefix.length)))
        .filter(Number.isFinite);

      if (completedStages.length === 0) return item;

      const updatedRevisions = Array.isArray(item.revisions) ? [...item.revisions] : [];
      let shouldSync = false;
      completedStages.forEach(stageNumber => {
        const existsInCloud = updatedRevisions.some(
          revision => Number(revision.stage) === stageNumber && revision.date === completionDate
        );
        if (!existsInCloud) {
          shouldSync = true;
          updatedRevisions.push({
            stage: stageNumber,
            date: completionDate,
            completed: true,
            completedAt: new Date().toISOString(),
          });
        }
      });

      if (!shouldSync) return item;

      const { data: syncedItem, error } = await supabase
        .from('knowledge_base')
        .update({ revisions: updatedRevisions })
        .eq('id', item.id)
        .eq('user_id', session.user.id)
        .select('id')
        .maybeSingle();

      if (error || !syncedItem) {
        console.warn(`未能迁移任务 ${item.id} 的本地完成记录`, error);
        return item;
      }

      return { ...item, revisions: updatedRevisions };
    }));
  }

  async function fetchData() {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      const savedStreak = localStorage.getItem(`checkin_streak_${session.user.id}`);
      const savedXp = localStorage.getItem(`checkin_xp_${session.user.id}`);
      const savedCompleted = localStorage.getItem(`checkin_completed_${session.user.id}_${getTodayStr()}`);
      const nextStreak = savedStreak ? Number(savedStreak) : 1;
      const nextXp = savedXp ? Number(savedXp) : 20;
      let localCompleted: string[] = [];

      if (savedCompleted) {
        try {
          const parsed = JSON.parse(savedCompleted);
          if (Array.isArray(parsed)) {
            localCompleted = parsed.filter((taskId): taskId is string => typeof taskId === 'string');
          }
        } catch {
          localStorage.removeItem(`checkin_completed_${session.user.id}_${getTodayStr()}`);
        }
      }

      if (error) throw error;
      let loadedItemCount = items.length;
      if (data) {
        const syncedItems = await persistLocalCompletions(data, localCompleted, getTodayStr());
        const cloudCompleted = getCloudCompletedTaskIds(syncedItems, getTodayStr());
        const syncedCompleted = Array.from(new Set([...localCompleted, ...cloudCompleted]));
        loadedItemCount = syncedItems.length;
        setItems(syncedItems);
        setCompletedToday(syncedCompleted);
        localStorage.setItem(
          `checkin_completed_${session.user.id}_${getTodayStr()}`,
          JSON.stringify(syncedCompleted)
        );
      } else {
        setCompletedToday(localCompleted);
      }

      setStreak(nextStreak);
      setXp(nextXp);
      await fetchLeaderboard({ streak: nextStreak, xp: nextXp, itemCount: loadedItemCount });
      setSyncError('');
    } catch (error) {
      console.error('同步云端数据失败:', error);
      setSyncError(getNetworkErrorMessage(error, '云端数据同步失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeaderboard(currentStats?: { streak: number; xp: number; itemCount?: number }) {
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
        userMap[session.user.email] = {
          count: currentStats?.itemCount ?? items.length,
          userId: session.user.id,
        };
      }

      const boardList: LeaderboardUser[] = Object.keys(userMap).map(email => {
        const isCurrent = email === session?.user?.email;
        const count = userMap[email].count;
        const userStreak = isCurrent ? (currentStats?.streak ?? streak) : Math.max(1, count);
        const userXp = isCurrent ? (currentStats?.xp ?? xp) : count * 20;

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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 900;
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

          const compressedDataUrl = encodeCanvasForStorage(canvas);
          resolve(compressedDataUrl);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const createCroppedImage = (imageSrc: string, cropArea: Area): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const outputScale = Math.min(
          1,
          MAX_STORED_IMAGE_DIMENSION / cropArea.width,
          MAX_STORED_IMAGE_DIMENSION / cropArea.height
        );
        canvas.width = Math.max(1, Math.round(cropArea.width * outputScale));
        canvas.height = Math.max(1, Math.round(cropArea.height * outputScale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas is not supported'));
          return;
        }
        context.drawImage(
          image,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
        resolve(encodeCanvasForStorage(canvas));
      };
      image.onerror = () => reject(new Error('Unable to load image'));
      image.src = imageSrc;
    });
  };

  const openCropSession = (images: string[], target: CropTarget) => {
    if (images.length === 0) return;
    setCropSession({ images, currentIndex: 0, target });
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCropAspect(4 / 3);
    setFreeCropSize({ width: 320, height: 240 });
    setCroppedAreaPixels(null);
  };

  const finishCropSession = async () => {
    if (!cropSession || !croppedAreaPixels || isCropping) return;
    setIsCropping(true);
    try {
      const croppedImage = await createCroppedImage(cropSession.images[cropSession.currentIndex], croppedAreaPixels);
      if (cropSession.target === 'new') {
        setPreviewImages(prev => [...prev, croppedImage]);
      } else {
        setReviewNewImages(prev => [...prev, croppedImage]);
        setAiFeedback('');
      }
      if (cropSession.currentIndex === cropSession.images.length - 1) {
        setCropSession(null);
      } else {
        setCropSession(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null);
        setCropPosition({ x: 0, y: 0 });
        setCropZoom(1);
        setCroppedAreaPixels(null);
      }
    } catch (error) {
      console.error('图片裁剪失败:', error);
      alert(lang === 'zh' ? '图片裁剪失败，请重试。' : 'Unable to crop this image. Please try again.');
    } finally {
      setIsCropping(false);
    }
  };

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const compressedList = await Promise.all(fileList.map(file => compressImage(file)));
      openCropSession(compressedList, 'new');
    }
    e.target.value = '';
  };

  const handleReviewMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const compressedList = await Promise.all(fileList.map(file => compressImage(file)));
      openCropSession(compressedList, 'review');
    }
    e.target.value = '';
  };

  const handleRenameItem = async (id: string, currentTitle?: string) => {
    const promptTitle = prompt(t.enterNewTitle, currentTitle || '');
    if (promptTitle !== null) {
      const trimmedTitle = promptTitle.trim();
      const updatedItems = items.map(item => {
        if (item.id === id) {
          return { ...item, title: trimmedTitle };
        }
        return item;
      });
      setItems(updatedItems);

      await supabase
        .from('knowledge_base')
        .update({ title: trimmedTitle })
        .eq('id', id);
    }
  };

  const handleGeminiCorrection = async () => {
    if (!activeModalItem || reviewNewImages.length === 0) {
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
      const originalImages = getItemImages(activeModalItem.item);

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
        console.warn('探测模型失败，将使用预设模型列表', e);
      }

      const promptText = `
你是一位极其资深且富有耐心的全科金牌名师。
用户正在进行艾宾浩斯第 ${activeModalItem.stageNumber} 轮复习打卡。
【资料名称】：${activeModalItem.item.title || activeModalItem.item.subject}
前面提供的 ${originalImages.length} 张图片是【原始学习笔记/原题标准内容】；
随后提供的 ${reviewNewImages.length} 张图片是【用户今天本次复习重写/答题的内容】。

请综合对比所有图片，针对用户的答题情况进行详细批改：
1. 🎯 【完成度与正误判定】：准确指出所有题目/知识点的整体掌握程度。
2. 🔍 【错因与漏洞诊断】：精准定位每一张图中的漏写、笔误、符号错误或理解偏差。
3. 💡 【名师记忆口诀与点拨】：给出 1~2 句提纲挈领的高效记忆技巧或巩固建议。

请使用精炼、鼓励且排版清晰的 Markdown 输出（可适当使用 Emoji）。
`;

      const requestParts: any[] = [{ text: promptText }];

      originalImages.forEach(imgData => {
        const base64 = imgData.split(',')[1];
        if (base64) {
          requestParts.push({
            inlineData: { mimeType: 'image/jpeg', data: base64 }
          });
        }
      });

      reviewNewImages.forEach(imgData => {
        const base64 = imgData.split(',')[1];
        if (base64) {
          requestParts.push({
            inlineData: { mimeType: 'image/jpeg', data: base64 }
          });
        }
      });

      const requestBody = { contents: [{ parts: requestParts }] };

      let responseText = '';
      let lastErrorMessage = '';

      for (const modelName of candidateModels) {
        try {
          const cleanModelName = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${activeKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }
          );

          const data = await res.json();

          if (res.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            responseText = data.candidates[0].content.parts[0].text;
            break;
          } else if (data.error) {
            lastErrorMessage = data.error.message;
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
    if (previewImages.length === 0 || !session || isSavingKnowledge) return;

    setIsSavingKnowledge(true);

    const autoTitle = newTitle.trim() || `${selectedUploadSubject} 知识卡`;

    const newItemData = {
      title: autoTitle,
      subject: selectedUploadSubject,
      imageUrl: previewImages[0],
      imageUrls: previewImages,
      uploadDate: getTodayStr(),
      revisions: [],
      user_id: session.user.id,
      user_email: session.user.email
    };

    let data;
    let error;
    try {
      ({ data, error } = await supabase
        .from('knowledge_base')
        .insert([newItemData])
        .select('id')
        .maybeSingle());
    } catch (requestError) {
      console.error('保存新资料失败:', requestError);
      alert(`保存失败：${getNetworkErrorMessage(requestError, '无法保存资料，请稍后重试。')}`);
      setIsSavingKnowledge(false);
      return;
    }

    if (!error && data?.id) {
      const createdItem = { ...newItemData, id: data.id } as KnowledgeItem;
      setItems([createdItem, ...items]);
      setPreviewImages([]);
      setNewTitle('');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      fetchLeaderboard();

      try {
        await sendReviewReminderEmail([{ item: createdItem, stageNumber: 1 }]);
        alert(t.newLevelReminderSent);
      } catch (err: any) {
        console.error('新增关卡提醒邮件发送失败:', err);
        const errorMessage = err?.text || err?.message || (lang === 'zh' ? '请检查邮件配置' : 'Please check the email configuration');
        alert(`${t.newLevelReminderFailed}: ${errorMessage}`);
      }
    } else {
      alert(`保存失败：${getNetworkErrorMessage(error, '无法保存资料，请稍后重试。')}`);
    }
    setIsSavingKnowledge(false);
  };

  const handleCompleteTask = async (taskId: string, item: KnowledgeItem, stageNumber: number) => {
    if (!session?.user?.id || completedToday.includes(taskId) || completingTaskId === taskId) return;

    setCompletingTaskId(taskId);
    try {
      const completionDate = getTodayStr();
      const updatedRevisions = Array.isArray(item.revisions) ? [...item.revisions] : [];
      const existingRevisionIndex = updatedRevisions.findIndex(
        revision => Number(revision.stage) === stageNumber && revision.date === completionDate
      );
      const existingRevision = existingRevisionIndex >= 0
        ? updatedRevisions[existingRevisionIndex]
        : undefined;
      const completionRevision: RevisionLog = {
        ...existingRevision,
        stage: stageNumber,
        date: completionDate,
        completed: true,
        completedAt: new Date().toISOString(),
        ...(reviewNewImages.length > 0
          ? { imageUrl: reviewNewImages[0], imageUrls: reviewNewImages }
          : {}),
        ...(aiFeedback ? { aiFeedback } : {}),
      };

      if (existingRevisionIndex >= 0) {
        updatedRevisions[existingRevisionIndex] = completionRevision;
      } else {
        updatedRevisions.push(completionRevision);
      }

      const { data: syncedItem, error } = await supabase
        .from('knowledge_base')
        .update({ revisions: updatedRevisions })
        .eq('id', item.id)
        .eq('user_id', session.user.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!syncedItem) {
        throw new Error(lang === 'zh' ? '云端未找到对应的复习任务' : 'The review task was not found in the cloud');
      }

      setItems(currentItems => currentItems.map(currentItem =>
        currentItem.id === item.id
          ? { ...currentItem, revisions: updatedRevisions }
          : currentItem
      ));

      const newCompleted = Array.from(new Set([...completedToday, taskId]));
      setCompletedToday(newCompleted);
      localStorage.setItem(
        `checkin_completed_${session.user.id}_${completionDate}`,
        JSON.stringify(newCompleted)
      );

      const newXp = xp + 20;
      let newStreak = streak;
      setXp(newXp);
      localStorage.setItem(`checkin_xp_${session.user.id}`, newXp.toString());

      if (newCompleted.length === todayTasks.length) {
        newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem(`checkin_streak_${session.user.id}`, newStreak.toString());
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 } });
      } else {
        confetti({ particleCount: 40, spread: 50 });
      }

      setReviewNewImages([]);
      setAiFeedback('');
      setActiveModalItem(null);
      await fetchLeaderboard({ streak: newStreak, xp: newXp, itemCount: items.length });
    } catch (error: any) {
      console.error('同步任务完成状态失败:', error);
      alert(lang === 'zh'
        ? `完成状态同步失败，请检查网络后重试：${error?.message || '未知错误'}`
        : `Could not sync completion. Check your connection and retry: ${error?.message || 'Unknown error'}`
      );
    } finally {
      setCompletingTaskId(null);
    }
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

  const filteredDatabaseItems = items.filter(item => {
    const matchSubject = selectedSubject === 'ALL' || item.subject === selectedSubject;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchSubject;

    const matchTitle = (item.title || '').toLowerCase().includes(query);
    const matchSubText = (item.subject || '').toLowerCase().includes(query);
    return matchSubject && (matchTitle || matchSubText);
  });

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6fa] font-sans">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e5e7ef] bg-white px-5 py-4 text-xs font-bold text-[#676b7e] shadow-[0_14px_38px_rgba(31,35,55,0.08)]">
          <span className="grid h-8 w-8 animate-pulse place-items-center rounded-xl bg-[#635bff] text-white"><Check size={17} /></span>
          {lang === 'zh' ? '正在同步云端数据...' : 'Syncing cloud data...'}
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onSuccess={() => {}} lang={lang} onToggleLang={toggleLanguage} initialError={syncError} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#1b1d2a] font-sans lg:pl-60">
      {syncError && (
        <div className="mx-auto mt-3 flex w-[calc(100%_-_32px)] max-w-[1060px] items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          <span>{syncError}</span>
          <button type="button" onClick={() => fetchData()} className="shrink-0 rounded-xl bg-amber-100 px-3 py-1.5 font-extrabold text-amber-900 hover:bg-amber-200">重试</button>
        </div>
      )}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#e8eaf1] bg-white/95 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-2 pb-8">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-[#7770ff] to-[#5148ef] text-white shadow-[0_10px_24px_rgba(99,91,255,0.28)]">
            <Check size={22} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight">1357 {lang === 'zh' ? '学习' : 'Study'}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8b90a3]">Review smarter, daily</p>
          </div>
        </div>

        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#a1a5b5]">
          {lang === 'zh' ? '主要功能' : 'Navigation'}
        </p>
        <nav className="space-y-1.5">
          {([
            { key: 'home' as const, label: t.home, icon: Home },
            { key: 'leaderboard' as const, label: t.leaderboard, icon: Trophy },
            { key: 'profile' as const, label: t.profile, icon: UserRound },
          ]).map(({ key, label, icon: NavIcon }) => (
            <button
              key={key}
              onClick={() => setCurrentTab(key)}
              className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-xs font-extrabold transition-all ${
                currentTab === key
                  ? 'bg-[#efefff] text-[#635bff]'
                  : 'text-[#6f7386] hover:bg-[#f7f8fb] hover:text-[#2d3040]'
              }`}
            >
              <NavIcon size={18} strokeWidth={2} />
              <span>{label}</span>
              {key === 'home' && todayTasks.length > 0 && (
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[9px] text-[#635bff]">{todayTasks.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-[18px] bg-gradient-to-br from-[#2c2d3a] to-[#1d1f2b] p-4 text-white shadow-[0_14px_28px_rgba(24,25,34,0.2)]">
          <div className="flex items-center justify-between text-[10px] font-bold text-white/65">
            <span>{lang === 'zh' ? '本周学习目标' : 'Weekly goal'}</span>
            <Flame size={16} />
          </div>
          <div className="mt-2 flex items-end gap-1.5">
            <strong className="text-3xl font-black">{streak}</strong>
            <span className="pb-1 text-[10px] text-white/65">{lang === 'zh' ? '天连续学习' : 'day streak'}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#8a83ff] to-[#b7b3ff]" style={{ width: `${Math.min(100, (streak / 10) * 100)}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9e7ff] text-[11px] font-black text-[#635bff]">
            {(session?.user?.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-extrabold">{session?.user?.email?.split('@')[0]}</p>
            <p className="text-[9px] font-semibold text-[#8b90a3]">PRO {lang === 'zh' ? '学习者' : 'learner'}</p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#e8eaf1]/80 bg-[#f5f6fa]/85 px-4 backdrop-blur-xl sm:px-6 lg:h-[76px] lg:px-8">
        <div>
          <p className="text-sm font-black">{lang === 'zh' ? '学习工作台' : 'Study workspace'}</p>
          <p className="mt-0.5 hidden text-[10px] font-semibold text-[#858a9d] sm:block">
            {lang === 'zh' ? '保持节奏，每天进步一点' : 'Keep your rhythm and improve daily'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden h-9 items-center gap-1.5 rounded-xl border border-[#e5e7ef] bg-white px-3 text-[10px] font-black text-[#515568] sm:flex">
            <Flame size={15} className="text-[#ef8d32]" /><span>{streak}</span>
          </div>
          <div className="flex h-9 items-center gap-1.5 rounded-xl border border-[#e5e7ef] bg-white px-3 text-[10px] font-black text-[#515568]">
            <Zap size={15} className="text-[#e8a02d]" /><span>{xp} XP</span>
          </div>
          <button onClick={requestNativeNotification} className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5e7ef] bg-white text-[#5e6275] transition hover:border-[#bcb8ff] hover:text-[#635bff]" aria-label="Notifications">
            <Bell size={16} />
          </button>
          <button
            onClick={toggleLanguage}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[#e5e7ef] bg-white px-3 text-[10px] font-black text-[#515568] transition hover:border-[#bcb8ff] hover:text-[#635bff]"
          >
            <Languages size={14} /> {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </header>

      {/* 1. 🏠 主页 */}
      {currentTab === 'home' && (
        <main className="mx-auto grid w-full max-w-[1260px] grid-cols-1 gap-5 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10 xl:grid-cols-3">
          <div className="flex items-end justify-between xl:col-span-3">
            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em] text-[#191b28] sm:text-3xl">
                {lang === 'zh' ? '继续今天的学习' : 'Continue today’s learning'}
              </h1>
              <p className="mt-2 text-[11px] font-medium text-[#7c8194]">
                {lang === 'zh'
                  ? `你有 ${todayTasks.length} 个复习关卡等待完成，保持今天的学习节奏。`
                  : `${todayTasks.length} review level${todayTasks.length === 1 ? '' : 's'} waiting for you today.`}
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-[#e5e7ef] bg-white px-3 py-2 text-[10px] font-bold text-[#757a8e] sm:flex">
              <CalendarDays size={15} /> {new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {loading && (
            <div className="rounded-xl bg-[#efefff] py-2 text-center text-xs font-bold text-[#635bff] animate-pulse xl:col-span-3">
              {lang === 'zh' ? '正在同步云端资料...' : 'Syncing cloud data...'}
            </div>
          )}

          {/* 📸 上传新资料 */}
          <section className="order-2 space-y-4 rounded-[24px] border border-[#e6e8f0] bg-white p-5 shadow-[0_14px_38px_rgba(31,35,55,0.07)] xl:col-start-3 xl:row-start-2">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#efefff] text-[#635bff]"><Plus size={18} /></div>
              <div><h2 className="text-sm font-black">{lang === 'zh' ? '新建学习卡' : 'Create study card'}</h2><p className="mt-0.5 text-[9px] font-semibold text-[#8a8fa2]">{lang === 'zh' ? '上传资料并生成复习计划' : 'Upload notes and build a review plan'}</p></div>
            </div>

            <input
              type="text"
              placeholder={t.titlePlaceholder}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#e2e4ec] bg-[#f8f9fc] px-3 text-[11px] text-[#292c3b] outline-none transition placeholder:text-[#a2a6b6] focus:border-[#aaa5ff] focus:ring-4 focus:ring-[#efefff]"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {subjects.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedUploadSubject(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedUploadSubject === sub
                      ? 'bg-[#efefff] text-[#635bff]'
                      : 'bg-[#f7f8fb] text-[#767b8e] hover:bg-[#f0f1f6]'
                  }`}
                >
                  {sub}
                </button>
              ))}
              <button
                onClick={handleAddCustomSubject}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-[#dedcff] bg-white px-3 py-1.5 text-xs font-bold text-[#635bff] hover:bg-[#efefff]"
              >
                <Plus size={12} /> {t.addSubject.replace('+ ', '')}
              </button>
            </div>

            <label className="block cursor-pointer rounded-2xl border border-dashed border-[#cfd2df] bg-[#fbfbfd] p-5 text-center transition-all hover:border-[#9b95ff] hover:bg-[#f5f4ff]">
              <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white text-[#635bff] shadow-sm"><UploadCloud size={19} /></span>
              <span className="block text-[11px] font-extrabold text-[#4b4f62]">{t.clickUpload}</span>
              <span className="mt-1 block text-[9px] font-medium text-[#969aac]">JPG、PNG · {lang === 'zh' ? '支持多图上传' : 'Multiple images supported'}</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleMultipleImageUpload} 
                className="hidden" 
              />
            </label>

            {previewImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-slate-500">
                    已选 {previewImages.length} 张笔记照片
                  </span>
                  <button 
                    onClick={() => setPreviewImages([])} 
                    className="text-xs text-red-500 hover:underline font-bold"
                  >
                    清空全部
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {previewImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-100 group">
                      <img 
                        src={img} 
                        alt={`Preview ${idx + 1}`} 
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setFullScreenImage(img)}
                      />
                      <button
                        onClick={() => setPreviewImages(previewImages.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-700"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveNewKnowledge}
                  disabled={isSavingKnowledge}
                  className="w-full rounded-xl bg-[#635bff] py-3 text-xs font-extrabold text-white shadow-[0_9px_20px_rgba(99,91,255,0.24)] transition hover:bg-[#554ce8] disabled:cursor-wait disabled:opacity-50"
                >
                  {isSavingKnowledge ? '保存中...' : t.saveBtn(previewImages.length)}
                </button>
              </div>
            )}
          </section>

          {/* 🎯 今日复习关卡 */}
          <section className="order-1 space-y-4 rounded-[24px] border border-[#e6e8f0] bg-white p-5 shadow-[0_14px_38px_rgba(31,35,55,0.07)] sm:p-6 xl:col-span-2 xl:col-start-1 xl:row-start-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#efefff] text-[#635bff]"><Target size={18} /></div>
                <div><h2 className="text-sm font-black">{t.todayTasks}</h2><p className="mt-0.5 text-[9px] font-semibold text-[#8a8fa2]">{lang === 'zh' ? '根据 1357 记忆节奏生成' : 'Built from your 1357 review rhythm'}</p></div>
              </div>
              <span className="rounded-full bg-[#f7f8fb] px-2.5 py-1 text-[9px] font-bold text-[#73788b]">
                {todayTasks.length} 关卡
              </span>
            </div>

            {todayTasks.length === 0 ? (
              <div className="rounded-2xl bg-[#f8f9fc] py-10 text-center text-xs font-medium text-[#9195a7]">
                {t.noTasks}
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-1">
                {todayTasks.map(({ item, stageNumber }, index) => {
                  const taskId = `${item.id}_stage${stageNumber}`;
                  const isDone = completedToday.includes(taskId);
                  const displayTitle = item.title || item.subject;

                  return (
                    <button
                      key={taskId}
                      onClick={() => {
                        setReviewNewImages([]);
                        setAiFeedback('');
                        setActiveModalItem({ item, stageNumber, type: 'review' });
                      }}
                      className={`group relative flex w-full items-center justify-between overflow-hidden rounded-[18px] p-5 text-left font-extrabold transition-all ${
                        isDone
                          ? 'border border-[#e6e8ef] bg-[#f7f8fb] text-[#989cad]'
                          : 'bg-gradient-to-br from-[#6860ff] via-[#5d55ef] to-[#4b43d3] text-white shadow-[0_12px_25px_rgba(78,68,211,0.24)] hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="min-w-0 pr-4">
                        <div className="mb-2 flex items-center gap-2 text-[9px] font-bold opacity-80"><span className="rounded-lg bg-white/15 px-2 py-1">第 {index + 1} 关</span><span>{stageNumber === 1 ? t.initialReview : t.dayStageText(stageNumber)}</span></div>
                        <p className="truncate text-base font-black sm:text-lg">{displayTitle}</p>
                        <p className="mt-1 truncate text-[10px] font-semibold opacity-70">{item.subject} · {lang === 'zh' ? '回顾笔记并完成一次主动复述' : 'Review notes and complete an active recall'}</p>
                      </div>
                      <span className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black ${isDone ? 'bg-white text-[#7d8193]' : 'bg-white text-[#5148df]'}`}>
                        {isDone ? <Check size={14} /> : <ArrowRight size={14} />} {isDone ? t.mastered : t.challenge}
                      </span>
                    </button>
                  );
                })}
                <div className="mt-1 grid grid-cols-5 gap-2 overflow-x-auto pb-1">
                  {MILESTONE_INTERVALS.map((day, index) => (
                    <div key={day} className={`min-w-[72px] rounded-xl border px-2 py-2.5 text-center ${index === 0 ? 'border-[#dcd9ff] bg-[#efefff] text-[#635bff]' : 'border-transparent bg-[#f8f9fc] text-[#757a8d]'}`}>
                      <strong className="block text-[10px] font-black">{day === 0 ? (lang === 'zh' ? '今天' : 'Today') : `+${day} ${lang === 'zh' ? '天' : 'd'}`}</strong>
                      <span className="mt-0.5 block text-[8px] font-semibold">{index === 0 ? t.initialReview : t.dayStageText(index + 1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 📂 资料历史数据库 */}
          <section className="order-3 space-y-4 rounded-[24px] border border-[#e6e8f0] bg-white p-5 shadow-[0_14px_38px_rgba(31,35,55,0.07)] sm:p-6 xl:col-span-2 xl:col-start-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9f8f2] text-[#16a776]"><FolderOpen size={18} /></div>
                <div><h2 className="text-sm font-black">{t.databaseTitle}</h2><p className="mt-0.5 text-[9px] font-semibold text-[#8a8fa2]">{lang === 'zh' ? '管理所有知识卡与复习记录' : 'Manage cards and review history'}</p></div>
              </div>
              <span className="rounded-full bg-[#f7f8fb] px-2.5 py-1 text-[9px] font-bold text-[#73788b]">{filteredDatabaseItems.length} 套</span>
            </div>

            <div className="relative flex items-center">
              <Search size={15} className="pointer-events-none absolute left-3 text-[#9da1b2]" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#e2e4ec] bg-[#f8f9fc] pl-9 pr-10 text-[11px] text-[#292c3b] outline-none transition placeholder:text-[#a2a6b6] focus:border-[#aaa5ff] focus:ring-4 focus:ring-[#efefff]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-[#9296a8] hover:text-[#4c5062]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedSubject('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  selectedSubject === 'ALL'
                    ? 'bg-[#272936] text-white'
                    : 'bg-[#f7f8fb] text-[#757a8d] hover:bg-[#eff0f5]'
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
                      ? 'bg-[#272936] text-white'
                      : 'bg-[#f7f8fb] text-[#757a8d] hover:bg-[#eff0f5]'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {filteredDatabaseItems.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                {searchQuery ? '未找到相关资料' : '暂无资料'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {filteredDatabaseItems.map(item => {
                  const itemImages = getItemImages(item);
                  const revImagesCount = item.revisions?.reduce((sum, rev) => sum + getRevisionImages(rev).length, 0) || 0;
                  const totalPhotos = itemImages.length + revImagesCount;
                  const coverImage = itemImages[0] || '';
                  const displayTitle = item.title || `${item.subject} 资料`;

                  return (
                    <div 
                      key={item.id} 
                      className="group flex flex-col space-y-2 overflow-hidden rounded-2xl border border-[#e5e7ef] bg-white p-2.5 transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(31,35,55,0.09)]"
                    >
                      <div 
                        onClick={() => setActiveModalItem({ item, stageNumber: 1, type: 'viewFolder' })}
                        className="relative h-32 w-full shrink-0 cursor-pointer overflow-hidden rounded-xl bg-[#f1f2f7]"
                      >
                        <img 
                          src={coverImage} 
                          alt="Cover" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 block" 
                        />
                        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-[#2b2e3d]/80 px-2 py-1 text-[9px] font-extrabold text-white backdrop-blur-sm">
                          <ImageIcon size={11} /> {totalPhotos} {t.totalPhotos}
                        </div>
                      </div>

                      <div className="px-0.5">
                        <div 
                          onClick={() => handleRenameItem(item.id, item.title)}
                          className="font-bold text-xs text-slate-800 truncate cursor-pointer hover:text-indigo-600 flex items-center gap-1"
                          title="点击可重命名"
                        >
                          <span className="truncate">{displayTitle}</span>
                          <Pencil size={11} className="shrink-0 text-[#a0a4b4]" />
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {item.subject}
                          </span>
                          <span className="text-[9px] text-slate-400">{item.uploadDate}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center px-0.5 pt-1 border-t border-slate-200/60">
                        <button
                          onClick={() => handleRenameItem(item.id, item.title)}
                          className="flex items-center gap-1 text-[9px] font-bold text-[#777c8f] hover:text-[#635bff]"
                        >
                          <Pencil size={11} /> {t.renameSet}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="flex items-center gap-1 text-[9px] font-bold text-[#d87070] hover:text-red-600"
                        >
                          <Trash2 size={11} /> {t.deleteSet}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="order-4 rounded-[24px] border border-[#e6e8f0] bg-white p-5 shadow-[0_14px_38px_rgba(31,35,55,0.07)] xl:col-start-3 xl:row-start-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff4e5] text-[#e89a2e]"><BookOpenCheck size={18} /></div>
              <div><h2 className="text-sm font-black">{lang === 'zh' ? '学习概览' : 'Learning overview'}</h2><p className="mt-0.5 text-[9px] font-semibold text-[#8a8fa2]">{lang === 'zh' ? '今天的实时学习进度' : 'Your live progress today'}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[#f8f9fc] p-4"><span className="text-[9px] font-semibold text-[#8b90a3]">{lang === 'zh' ? '资料总数' : 'Total cards'}</span><strong className="mt-1 block text-xl font-black">{items.length}</strong></div>
              <div className="rounded-2xl bg-[#f8f9fc] p-4"><span className="text-[9px] font-semibold text-[#8b90a3]">{lang === 'zh' ? '今日完成' : 'Done today'}</span><strong className="mt-1 block text-xl font-black text-[#16a776]">{completedToday.length}</strong></div>
              <div className="rounded-2xl bg-[#f8f9fc] p-4"><span className="text-[9px] font-semibold text-[#8b90a3]">{lang === 'zh' ? '连续学习' : 'Streak'}</span><strong className="mt-1 flex items-center gap-1 text-xl font-black"><Flame size={17} className="text-[#ef8d32]" />{streak}</strong></div>
              <div className="rounded-2xl bg-[#f8f9fc] p-4"><span className="text-[9px] font-semibold text-[#8b90a3]">{lang === 'zh' ? '累计经验' : 'Total XP'}</span><strong className="mt-1 flex items-center gap-1 text-xl font-black"><Zap size={17} className="text-[#e8a02d]" />{xp}</strong></div>
            </div>
            <div className="mt-4 rounded-2xl bg-[#efefff] p-4">
              <div className="flex items-center justify-between text-[9px] font-bold text-[#6963c9]"><span>{lang === 'zh' ? '今日关卡完成率' : 'Today completion'}</span><span>{todayTasks.length === 0 ? 100 : Math.round((completedToday.length / todayTasks.length) * 100)}%</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#635bff]" style={{ width: `${todayTasks.length === 0 ? 100 : Math.min(100, (completedToday.length / todayTasks.length) * 100)}%` }} /></div>
            </div>
          </section>
        </main>
      )}

      {/* 2. 🏆 排行榜 */}
      {currentTab === 'leaderboard' && (
        <main className="mx-auto w-full max-w-[1000px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          <section className="space-y-5 rounded-[24px] border border-[#e6e8f0] bg-white p-5 shadow-[0_14px_38px_rgba(31,35,55,0.07)] sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#fff4e5] text-[#e89a2e]"><Trophy size={20} /></div>
              <div><h2 className="text-lg font-black">{t.rankTitle}</h2><p className="mt-0.5 text-[10px] font-semibold text-[#8a8fa2]">{lang === 'zh' ? '和所有学习者一起保持进步' : 'Keep progressing with every learner'}</p></div>
            </div>

            <div className="flex flex-col gap-4 rounded-[20px] bg-gradient-to-br from-[#6860ff] to-[#4b43d3] p-5 text-white shadow-[0_14px_28px_rgba(78,68,211,0.24)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold opacity-70">{t.myStats}</p>
                <p className="mt-1 break-all text-sm font-extrabold sm:max-w-[220px] sm:truncate">
                  {session?.user?.email}
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-3 text-left sm:flex sm:w-auto sm:items-center sm:gap-4 sm:text-right">
                <div className="rounded-xl bg-white/10 px-3 py-2 sm:bg-transparent sm:p-0">
                  <p className="text-[9px] opacity-70">Streak</p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-black"><Flame size={17} />{streak}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2 sm:bg-transparent sm:p-0">
                  <p className="text-[9px] opacity-70">XP</p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-black"><Zap size={17} />{xp}</p>
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
                  return (
                    <div 
                      key={user.user_email} 
                      className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                        user.isCurrent 
                          ? 'border-[#dcd9ff] bg-[#efefff]'
                          : 'border-[#e8eaf1] bg-[#fafbfc]'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ${idx < 3 ? 'bg-[#fff4e5] text-[#e89a2e]' : 'bg-white text-[#74798c]'}`}>
                          {idx < 3 ? <Medal size={17} /> : `#${idx + 1}`}
                        </span>
                        <div className="min-w-0">
                          <p className={`truncate text-xs font-extrabold ${user.isCurrent ? 'text-[#5149d8]' : 'text-[#3f4354]'}`}>
                            {user.user_email?.split('@')[0]} {user.isCurrent ? '(You)' : ''}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {idx === 0 ? 'Top Scholar' : `Rank #${idx + 1}`}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-2 text-[10px] font-black text-[#6e7386] sm:gap-3">
                        <span className="flex items-center gap-1"><Flame size={13} className="text-[#ef8d32]" />{user.streak}</span>
                        <span className="flex items-center gap-1"><Zap size={13} className="text-[#e8a02d]" />{user.xp} XP</span>
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
        <main className="mx-auto w-full max-w-[1060px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          <section className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-3 rounded-[24px] border border-[#e6e8f0] bg-white p-6 text-center shadow-[0_14px_38px_rgba(31,35,55,0.07)]">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] bg-gradient-to-br from-[#7770ff] to-[#5148ef] text-white shadow-[0_12px_28px_rgba(99,91,255,0.28)]">
                <GraduationCap size={34} strokeWidth={1.8} />
              </div>
              <h2 className="break-all text-sm font-extrabold text-[#2f3242]">
                {session?.user?.email}
              </h2>
              <span className="inline-block rounded-full bg-[#e9f8f2] px-3 py-1 text-[10px] font-bold text-[#16a776]">
                PRO 学习者
              </span>
              <div className="grid grid-cols-2 gap-2 pt-3">
                <div className="rounded-xl bg-[#f8f9fc] p-3"><strong className="block text-lg font-black">{streak}</strong><span className="text-[8px] font-semibold text-[#8b90a3]">Streak</span></div>
                <div className="rounded-xl bg-[#f8f9fc] p-3"><strong className="block text-lg font-black">{xp}</strong><span className="text-[8px] font-semibold text-[#8b90a3]">XP</span></div>
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] border border-[#e6e8f0] bg-white p-5 shadow-[0_14px_38px_rgba(31,35,55,0.07)] sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#efefff] text-[#635bff]"><Settings2 size={18} /></div>
                <div><h2 className="text-sm font-black">{lang === 'zh' ? '账户与偏好设置' : 'Account & preferences'}</h2><p className="mt-0.5 text-[9px] font-semibold text-[#8a8fa2]">{lang === 'zh' ? '管理提醒、语言与学习体验' : 'Manage reminders, language and learning experience'}</p></div>
              </div>
              {/* ⏰ 提醒时间与时区设置卡片 */}
              <div className="space-y-3 rounded-2xl border border-[#e8eaf1] bg-[#f8f9fc] p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Bell size={17} className="text-[#635bff]" />
                    <div>
                    <p className="text-xs font-bold text-slate-700">{t.reminderTimeTitle}</p>
                    <p className="text-[10px] text-slate-400">{t.reminderTimeDesc}</p>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => handleSaveReminderSettings(e.target.value, userTimezone)}
                    className="text-xs font-extrabold bg-white border border-slate-300 rounded-xl px-2 py-1 text-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 🌍 时区下拉选择框 */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 shrink-0">{t.timezoneTitle}</span>
                  <select
                    value={userTimezone}
                    onChange={(e) => handleSaveReminderSettings(reminderTime, e.target.value)}
                    className="w-full max-w-[200px] text-[11px] font-bold bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 truncate"
                  >
                    {TIMEZONE_OPTIONS.map(tz => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 🔑 API Key 设置 */}
              <div className="flex items-center justify-between rounded-2xl border border-[#e8eaf1] bg-[#f8f9fc] p-4">
                <div className="flex items-center gap-3">
                  <KeyRound size={17} className="text-[#635bff]" />
                  <div>
                  <p className="text-xs font-bold text-slate-700">{t.setApiKey}</p>
                  <p className="text-[10px] text-slate-400">
                    {userApiKey ? `已配置 (***${userApiKey.slice(-4)})` : '未配置 (点击右侧配置)'}
                  </p>
                  </div>
                </div>
                <button
                  onClick={handleConfigureApiKey}
                  className="rounded-xl bg-[#635bff] px-3 py-2 text-[10px] font-extrabold text-white shadow-sm transition-all hover:bg-[#554ce8]"
                >
                  {userApiKey ? '修改 Key' : '配置 Key'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-[#e8eaf1] bg-[#f8f9fc] p-4">
                <span className="flex items-center gap-3 text-xs font-bold text-slate-700"><Languages size={17} className="text-[#635bff]" />{t.langSwitch}</span>
                <button
                  onClick={toggleLanguage}
                  className="rounded-xl bg-white px-3 py-2 text-[10px] font-extrabold text-[#635bff] shadow-sm ring-1 ring-[#dedcff]"
                >
                  {lang === 'zh' ? '中文 ➔ EN' : 'EN ➔ 中文'}
                </button>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#e8eaf1] bg-[#f8f9fc] p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">{t.customSubTitle}</span>
                  <button
                    onClick={handleAddCustomSubject}
                    className="flex items-center gap-1 rounded-xl bg-[#16a776] px-2.5 py-1.5 text-[10px] font-extrabold text-white"
                  >
                    <Plus size={12} /> {t.addSubject.replace('+ ', '')}
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

              <div className="flex items-center justify-between rounded-2xl border border-[#e8eaf1] bg-[#f8f9fc] p-4">
                <div className="flex items-center gap-3">
                  <Bell size={17} className="text-[#635bff]" />
                  <div>
                  <p className="text-xs font-bold text-slate-700">{t.nativeNotice}</p>
                  <p className="text-[10px] text-slate-400">
                    {notificationPermission === 'granted' ? t.noticeEnabled : '开启设备提醒权限'}
                  </p>
                  </div>
                </div>
                <button
                  onClick={requestNativeNotification}
                  disabled={notificationPermission === 'granted'}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all ${
                    notificationPermission === 'granted'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-indigo-500 text-white border-indigo-600 hover:bg-indigo-600'
                  }`}
                >
                  {notificationPermission === 'granted' ? <><Check size={13} />已开启</> : t.enableNotice}
                </button>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#e8eaf1] bg-[#f8f9fc] p-4">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-700"><MessageSquareText size={16} className="text-[#635bff]" />{t.feedbackTitle}</span>
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
                    className="w-full rounded-xl bg-[#635bff] py-2.5 text-xs font-extrabold text-white shadow-md transition-all hover:bg-[#554ce8] disabled:opacity-50"
                  >
                    {sendingFeedback ? t.sending : t.submitFeedback}
                  </button>
                </form>
              </div>

              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e1e3eb] bg-[#f8f9fc] py-3 text-xs font-extrabold text-[#5d6174] transition-all hover:bg-[#f0f1f5]"
              >
                <LogOut size={15} /> {t.logout}
              </button>

              <div className="pt-2">
                <button
                  onClick={handleDeleteAccount}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-3 text-xs font-extrabold text-red-600 transition-all hover:bg-red-100"
                >
                  <UserX size={15} /> {t.deleteAccount}
                </button>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 📌 底部导航栏 */}
      <nav className="fixed bottom-3 left-1/2 z-30 grid h-[68px] w-[calc(100%_-_28px)] max-w-md -translate-x-1/2 grid-cols-3 rounded-[21px] border border-[#e5e7ef] bg-white/95 p-1.5 shadow-[0_18px_50px_rgba(31,35,55,0.16)] backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center justify-center gap-1 rounded-[14px] transition-all ${
            currentTab === 'home' ? 'bg-[#efefff] text-[#635bff] font-extrabold' : 'text-[#9296a8] font-bold'
          }`}
        >
          <Home size={18} strokeWidth={2} />
          <span className="text-[10px]">{t.home}</span>
        </button>

        <button
          onClick={() => setCurrentTab('leaderboard')}
          className={`flex flex-col items-center justify-center gap-1 rounded-[14px] transition-all ${
            currentTab === 'leaderboard' ? 'bg-[#efefff] text-[#635bff] font-extrabold' : 'text-[#9296a8] font-bold'
          }`}
        >
          <Trophy size={18} strokeWidth={2} />
          <span className="text-[10px]">{t.leaderboard}</span>
        </button>

        <button
          onClick={() => setCurrentTab('profile')}
          className={`flex flex-col items-center justify-center gap-1 rounded-[14px] transition-all ${
            currentTab === 'profile' ? 'bg-[#efefff] text-[#635bff] font-extrabold' : 'text-[#9296a8] font-bold'
          }`}
        >
          <UserRound size={18} strokeWidth={2} />
          <span className="text-[10px]">{t.profile}</span>
        </button>
      </nav>

      {cropSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171824]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(16,18,30,0.35)]">
            <div className="flex items-center justify-between border-b border-[#eceef3] px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black text-[#252838]"><Crop size={17} className="text-[#635bff]" />{t.cropTitle}</h2>
                <p className="mt-1 text-[10px] font-semibold text-[#8b90a3]">{cropSession.currentIndex + 1} / {cropSession.images.length} · {t.cropHint}</p>
              </div>
              <button type="button" onClick={() => setCropSession(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f5f8] text-[#858a9d] hover:bg-[#eceef3]"><X size={16} /></button>
            </div>
            <div className="relative h-[min(62vh,420px)] w-full bg-[#171824]">
              <Cropper
                image={cropSession.images[cropSession.currentIndex]}
                crop={cropPosition}
                zoom={cropZoom}
                aspect={cropAspect === 'free' ? 4 / 3 : cropAspect}
                cropSize={cropAspect === 'free' ? freeCropSize : undefined}
                onCropChange={setCropPosition}
                onZoomChange={setCropZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                objectFit="contain"
                classes={{ containerClassName: 'cropper-container' }}
              />
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <p className="mb-2 text-[10px] font-bold text-[#777c8f]">裁剪比例</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {([
                    { label: '自由', value: 'free' as const },
                    { label: '1:1', value: 1 },
                    { label: '4:3', value: 4 / 3 },
                    { label: '16:9', value: 16 / 9 },
                    { label: '3:4', value: 3 / 4 },
                    { label: '9:16', value: 9 / 16 },
                  ]).map(option => {
                    const selected = cropAspect === option.value;
                    return (
                      <button
                        type="button"
                        key={option.label}
                        onClick={() => {
                          setCropAspect(option.value);
                          setCropPosition({ x: 0, y: 0 });
                          setCropZoom(1);
                          setCroppedAreaPixels(null);
                        }}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-extrabold transition ${selected ? 'bg-[#635bff] text-white shadow-sm' : 'bg-[#f4f5f8] text-[#777c8f] hover:bg-[#eceef4]'}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {cropAspect === 'free' && (
                <div className="space-y-2 rounded-xl bg-[#f8f9fc] p-3">
                  <div className="flex items-center gap-3 text-[10px] font-bold text-[#777c8f]">
                    <span className="w-9 shrink-0">宽度</span>
                    <input type="range" min={180} max={360} value={freeCropSize.width} onChange={(event) => { setFreeCropSize(size => ({ ...size, width: Number(event.target.value) })); setCroppedAreaPixels(null); }} className="h-1.5 w-full accent-[#635bff]" />
                    <span className="w-10 text-right">{freeCropSize.width}px</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-[#777c8f]">
                    <span className="w-9 shrink-0">高度</span>
                    <input type="range" min={120} max={300} value={freeCropSize.height} onChange={(event) => { setFreeCropSize(size => ({ ...size, height: Number(event.target.value) })); setCroppedAreaPixels(null); }} className="h-1.5 w-full accent-[#635bff]" />
                    <span className="w-10 text-right">{freeCropSize.height}px</span>
                  </div>
                </div>
              )}
              <label className="flex items-center gap-3 text-[10px] font-bold text-[#777c8f]">
                <span className="shrink-0">缩放</span>
                <input type="range" min={1} max={3} step={0.05} value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} className="h-1.5 w-full accent-[#635bff]" />
                <span className="w-7 text-right">{cropZoom.toFixed(1)}x</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCropSession(null)} className="flex-1 rounded-xl border border-[#e1e3eb] bg-[#f8f9fc] py-3 text-xs font-extrabold text-[#656a7d] hover:bg-[#eff0f5]">{t.cropCancel}</button>
                <button type="button" onClick={finishCropSession} disabled={isCropping || !croppedAreaPixels} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#635bff] py-3 text-xs font-extrabold text-white shadow-[0_9px_20px_rgba(99,91,255,0.24)] hover:bg-[#554ce8] disabled:opacity-50"><Check size={15} />{isCropping ? '处理中...' : t.cropConfirm}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 业务弹窗 */}
      {activeModalItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#171824]/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_28px_80px_rgba(16,18,30,0.35)] sm:p-6">
            <div className="flex justify-between items-center">
              <span className="flex max-w-[calc(100%_-_48px)] items-center gap-2 truncate rounded-xl bg-[#efefff] px-3 py-2 text-xs font-extrabold text-[#635bff]">
                <Target size={14} className="shrink-0" />
                {activeModalItem.item.title || activeModalItem.item.subject} · {activeModalItem.stageNumber === 1 ? t.initialReview : t.dayStageText(activeModalItem.stageNumber)}
              </span>
              <button
                onClick={() => {
                  setActiveModalItem(null);
                  setReviewNewImages([]);
                  setAiFeedback('');
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f5f8] text-[#858a9d] transition hover:bg-[#eceef3] hover:text-[#4c5062]"
              >
                <X size={16} />
              </button>
            </div>

            {/* 🎯 复习挑战与 AI 批改弹窗 */}
            {activeModalItem.type === 'review' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><ImageIcon size={14} />原始笔记（共 {getItemImages(activeModalItem.item).length} 张）</span>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-100 rounded-2xl border">
                    {getItemImages(activeModalItem.item).map((img, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setFullScreenImage(img)}
                        className="relative aspect-video overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center cursor-pointer group"
                      >
                        <img
                          src={img}
                          alt={`Original ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <label className="block cursor-pointer rounded-2xl border border-dashed border-[#b8b4ff] bg-[#f7f6ff] p-3 text-center transition-all hover:border-[#7f78ff]">
                    <span className="flex items-center justify-center gap-2 text-xs font-bold text-[#635bff]">
                      <UploadCloud size={15} />
                      {t.reviewNotice}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={handleReviewMultipleImageUpload} 
                      className="hidden" 
                    />
                  </label>

                  {reviewNewImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-bold text-slate-500">
                          已选 {reviewNewImages.length} 张答题/默写照片
                        </span>
                        <button 
                          onClick={() => setReviewNewImages([])} 
                          className="text-[11px] text-red-500 font-bold"
                        >
                          清空
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {reviewNewImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-100 group">
                            <img 
                              src={img} 
                              alt={`Review ${idx + 1}`} 
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setFullScreenImage(img)}
                            />
                            <button
                              onClick={() => setReviewNewImages(reviewNewImages.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleGeminiCorrection}
                        disabled={isAiAnalyzing}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#635bff] to-[#8b61ed] py-2.5 text-xs font-extrabold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-60"
                      >
                        <Sparkles size={15} />
                        {isAiAnalyzing ? t.aiAnalyzing : t.aiCorrectionBtn}
                      </button>
                    </div>
                  )}

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
                  disabled={completingTaskId === `${activeModalItem.item.id}_stage${activeModalItem.stageNumber}`}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16a776] py-3.5 font-extrabold text-white shadow-[0_10px_22px_rgba(22,167,118,0.24)] transition-all hover:bg-[#128d64] disabled:cursor-wait disabled:opacity-60"
                >
                  <Check size={17} />
                  {completingTaskId === `${activeModalItem.item.id}_stage${activeModalItem.stageNumber}`
                    ? t.syncing
                    : t.completeBtn}
                </button>
              </div>
            )}

            {/* 📂 资料库相册弹窗 */}
            {activeModalItem.type === 'viewFolder' && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="bg-slate-50 rounded-2xl p-3 border space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-800">{activeModalItem.item.title || activeModalItem.item.subject}</span>
                    <span className="text-slate-400">{activeModalItem.item.uploadDate}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {getItemImages(activeModalItem.item).map((img, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setFullScreenImage(img)}
                        className="relative cursor-pointer group rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center"
                      >
                        <img
                          src={img}
                          alt={`Initial ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {activeModalItem.item.revisions && activeModalItem.item.revisions.length > 0 && (
                  activeModalItem.item.revisions.map((rev, idx) => {
                    const revImgs = getRevisionImages(rev);
                    return (
                      <div key={idx} className="bg-indigo-50/60 rounded-2xl p-3 border border-indigo-100 space-y-2">
                        <div className="flex justify-between text-xs text-indigo-600 font-bold">
                          <span className="flex items-center gap-1.5"><Pencil size={13} />第 {rev.stage} 次复习重写笔记（共 {revImgs.length} 张）</span>
                          <span>{rev.date}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {revImgs.map((img, imgIdx) => (
                            <div 
                              key={imgIdx}
                              onClick={() => setFullScreenImage(img)}
                              className="relative cursor-pointer group rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center"
                            >
                              <img
                                src={img}
                                alt={`Stage ${rev.stage} - ${imgIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                #{imgIdx + 1}
                              </div>
                            </div>
                          ))}
                        </div>

                        {rev.aiFeedback && (
                          <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100 text-[11px] text-slate-700 whitespace-pre-wrap">
                            <strong className="mb-1 flex items-center gap-1.5 text-indigo-600"><Sparkles size={13} />Gemini 批改记录：</strong>
                            {rev.aiFeedback}
                          </div>
                        )}
                      </div>
                    );
                  })
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
            className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20 text-white backdrop-blur-lg transition-all hover:bg-white/40"
          >
            <X size={19} />
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
