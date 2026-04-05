'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/hooks/useSound';
import { useLicense } from '@/hooks/useLicense';
import { Eye, EyeOff, Volume2, VolumeX, Keyboard, LogOut, Settings } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import LoadingScreen from '@/components/LoadingScreen';
import LockScreen from '@/components/LockScreen';

const PASSWORD = 'ToiYeuHoaCuteo';

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface QuizQuestion {
  id?: string;
  question_text: string;
  options: string[];
  correct_index: number;
  difficulty?: string;
  phase?: string;
  quiz_set_id?: string;
  image_url?: string;
}

const LOCAL_QUESTIONS: QuizQuestion[] = [
  { id: '1', question_text: 'Vận tốc là gì?', options: ['Quãng đường đi được trong một đơn vị thời gian', 'Gia tốc trên thời gian', 'Lực tác động lên vật', 'Năng lượng của vật'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '2', question_text: 'Định luật Newton thứ nhất nói gì?', options: ['Vật sẽ giữ nguyên trạng thái nếu không có lực tác dụng', 'Lực bằng khối lượng nhân gia tốc', 'Lực tác dụng bằng lực phản lực', 'Vật luôn chuyển động'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '3', question_text: 'Đơn vị của lực là gì?', options: ['Newton', 'Joule', 'Watt', 'Pascal'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '4', question_text: 'Năng lượng động học phụ thuộc vào gì?', options: ['Khối lượng và vận tốc', 'Chỉ khối lượng', 'Chỉ vận tốc', 'Gia tốc'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '5', question_text: 'Trọng lực tác dụng lên vật có phương như thế nào?', options: ['Hướng xuống dưới (về tâm Trái Đất)', 'Hướng lên trên', 'Ngang theo chiều chuyển động', 'Theo phương ngang'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '6', question_text: 'Gia tốc rơi tự do trên Trái Đất bằng bao nhiêu?', options: ['10 m/s²', '20 m/s²', '5 m/s²', '15 m/s²'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '7', question_text: 'Công cơ học được tính theo công thức nào?', options: ['W = F × s × cos(θ)', 'W = m × v', 'W = a × t', 'W = F / t'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '8', question_text: 'Chuyển động thẳng đều có đặc điểm nào?', options: ['Vận tốc không đổi', 'Gia tốc không đổi', 'Lực tác dụng lên vật lớn', 'Vật có gia tốc dương'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '9', question_text: 'Áp suất được định nghĩa là gì?', options: ['Lực trên một đơn vị diện tích', 'Lực nhân diện tích', 'Lực chia thời gian', 'Khối lượng trên diện tích'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '10', question_text: 'Động lượng là gì?', options: ['Tích của khối lượng và vận tốc', 'Chia khối lượng cho vận tốc', 'Lực chia thời gian', 'Gia tốc nhân khối lượng'], correct_index: 0, difficulty: 'easy', phase: 'Cơ bản' },
  { id: '11', question_text: 'Công thức tính thế năng trọng trường là gì?', options: ['Ep = mgh', 'Ep = ½mv²', 'Ep = F × d', 'Ep = v²/g'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '12', question_text: 'Định luật bảo toàn năng lượng cơ học nói rằng', options: ['Tổng năng lượng động học và thế năng không đổi', 'Năng lượng luôn tăng', 'Năng lượng luôn giảm', 'Không có sự bảo toàn năng lượng'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '13', question_text: 'Momen lực được tính như thế nào?', options: ['M = F × d (d là cánh tay đòn)', 'M = F / d', 'M = F × v', 'M = F + d'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '14', question_text: 'Chuyển động tròn đều có tốc độ như thế nào?', options: ['Tốc độ không đổi nhưng vận tốc thay đổi', 'Cả tốc độ và vận tốc không đổi', 'Tốc độ thay đổi', 'Vật không có gia tốc'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '15', question_text: 'Gia tốc hướng tâm trong chuyển động tròn đều bằng', options: ['a = v²/r', 'a = v × r', 'a = v/r', 'a = r/v'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '16', question_text: 'Công tố của lò xo được tính bằng', options: ['Ep = ½kx²', 'Ep = kx', 'Ep = k/x²', 'Ep = x²/k'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '17', question_text: 'Sóng cơ học là gì?', options: ['Sự lan truyền dao động trong môi trường', 'Chuyển động của các hạt vật chất', 'Một loại năng lượng điện', 'Ánh sáng di chuyển'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '18', question_text: 'Tần số sóng và bước sóng có mối liên hệ gì?', options: ['v = λ × f (v là vận tốc sóng)', 'v = λ / f', 'v = f / λ', 'f = λ + v'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '19', question_text: 'Định luật Hooke nói rằng', options: ['Lực đàn hồi tỉ lệ với độ biến dạng', 'Lực tỉ lệ với vận tốc', 'Lực tỉ lệ với khối lượng', 'Lực không phụ thuộc vào gì'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '20', question_text: 'Hiệu suất cơ học được định nghĩa là', options: ['Tỉ số giữa công có ích và công toàn phần', 'Công toàn phần chia công có ích', 'Tổng của tất cả các công', 'Lực chia vận tốc'], correct_index: 0, difficulty: 'medium', phase: 'Trung bình' },
  { id: '21', question_text: 'Trong chuyển động của hành tinh, điều nào là đúng?', options: ['Quỹ đạo elip, tốc độ không đều theo quỹ đạo', 'Quỹ đạo tròn, tốc độ đều', 'Quỹ đạo parabol', 'Tốc độ luôn tăng'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '22', question_text: 'Định luật bảo toàn động lượng áp dụng khi nào?', options: ['Không có lực ngoài tác dụng hoặc lực ngoài cân bằng', 'Lực ngoài luôn tác dụng', 'Khi vật đứng yên', 'Khi gia tốc bằng không'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '23', question_text: 'Hiệu ứng Doppler xảy ra khi nào?', options: ['Nguồn sóng và quan sát viên chuyển động tương đối', 'Sóng di chuyển thẳng', 'Không có chuyển động', 'Sóng ngừng lan truyền'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '24', question_text: 'Cơ năng của hệ bảo toàn khi nào?', options: ['Chỉ lực bảo toàn (như trọng lực) tác dụng', 'Có ma sát', 'Vật chuyển động nhanh', 'Vật chuyển động chậm'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '25', question_text: 'Phương trình dao động điều hòa là gì?', options: ['x = A × cos(ωt + φ)', 'x = A × sin(t)', 'x = t²', 'x = A + t'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '26', question_text: 'Khối tâm của hệ là gì?', options: ['Điểm mà toàn bộ khối lượng tập trung', 'Trung điểm hình học', 'Điểm cao nhất', 'Điểm thấp nhất'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '27', question_text: 'Mối liên hệ giữa lực và động lượng là gì?', options: ['F = dp/dt (p là động lượng)', 'F = m × v', 'F = a/m', 'F = v²/r'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '28', question_text: 'Công suất được định nghĩa là', options: ['Công thực hiện trong một đơn vị thời gian', 'Công nhân lực', 'Lực chia vận tốc', 'Khối lượng nhân gia tốc'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '29', question_text: 'Hai vật va chạm không đàn hồi có đặc điểm gì?', options: ['Sau va chạm chúng chuyển động cùng nhau', 'Động năng được bảo toàn hoàn toàn', 'Không mất năng lượng', 'Lực bằng không'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
  { id: '30', question_text: 'Moment quán tính phụ thuộc vào gì?', options: ['Khối lượng và khoảng cách từ trục quay', 'Chỉ khối lượng', 'Chỉ vận tốc góc', 'Lực tác dụng'], correct_index: 0, difficulty: 'hard', phase: 'Nâng cao' },
];

type Screen = 'locked' | 'start' | 'quiz' | 'result';
type FeedbackType = 'correct' | 'wrong' | null;

const Confetti = () => {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  useEffect(() => {
    const confettiCount = 200;
    const confettiElements: { el: HTMLDivElement; x: number; y: number; vx: number; vy: number; rotation: number; rotationSpeed: number }[] = [];

    for (let i = 0; i < confettiCount; i++) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '-10px';
      el.style.width = `${Math.random() * 10 + 5}px`;
      el.style.height = `${Math.random() * 10 + 5}px`;
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      el.style.zIndex = '9999';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);

      confettiElements.push({
        el,
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let frame: number;
    const animate = () => {
      confettiElements.forEach((c) => {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.1;
        c.rotation += c.rotationSpeed;

        c.el.style.left = `${c.x}px`;
        c.el.style.top = `${c.y}px`;
        c.el.style.transform = `rotate(${c.rotation}deg)`;

        if (c.y < window.innerHeight + 100) {
          frame = requestAnimationFrame(animate);
        }
      });
    };

    animate();

    const timeout = setTimeout(() => {
      confettiElements.forEach((c) => c.el.remove());
    }, 5000);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      confettiElements.forEach((c) => c.el.remove());
    };
  }, []);

  return null;
};

function AppWrapper() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>
      <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease-out' }}>
        <PhysIQApp />
      </div>
    </>
  );
}

function PhysIQApp() {
  const savedLicenseKey = typeof window !== 'undefined' ? localStorage.getItem('physiq_license_key') : null;
  const { status, error, isValid, isLoading, checkLicense, isInGracePeriod, gracePeriodRemainingMs, licenseInfo } = useLicense(savedLicenseKey);

  const [screen, setScreen] = useState<Screen>('locked');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>(LOCAL_QUESTIONS);
  const [customBackgrounds, setCustomBackgrounds] = useState<string[]>([]);
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  const [buttonColor, setButtonColor] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [textOpacity, setTextOpacity] = useState(40);
  const [buttonOpacity, setButtonOpacity] = useState(40);
  const [customSounds, setCustomSounds] = useState<{ correct?: string; finish?: string }>({});

  const soundHook = useSound(customSounds);
  const playCorrect = useCallback(() => {
    if (soundEnabled) soundHook.playCorrect();
  }, [soundEnabled, soundHook]);
  const playWrong = useCallback(() => {
    if (soundEnabled) soundHook.playWrong();
  }, [soundEnabled, soundHook]);

  const preloadBackgrounds = useCallback((urls: string[]) => {
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  const fetchQuestions = useCallback(async (quizSetId?: string) => {
    setQuestionsLoading(true);
    try {
      let url = '/api/quiz-questions?limit=30';
      if (quizSetId) {
        url += `&quiz_set_id=${quizSetId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setShuffledQuestions(data.questions);
        }
      }
    } catch {
      // fallback to local questions
    }
    setQuestionsLoading(false);
  }, []);

  useEffect(() => {
    if (isValid) {
      fetchQuestions(licenseInfo?.quizSetId);
    }
  }, [isValid, fetchQuestions, licenseInfo?.quizSetId]);

  useEffect(() => {
    if (status === 'valid' || status === 'grace_period') {
      setScreen('start');
    }
  }, [status]);

  useEffect(() => {
    if ((status === 'locked' || status === 'invalid') && (screen === 'quiz' || screen === 'start' || screen === 'result')) {
      setScreen('locked');
    }
  }, [status, screen]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      if (isValid) {
        setScreen('start');
      }
      setPasswordError(!isValid);
    } else {
      setPasswordError(true);
      setPassword('');
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const currentQData = shuffledQuestions[currentQuestion];
    if (!currentQData) return;
    const isCorrect = optionIndex === currentQData.correct_index;

    if (isCorrect) {
      playCorrect();
      setFeedback('correct');

      checkLicense();

      const newAnswers = [...answers, optionIndex];
      setAnswers(newAnswers);

      setTimeout(() => setFeedback(null), 800);

      setTimeout(() => {
        if (currentQuestion + 1 < shuffledQuestions.length) {
          setCurrentQuestion(currentQuestion + 1);
          if (customBackgrounds.length > 0) {
            setCurrentBackgroundIndex((currentBackgroundIndex + 1) % customBackgrounds.length);
          }
        } else {
          setScreen('result');
          soundHook.playFinish?.();
          setTimeout(() => setShowConfetti(true), 100);
          saveQuizAttempt(newAnswers);
        }
      }, 500);
    } else {
      playWrong();
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const saveQuizAttempt = async (finalAnswers: number[]) => {
    const score = finalAnswers.filter((ans, idx) => {
      const q = shuffledQuestions[idx];
      return q && ans === q.correct_index;
    }).length;

    const easyScore = finalAnswers.slice(0, 10).filter((ans, idx) => {
      const q = shuffledQuestions[idx];
      return q && ans === q.correct_index;
    }).length;

    const mediumScore = finalAnswers.slice(10, 20).filter((ans, idx) => {
      const q = shuffledQuestions[10 + idx];
      return q && ans === q.correct_index;
    }).length;

    const hardScore = finalAnswers.slice(20, 30).filter((ans, idx) => {
      const q = shuffledQuestions[20 + idx];
      return q && ans === q.correct_index;
    }).length;

    const timeTaken = Math.round((Date.now() - quizStartTime) / 1000);
    const rating = getPerformanceRating(score);

    try {
      await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          total_questions: shuffledQuestions.length,
          details: finalAnswers.map((ans, idx) => ({
            question_id: shuffledQuestions[idx]?.id,
            selected: ans,
            correct: shuffledQuestions[idx]?.correct_index,
          })),
          time_taken_seconds: timeTaken,
          difficulty_breakdown: { easy: easyScore, medium: mediumScore, hard: hardScore },
          rating,
        }),
      });
    } catch {
      // Silently fail - don't block user experience
    }
  };

  const startQuiz = () => {
    const shuffled = shuffledQuestions.map((q) => {
      const optionIndices = q.options.map((_, i) => i);
      const shuffledIndices = shuffleArray(optionIndices);
      const shuffledOptions = shuffledIndices.map((i) => q.options[i]);
      const newCorrectIndex = shuffledIndices.indexOf(q.correct_index);
      return { ...q, options: shuffledOptions, correct_index: newCorrectIndex };
    });
    setShuffledQuestions(shuffled);
    setCurrentQuestion(0);
    setAnswers([]);
    setQuizStartTime(Date.now());
    
    if (licenseInfo?.customConfig?.backgrounds && licenseInfo.customConfig.backgrounds.length > 0) {
      const shuffledBgs = [...licenseInfo.customConfig.backgrounds].sort(() => Math.random() - 0.5);
      setCustomBackgrounds(shuffledBgs);
      setCurrentBackgroundIndex(0);
      preloadBackgrounds(shuffledBgs);
    }
    
    if (licenseInfo?.customConfig?.button_color) {
      setButtonColor(licenseInfo.customConfig.button_color);
    }

    if (licenseInfo?.customConfig?.correct_sound || licenseInfo?.customConfig?.finish_sound) {
      setCustomSounds({
        correct: licenseInfo.customConfig.correct_sound,
        finish: licenseInfo.customConfig.finish_sound,
      });
    }
    
    setScreen('quiz');
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowConfetti(false);
    setScreen('start');
  };

  useEffect(() => {
    if (screen !== 'quiz') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= 4) {
        handleAnswer(keyNum - 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [screen, currentQuestion, feedback]);

  const getWrongAnswers = () => {
    return answers
      .map((answer, index) => ({ answer, index, question: shuffledQuestions[index] }))
      .filter((item) => item.question && item.answer !== item.question.correct_index);
  };

  const calculateScore = () => {
    let score = 0;
    answers.forEach((answer, index) => {
      const question = shuffledQuestions[index];
      if (question && answer === question.correct_index) {
        score++;
      }
    });
    return score;
  };

  const getPhaseScores = () => {
    const easyScore = answers.slice(0, 10).filter((ans, idx) => {
      const q = shuffledQuestions[idx];
      return q && ans === q.correct_index;
    }).length;
    const mediumScore = answers.slice(10, 20).filter((ans, idx) => {
      const q = shuffledQuestions[10 + idx];
      return q && ans === q.correct_index;
    }).length;
    const hardScore = answers.slice(20, 30).filter((ans, idx) => {
      const q = shuffledQuestions[20 + idx];
      return q && ans === q.correct_index;
    }).length;
    return { easyScore, mediumScore, hardScore };
  };

  const getPerformanceRating = (score: number) => {
    const percentage = (score / shuffledQuestions.length) * 100;
    if (percentage >= 90) return 'Xuất sắc!';
    if (percentage >= 75) return 'Tốt!';
    if (percentage >= 60) return 'Khá';
    if (percentage >= 45) return 'Trung bình';
    return 'Cần cố gắng';
  };

  const handleActivate = (key: string) => {
    localStorage.setItem('physiq_license_key', key);
    window.location.reload();
  };

  if (isLoading || questionsLoading) {
    const isRevoked = error?.code === 'LICENSE_REVOKED';
    
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          {!isRevoked ? (
            <>
              <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-sm mb-4">Đang xác thực license...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-red-500/80 text-sm mb-2 font-semibold">License đã bị khóa!</p>
              <p className="text-muted-foreground/60 text-xs mb-4">{error?.message}</p>
            </>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('physiq_license_key');
              localStorage.removeItem('physiq_license_info');
              localStorage.removeItem('physiq_grace_end');
              localStorage.removeItem('physiq_grace_key');
              localStorage.removeItem('physiq_instance_id');
              window.location.reload();
            }}
            className="text-xs text-muted-foreground/50 hover:text-red-500 transition-colors underline"
          >
            Xóa License &amp; Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!isValid && (status === 'locked' || status === 'invalid')) {
    return (
      <LockScreen
        errorCode={error?.code || 'NO_LICENSE'}
        errorMessage={error?.message || 'Vui lòng nhập license key để tiếp tục.'}
        revokedAt={error?.revokedAt}
        revokedReason={error?.revokedReason}
        onRetry={checkLicense}
        onActivate={handleActivate}
        isLoading={isLoading}
      />
    );
  }

  if (screen === 'locked') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">PhysIQ</h1>
            {isInGracePeriod && (
              <p className="text-yellow-500 text-sm mt-1">Grace Period - Kiểm tra license...</p>
            )}
            <p className="text-muted-foreground">Nhập mật khẩu để tiếp tục</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Nhập mật khẩu..."
                className={`w-full p-4 pr-12 text-center border-2 rounded-lg bg-secondary/30 text-lg ${
                  passwordError ? 'border-red-500' : 'border-border'
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {passwordError && (
              <p className="text-red-500 text-center text-sm">
                {isValid ? 'Mật khẩu không đúng!' : 'License không hợp lệ. Vui lòng kích hoạt license.'}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-4 px-6 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity duration-200"
            >
              Xác nhận
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (screen === 'start') {
    const startBgImage = customBackgrounds.length > 0 ? customBackgrounds[0] : '';
    
    return (
      <div 
        className="min-h-screen text-foreground flex items-center justify-center p-4"
        style={startBgImage ? { 
          backgroundImage: `url(${startBgImage})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      >
        <div className="w-full max-w-lg">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm mb-4">
              <h1 className="text-4xl font-bold text-white mb-2">PhysIQ</h1>
            </div>
            <p className="text-lg text-white/90 bg-black/40 px-3 py-1 rounded inline-block">Kiểm tra kiến thức Vật lý của bạn</p>
            <p className="text-muted-foreground text-lg">Kiểm tra kiến thức Vật lý của bạn</p>
            {isInGracePeriod && (
              <p className="text-yellow-500/60 text-xs mt-2">Grace Period đang hoạt động</p>
            )}
          </div>

          <div className="space-y-6 mb-12">
            <div className="flex items-center gap-3 p-5 bg-secondary/50 border border-border rounded-lg hover:bg-secondary/70 transition-colors duration-200">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div>
                <p className="font-semibold">Cơ bản</p>
                <p className="text-sm text-muted-foreground">10 câu hỏi về các khái niệm cơ bản</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5 bg-secondary/50 border border-border rounded-lg hover:bg-secondary/70 transition-colors duration-200">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div>
                <p className="font-semibold">Trung bình</p>
                <p className="text-sm text-muted-foreground">10 câu hỏi về ứng dụng thực tế</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5 bg-secondary/50 border border-border rounded-lg hover:bg-secondary/70 transition-colors duration-200">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div>
                <p className="font-semibold">Nâng cao</p>
                <p className="text-sm text-muted-foreground">10 câu hỏi về khái niệm nâng cao</p>
              </div>
            </div>
          </div>

            <button
            onClick={startQuiz}
            className="w-full py-4 px-6 font-semibold rounded-lg hover:opacity-90 transition-opacity duration-200"
            style={buttonColor ? { backgroundColor: buttonColor, color: '#fff' } : {}}
          >
            Bắt đầu Quiz
          </button>
          <p className="text-center text-xs text-muted-foreground/40 mt-6">v48</p>
        </div>
      </div>
    );
  }

  if (screen === 'quiz' && currentQuestion < shuffledQuestions.length) {
    const question = shuffledQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / shuffledQuestions.length) * 100;

    const getPhaseColor = (phase: string | null) => {
      if (phase === 'Cơ bản' || question.difficulty === 'easy') return 'bg-green-500';
      if (phase === 'Trung bình' || question.difficulty === 'medium') return 'bg-yellow-500';
      return 'bg-red-500';
    };

    const displayPhase = question.phase || (question.difficulty === 'easy' ? 'Cơ bản' : question.difficulty === 'medium' ? 'Trung bình' : 'Nâng cao');

    const bgImage = customBackgrounds.length > 0 ? customBackgrounds[currentBackgroundIndex] : '';
    const textBgOpacity = textOpacity / 100;
    const buttonBgOpacity = buttonOpacity / 100;
    
    return (
      <div 
        className="min-h-screen text-foreground flex items-center justify-center p-4"
        style={bgImage ? { 
          backgroundImage: `url(${bgImage})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      >
        <div className="w-full max-w-lg">
          <div className="mb-6 flex items-center justify-between">
            <div className={`px-4 py-2 rounded-full text-white text-sm font-semibold ${getPhaseColor(displayPhase)}`}>
              {displayPhase}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'}`}
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('physiq_license_key');
                  localStorage.removeItem('physiq_license_info');
                  localStorage.removeItem('physiq_grace_end');
                  localStorage.removeItem('physiq_grace_key');
                  localStorage.removeItem('physiq_revoked_info');
                  localStorage.removeItem('physiq_instance_id');
                  window.location.reload();
                }}
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-red-500"
                title="Đăng xuất"
              >
                <LogOut size={20} />
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="mb-4 p-4 bg-secondary/80 border border-border rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Độ mờ nền text: {textOpacity}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={textOpacity}
                    onChange={(e) => setTextOpacity(Number(e.target.value))}
                    className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Độ mờ nền button: {buttonOpacity}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={buttonOpacity}
                    onChange={(e) => setButtonOpacity(Number(e.target.value))}
                    className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

            <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white/90 bg-black/40 px-2 py-1 rounded">Câu {currentQuestion + 1} / {shuffledQuestions.length}</span>
              <span className="text-sm text-white/90 bg-black/40 px-2 py-1 rounded">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: buttonColor || 'var(--foreground)' }}
              />
            </div>
          </div>

          <div className="mb-8">
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: `rgba(0, 0, 0, ${textBgOpacity})` }}
            >
              <h2 className="text-2xl font-bold leading-tight text-white">{question.question_text}</h2>
            </div>
            {question.image_url && (
              <div className="mt-4 flex justify-center">
                <img src={question.image_url} alt="Hình ảnh" className="max-w-full h-auto rounded-lg border border-border" />
              </div>
            )}
          </div>

          <div className="space-y-3 mb-8">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className="w-full p-5 text-left border border-border hover:bg-secondary/60 rounded-lg transition-colors duration-200 font-medium flex items-center gap-4"
                style={buttonColor ? { 
                  borderColor: buttonColor, 
                  backgroundColor: `rgba(30, 30, 30, ${buttonBgOpacity})`,
                } : {
                  backgroundColor: `rgba(30, 30, 30, ${buttonBgOpacity})`,
                }}
              >
                <kbd 
                  className="flex items-center justify-center w-8 h-8 rounded font-mono text-sm"
                  style={{ 
                    backgroundColor: buttonColor ? `${buttonColor}` : undefined,
                    borderColor: buttonColor || undefined,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  <Keyboard size={14} className="mr-1" />
                  {index + 1}
                </kbd>
                <span>{option}</span>
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div className={`fixed top-1/3 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg z-50 flex items-center gap-2 ${
            feedback === 'correct' ? 'bg-green-500' : 'bg-orange-500'
          }`}>
            {feedback === 'correct' ? (
              <><span>✓</span> Chính xác!</>
            ) : (
              <><span>↻</span> Thử lại câu khác!</>
            )}
          </div>
        )}
      </div>
    );
  }

  if (screen === 'result') {
    const score = calculateScore();
    const { easyScore, mediumScore, hardScore } = getPhaseScores();
    const rating = getPerformanceRating(score);
    const wrongAnswers = getWrongAnswers();
    const resultBgImage = customBackgrounds.length > 0 ? customBackgrounds[customBackgrounds.length - 1] : '';

    return (
      <div 
        className="min-h-screen text-foreground flex items-center justify-center p-4 relative"
        style={resultBgImage ? { 
          backgroundImage: `url(${resultBgImage})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      >
        {showConfetti && <Confetti />}
        <div className="w-full max-w-lg relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-2">{score}/{shuffledQuestions.length}</h1>
            <p className="text-2xl font-semibold text-foreground mb-2">{rating}</p>
            <p className="text-muted-foreground">
              {Math.round((score / shuffledQuestions.length) * 100)}% câu trả lời đúng
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="p-5 bg-secondary/50 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Cơ bản</span>
                <span>{easyScore}/10</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(easyScore / 10) * 100}%` }}
                />
              </div>
            </div>
            <div className="p-5 bg-secondary/50 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Trung bình</span>
                <span>{mediumScore}/10</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${(mediumScore / 10) * 100}%` }}
                />
              </div>
            </div>
            <div className="p-5 bg-secondary/50 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Nâng cao</span>
                <span>{hardScore}/10</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${(hardScore / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {wrongAnswers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-red-500">✗</span> Câu trả lời sai ({wrongAnswers.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {wrongAnswers.map((item) => (
                  <div key={item.index} className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="font-medium mb-2">{item.question.question_text}</p>
                    {item.question.image_url && (
                      <img src={item.question.image_url} alt="Hình ảnh" className="max-w-full h-auto rounded-lg border border-border mb-2" />
                    )}
                    <div className="text-sm space-y-1">
                      <p className="text-red-400">
                        ✗ Đã chọn: {item.question.options[item.answer]}
                      </p>
                      <p className="text-green-400">
                        ✓ Đáp án đúng: {item.question.options[item.question.correct_index]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={restartQuiz}
            className="w-full py-4 px-6 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity duration-200"
          >
            Làm lại Quiz
          </button>

          <p className="text-center text-xs text-muted-foreground/40 mt-6">v48</p>
        </div>
      </div>
    );
  }

  return null;
}

export default AppWrapper;
