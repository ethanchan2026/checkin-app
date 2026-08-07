import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

type Subject = '语文' | '数学' | '英语' | '物理' | '化学';

interface ReviewPhoto {
  id: string;
  subject: Subject;
  imageUrl: string;
  uploadDate: string;
}

interface ReviewTask {
  photo: ReviewPhoto;
  stage: 1 | 3 | 5 | 7;
  completed: boolean;
}

export default function App() {
  const [streak, setStreak] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [todayTasks, setTodayTasks] = useState<ReviewTask[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number | null>(null);
  
  const [selectedSubject, setSelectedSubject] = useState<Subject>('语文');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [filterSubject, setFilterSubject] = useState<Subject | '全部'>('全部');

  const getDaysDiff = (dateStr: string) => {
    const start = new Date(dateStr);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  useEffect(() => {
    const savedPhotos = localStorage.getItem('review_photos_v3');
    const savedStreak = localStorage.getItem('review_streak');
    const savedXp = localStorage.getItem('review_xp');

    if (savedStreak) setStreak(Number(savedStreak));
    if (savedXp) setXp(Number(savedXp));

    let loadedPhotos: ReviewPhoto[] = [];
    if (savedPhotos) {
      loadedPhotos = JSON.parse(savedPhotos);
      setPhotos(loadedPhotos);
    }

    generateTodayTasks(loadedPhotos);
  }, []);

  const generateTodayTasks = (allPhotos: ReviewPhoto[]) => {
    const tasks: ReviewTask[] = [];
    allPhotos.forEach((photo) => {
      const day = getDaysDiff(photo.uploadDate);
      if (day === 1 || day === 3 || day === 5 || day === 7) {
        tasks.push({
          photo,
          stage: day as 1 | 3 | 5 | 7,
          completed: false,
        });
      }
    });
    setTodayTasks(tasks);
  };

  const handleUploadPhoto = () => {
    if (!selectedImage) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newPhoto: ReviewPhoto = {
      id: Date.now().toString(),
      subject: selectedSubject,
      imageUrl: selectedImage,
      uploadDate: todayStr,
    };

    const updatedPhotos = [newPhoto, ...photos];
    setPhotos(updatedPhotos);
    localStorage.setItem('review_photos_v3', JSON.stringify(updatedPhotos));

    setSelectedImage(null);
    setIsUploading(false);
    generateTodayTasks(updatedPhotos);
  };

  const handleCompleteLevel = (index: number) => {
    const updatedTasks = [...todayTasks];
    updatedTasks[index].completed = true;
    setTodayTasks(updatedTasks);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}

    setCurrentLevelIndex(null);

    const allDone = updatedTasks.every((t) => t.completed);
    if (allDone) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      const newXp = xp + updatedTasks.length * 10;
      const newStreak = streak + 1;
      setXp(newXp);
      setStreak(newStreak);
      localStorage.setItem('review_xp', newXp.toString());
      localStorage.setItem('review_streak', newStreak.toString());
    }
  };

  const filteredPhotos = filterSubject === '全部'
    ? photos
    : photos.filter((p) => p.subject === filterSubject);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-12 select-none">
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-orange-50 px-3 py-1 rounded-xl border border-orange-200">
            <span className="text-xl">🔥</span>
            <span className="font-extrabold text-orange-500">{streak} 天</span>
          </div>

          <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1 rounded-xl border border-yellow-200">
            <span className="text-xl">⚡</span>
            <span className="font-extrabold text-yellow-600">{xp} XP</span>
          </div>

          <button
            onClick={() => setIsUploading(true)}
            className="bg-green-500 hover:bg-green-600 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow border-b-2 border-green-700 active:translate-y-0.5"
          >
            + 上传资料
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6 space-y-6">
        {isUploading && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-green-500 space-y-4">
            <h3 className="font-extrabold text-gray-700 text-center">📷 选择学科并上传资料</h3>
            
            <div className="flex justify-between gap-1">
              {(['语文', '数学', '英语', '物理', '化学'] as Subject[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={
                    selectedSubject === sub
                      ? "flex-1 py-1.5 rounded-xl text-xs font-black bg-green-500 text-white shadow"
                      : "flex-1 py-1.5 rounded-xl text-xs font-black bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }
                >
                  {sub}
                </button>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center bg-gray-50">
              {selectedImage ? (
                <img src={selectedImage} alt="预览" className="max-h-48 mx-auto rounded-xl" />
              ) : (
                <label className="cursor-pointer block py-6">
                  <span className="text-4xl">📸</span>
                  <p className="text-xs text-gray-500 mt-2 font-bold">
                    点击上传 [{selectedSubject}] 照片资料
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setSelectedImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setIsUploading(false);
                  setSelectedImage(null);
                }}
                className="w-1/2 py-2 bg-gray-200 rounded-xl font-bold text-gray-600 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleUploadPhoto}
                disabled={!selectedImage}
                className={
                  selectedImage
                    ? "w-1/2 py-2 rounded-xl font-bold text-sm text-white bg-green-500 hover:bg-green-600"
                    : "w-1/2 py-2 rounded-xl font-bold text-sm text-white bg-gray-300"
                }
              >
                存入 [{selectedSubject}]
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-gray-200 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-black text-gray-700">🗺️ 全学科复习关卡路线</h2>
            <p className="text-xs text-gray-400 mt-1">
              {todayTasks.length > 0
                ? "今天共有 " + todayTasks.length + " 个跨学科关卡需要打卡"
                : "今天没有需要复习的照片，点击右上角上传新资料吧！"}
            </p>
          </div>

          <div className="flex flex-col items-center space-y-6 py-2">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                🎉 太棒了，今日所有学科的复习任务已全部通关！
              </div>
            ) : (
              todayTasks.map((task, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => setCurrentLevelIndex(index)}
                    disabled={task.completed}
                    className={
                      task.completed
                        ? "w-20 h-20 rounded-full font-black text-white text-lg flex flex-col items-center justify-center transition-all shadow-lg border-b-4 bg-gray-300 border-gray-400 cursor-not-allowed scale-95"
                        : "w-20 h-20 rounded-full font-black text-white text-lg flex flex-col items-center justify-center transition-all shadow-lg border-b-4 bg-green-500 hover:bg-green-600 border-green-700 active:translate-y-1 active:border-b-0"
                    }
                  >
                    <span className="text-xl">{task.completed ? "✅" : "🎯"}</span>
                    <span className="text-xs font-bold">第 {index + 1} 关</span>
                  </button>
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border">
                    [{task.photo.subject}] 第 {task.stage} 天复习
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {currentLevelIndex !== null && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-extrabold text-gray-700 flex items-center gap-1">
                  [{todayTasks[currentLevelIndex].photo.subject}] 第 {currentLevelIndex + 1} 关（第 {todayTasks[currentLevelIndex].stage} 天复习）
                </span>
                <button
                  onClick={() => setCurrentLevelIndex(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-gray-200 max-h-72 bg-black flex items-center justify-center">
                <img
                  src={todayTasks[currentLevelIndex].photo.imageUrl}
                  alt="复习内容"
                  className="max-h-72 w-auto object-contain"
                />
              </div>

              <button
                onClick={() => handleCompleteLevel(currentLevelIndex)}
                className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 shadow-md text-base"
              >
                我已经掌握，通关！🎉
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-gray-200 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-700 text-sm">📚 知识库照片 ({filteredPhotos.length})</h3>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value as any)}
              className="text-xs font-bold border rounded-lg px-2 py-1 bg-gray-50"
            >
              <option value="全部">全部学科</option>
              <option value="语文">语文</option>
              <option value="数学">数学</option>
              <option value="英语">英语</option>
              <option value="物理">物理</option>
              <option value="化学">化学</option>
            </select>
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2">
            {filteredPhotos.length === 0 ? (
              <span className="text-xs text-gray-400 py-2">暂无该学科的照片资料</span>
            ) : (
              filteredPhotos.map((p) => (
                <div key={p.id} className="relative flex-shrink-0">
                  <img
                    src={p.imageUrl}
                    alt="thumb"
                    className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                  />
                  <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-br-xl rounded-tl-md font-bold">
                    {p.subject}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}