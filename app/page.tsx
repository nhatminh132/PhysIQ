'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSound } from '@/hooks/useSound';
import { Eye, EyeOff, Volume2, VolumeX, Keyboard } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import LoadingScreen from '@/components/LoadingScreen';

const PASSWORD = 'ToiYeuHoaCuteo';

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Vietnamese Physics Questions - 30 total (10 easy, 10 medium, 10 hard)
const QUESTIONS = [
  // Easy Questions (1-10)
  {
    id: 1,
    question: 'Vận tốc là gì?',
    options: [
      'Quãng đường đi được trong một đơn vị thời gian',
      'Gia tốc trên thời gian',
      'Lực tác động lên vật',
      'Năng lượng của vật'
    ],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 2,
    question: 'Định luật Newton thứ nhất nói gì?',
    options: [
      'Vật sẽ giữ nguyên trạng thái nếu không có lực tác dụng',
      'Lực bằng khối lượng nhân gia tốc',
      'Lực tác dụng bằng lực phản lực',
      'Vật luôn chuyển động'
    ],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 3,
    question: 'Đơn vị của lực là gì?',
    options: ['Newton', 'Joule', 'Watt', 'Pascal'],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 4,
    question: 'Năng lượng động học phụ thuộc vào gì?',
    options: [
      'Khối lượng và vận tốc',
      'Chỉ khối lượng',
      'Chỉ vận tốc',
      'Gia tốc'
    ],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 5,
    question: 'Trọng lực tác dụng lên vật có phương như thế nào?',
    options: [
      'Hướng xuống dưới (về tâm Trái Đất)',
      'Hướng lên trên',
      'Ngang theo chiều chuyển động',
      'Theo phương ngang'
    ],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 6,
    question: 'Gia tốc rơi tự do trên Trái Đất bằng bao nhiêu?',
    options: ['10 m/s²', '20 m/s²', '5 m/s²', '15 m/s²'],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 7,
    question: 'Công cơ học được tính theo công thức nào?',
    options: [
      'W = F × s × cos(θ)',
      'W = m × v',
      'W = a × t',
      'W = F / t'
    ],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 8,
    question: 'Chuyển động thẳng đều có đặc điểm nào?',
    options: [
      'Vận tốc không đổi',
      'Gia tốc không đổi',
      'Lực tác dụng lên vật lớn',
      'Vật có gia tốc dương'
    ],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 9,
    question: 'Áp suất được định nghĩa là gì?',
    options: [
      'Lực trên một đơn vị diện tích',
      'Lực nhân diện tích',
      'Lực chia thời gian',
      'Khối lượng trên diện tích'
    ],
    correct: 0,
    phase: 'Cơ bản'
  },
  {
    id: 10,
    question: 'Động lượng là gì?',
    options: [
      'Tích của khối lượng và vận tốc',
      'Chia khối lượng cho vận tốc',
      'Lực chia thời gian',
      'Gia tốc nhân khối lượng'
    ],
    correct: 0,
    phase: 'Cơ bản'
  },
  // Medium Questions (11-20)
  {
    id: 11,
    question: 'Công thức tính thế năng trọng trường là gì?',
    options: [
      'Ep = mgh',
      'Ep = ½mv²',
      'Ep = F × d',
      'Ep = v²/g'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 12,
    question: 'Định luật bảo toàn năng lượng cơ học nói rằng',
    options: [
      'Tổng năng lượng động học và thế năng không đổi',
      'Năng lượng luôn tăng',
      'Năng lượng luôn giảm',
      'Không có sự bảo toàn năng lượng'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 13,
    question: 'Momen lực được tính như thế nào?',
    options: [
      'M = F × d (d là cánh tay đòn)',
      'M = F / d',
      'M = F × v',
      'M = F + d'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 14,
    question: 'Chuyển động tròn đều có tốc độ như thế nào?',
    options: [
      'Tốc độ không đổi nhưng vận tốc thay đổi',
      'Cả tốc độ và vận tốc không đổi',
      'Tốc độ thay đổi',
      'Vật không có gia tốc'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 15,
    question: 'Gia tốc hướng tâm trong chuyển động tròn đều bằng',
    options: [
      'a = v²/r',
      'a = v × r',
      'a = v/r',
      'a = r/v'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 16,
    question: 'Công tố của lò xo được tính bằng',
    options: [
      'Ep = ½kx²',
      'Ep = kx',
      'Ep = k/x²',
      'Ep = x²/k'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 17,
    question: 'Sóng cơ học là gì?',
    options: [
      'Sự lan truyền dao động trong môi trường',
      'Chuyển động của các hạt vật chất',
      'Một loại năng lượng điện',
      'Ánh sáng di chuyển'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 18,
    question: 'Tần số sóng và bước sóng có mối liên hệ gì?',
    options: [
      'v = λ × f (v là vận tốc sóng)',
      'v = λ / f',
      'v = f / λ',
      'f = λ + v'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 19,
    question: 'Định luật Hooke nói rằng',
    options: [
      'Lực đàn hồi tỉ lệ với độ biến dạng',
      'Lực tỉ lệ với vận tốc',
      'Lực tỉ lệ với khối lượng',
      'Lực không phụ thuộc vào gì'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  {
    id: 20,
    question: 'Hiệu suất cơ học được định nghĩa là',
    options: [
      'Tỉ số giữa công có ích và công toàn phần',
      'Công toàn phần chia công có ích',
      'Tổng của tất cả các công',
      'Lực chia vận tốc'
    ],
    correct: 0,
    phase: 'Trung bình'
  },
  // Hard Questions (21-30)
  {
    id: 21,
    question: 'Trong chuyển động của hành tinh, điều nào là đúng?',
    options: [
      'Quỹ đạo elip, tốc độ không đều theo quỹ đạo',
      'Quỹ đạo tròn, tốc độ đều',
      'Quỹ đạo parabol',
      'Tốc độ luôn tăng'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 22,
    question: 'Định luật bảo toàn động lượng áp dụng khi nào?',
    options: [
      'Không có lực ngoài tác dụng hoặc lực ngoài cân bằng',
      'Lực ngoài luôn tác dụng',
      'Khi vật đứng yên',
      'Khi gia tốc bằng không'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 23,
    question: 'Hiệu ứng Doppler xảy ra khi nào?',
    options: [
      'Nguồn sóng và quan sát viên chuyển động tương đối',
      'Sóng di chuyển thẳng',
      'Không có chuyển động',
      'Sóng ngừng lan truyền'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 24,
    question: 'Cơ năng của hệ bảo toàn khi nào?',
    options: [
      'Chỉ lực bảo toàn (như trọng lực) tác dụng',
      'Có ma sát',
      'Vật chuyển động nhanh',
      'Vật chuyển động chậm'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 25,
    question: 'Phương trình dao động điều hòa là gì?',
    options: [
      'x = A × cos(ωt + φ)',
      'x = A × sin(t)',
      'x = t²',
      'x = A + t'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 26,
    question: 'Khối tâm của hệ là gì?',
    options: [
      'Điểm mà toàn bộ khối lượng tập trung',
      'Trung điểm hình học',
      'Điểm cao nhất',
      'Điểm thấp nhất'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 27,
    question: 'Mối liên hệ giữa lực và động lượng là gì?',
    options: [
      'F = dp/dt (p là động lượng)',
      'F = m × v',
      'F = a/m',
      'F = v²/r'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 28,
    question: 'Công suất được định nghĩa là',
    options: [
      'Công thực hiện trong một đơn vị thời gian',
      'Công nhân lực',
      'Lực chia vận tốc',
      'Khối lượng nhân gia tốc'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 29,
    question: 'Hai vật va chạm không đàn hồi có đặc điểm gì?',
    options: [
      'Sau va chạm chúng chuyển động cùng nhau',
      'Động năng được bảo toàn hoàn toàn',
      'Không mất năng lượng',
      'Lực bằng không'
    ],
    correct: 0,
    phase: 'Nâng cao'
  },
  {
    id: 30,
    question: 'Moment quán tính phụ thuộc vào gì?',
    options: [
      'Khối lượng và khoảng cách từ trục quay',
      'Chỉ khối lượng',
      'Chỉ vận tốc góc',
      'Lực tác dụng'
    ],
    correct: 0,
    phase: 'Nâng cao'
  }
];

type Screen = 'locked' | 'start' | 'quiz' | 'result';
type FeedbackType = 'correct' | 'wrong' | null;

const Confetti = () => {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  
  useEffect(() => {
    const confettiCount = 150;
    const confettiElements: { el: HTMLDivElement; x: number; y: number; vx: number; vy: number; color: string; rotation: number; rotationSpeed: number; size: number }[] = [];
    
    for (let i = 0; i < confettiCount; i++) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '-10px';
      el.style.width = `${Math.random() * 10 + 5}px`;
      el.style.height = `${Math.random() * 10 + 5}px`;
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      el.style.zIndex = '100';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
      
      confettiElements.push({
        el,
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        size: Math.random() * 10 + 5
      });
    }
    
    let frame: number;
    const animate = () => {
      confettiElements.forEach(c => {
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
      confettiElements.forEach(c => c.el.remove());
    }, 5000);
    
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      confettiElements.forEach(c => c.el.remove());
    };
  }, []);
  
  return null;
};

function AppWrapper() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoadingScreen onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>
      <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease-out' }}>
        <PhysIQApp />
      </div>
    </>
  );
}

function PhysIQApp() {
  const [screen, setScreen] = useState<Screen>('locked');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<typeof QUESTIONS>(QUESTIONS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundHook = useSound();
  const playCorrect = useCallback(() => {
    if (soundEnabled) soundHook.playCorrect();
  }, [soundEnabled, soundHook]);
  const playWrong = useCallback(() => {
    if (soundEnabled) soundHook.playWrong();
  }, [soundEnabled, soundHook]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      setScreen('start');
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPassword('');
    }
  };

  // Handle answer selection
  const handleAnswer = (optionIndex: number) => {
    const currentQData = shuffledQuestions[currentQuestion];
    if (!currentQData) return;
    const isCorrect = optionIndex === currentQData.correct;
    
    if (isCorrect) {
      playCorrect();
      setFeedback('correct');
      
      const newAnswers = [...answers, optionIndex];
      setAnswers(newAnswers);

      setTimeout(() => setFeedback(null), 800);

      setTimeout(() => {
        if (currentQuestion + 1 < QUESTIONS.length) {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          setScreen('result');
          setShowConfetti(true);
        }
      }, 500);
    } else {
      playWrong();
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  // Start quiz
  const startQuiz = () => {
    const shuffled = QUESTIONS.map(q => {
      const optionIndices = q.options.map((_, i) => i);
      const shuffledIndices = shuffleArray(optionIndices);
      const shuffledOptions = shuffledIndices.map(i => q.options[i]);
      const newCorrectIndex = shuffledIndices.indexOf(q.correct);
      return { ...q, options: shuffledOptions, correct: newCorrectIndex };
    });
    setShuffledQuestions(shuffled);
    setCurrentQuestion(0);
    setAnswers([]);
    setScreen('quiz');
  };

  // Restart quiz
  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setScreen('start');
  };

  // Keyboard shortcuts 1-4
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

  // Get wrong answers
  const getWrongAnswers = () => {
    return answers
      .map((answer, index) => ({ answer, index, question: shuffledQuestions[index] }))
      .filter(item => item.question && item.answer !== item.question.correct);
  };

  // Calculate score
  const calculateScore = () => {
    let score = 0;
    answers.forEach((answer, index) => {
      const question = shuffledQuestions[index];
      if (question && answer === question.correct) {
        score++;
      }
    });
    return score;
  };

  // Calculate phase scores
  const getPhaseScores = () => {
    const easyScore = answers.slice(0, 10).filter((ans, idx) => {
      const q = shuffledQuestions[idx];
      return q && ans === q.correct;
    }).length;
    const mediumScore = answers.slice(10, 20).filter((ans, idx) => {
      const q = shuffledQuestions[10 + idx];
      return q && ans === q.correct;
    }).length;
    const hardScore = answers.slice(20, 30).filter((ans, idx) => {
      const q = shuffledQuestions[20 + idx];
      return q && ans === q.correct;
    }).length;
    return { easyScore, mediumScore, hardScore };
  };

  // Get performance rating
  const getPerformanceRating = (score: number) => {
    const percentage = (score / QUESTIONS.length) * 100;
    if (percentage >= 90) return 'Xuất sắc!';
    if (percentage >= 75) return 'Tốt!';
    if (percentage >= 60) return 'Khá';
    if (percentage >= 45) return 'Trung bình';
    return 'Cần cố gắng';
  };

  // Lock Screen
  if (screen === 'locked') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">PhysIQ</h1>
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
              <p className="text-red-500 text-center text-sm">Mật khẩu không đúng!</p>
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

  // Start Screen
  if (screen === 'start') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">PhysIQ</h1>
            <p className="text-muted-foreground text-lg">Kiểm tra kiến thức Vật lý của bạn</p>
          </div>

          {/* Phase Pills */}
          <div className="space-y-6 mb-12">
            <div className="flex items-center gap-3 p-5 bg-secondary/50 border border-border rounded-lg hover:bg-secondary/70 transition-colors duration-200">
              <div className="w-2 h-2 rounded-full bg-foreground"></div>
              <div>
                <p className="font-semibold">Cơ bản</p>
                <p className="text-sm text-muted-foreground">10 câu hỏi về các khái niệm cơ bản</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5 bg-secondary/50 border border-border rounded-lg hover:bg-secondary/70 transition-colors duration-200">
              <div className="w-2 h-2 rounded-full bg-foreground"></div>
              <div>
                <p className="font-semibold">Trung bình</p>
                <p className="text-sm text-muted-foreground">10 câu hỏi về ứng dụng thực tế</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5 bg-secondary/50 border border-border rounded-lg hover:bg-secondary/70 transition-colors duration-200">
              <div className="w-2 h-2 rounded-full bg-foreground"></div>
              <div>
                <p className="font-semibold">Nâng cao</p>
                <p className="text-sm text-muted-foreground">10 câu hỏi về khái niệm nâng cao</p>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startQuiz}
            className="w-full py-4 px-6 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity duration-200"
          >
            Bắt đầu Quiz
          </button>
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (screen === 'quiz' && currentQuestion < shuffledQuestions.length) {
    const question = shuffledQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / shuffledQuestions.length) * 100;

    const getPhaseColor = (phase: string) => {
      if (phase === 'Cơ bản') return 'bg-green-500';
      if (phase === 'Trung bình') return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header with Sound Toggle */}
          <div className="mb-6 flex items-center justify-between">
            <div className={`px-4 py-2 rounded-full text-white text-sm font-semibold ${getPhaseColor(question.phase)}`}>
              {question.phase}
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Câu {currentQuestion + 1} / {shuffledQuestions.length}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold leading-tight">{question.question}</h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3 mb-8">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className="w-full p-5 text-left border border-border bg-secondary/30 hover:bg-secondary/60 rounded-lg transition-colors duration-200 font-medium flex items-center gap-4"
              >
                <kbd className="flex items-center justify-center w-8 h-8 rounded bg-foreground/10 border border-border font-mono text-sm">
                  <Keyboard size={14} className="mr-1" />
                  {index + 1}
                </kbd>
                <span>{option}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Notification */}
        {feedback && (
          <div className={`fixed top-1/3 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg z-50 flex items-center gap-2 ${
            feedback === 'correct' ? 'bg-green-500' : 'bg-orange-500'
          }`}>
            {feedback === 'correct' ? (
              <>
                <span>✓</span> Chính xác!
              </>
            ) : (
              <>
                <span>↻</span> Thử lại câu khác!
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Result Screen
  if (screen === 'result') {
    const score = calculateScore();
    const { easyScore, mediumScore, hardScore } = getPhaseScores();
    const rating = getPerformanceRating(score);
    const wrongAnswers = getWrongAnswers();

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        {showConfetti && <Confetti />}
        <div className="w-full max-w-lg">
          {/* Score Display */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-2">{score}/{QUESTIONS.length}</h1>
            <p className="text-2xl font-semibold text-foreground mb-2">{rating}</p>
            <p className="text-muted-foreground">
              {Math.round((score / QUESTIONS.length) * 100)}% câu trả lời đúng
            </p>
          </div>

          {/* Phase Breakdown */}
          <div className="space-y-4 mb-8">
            <div className="p-5 bg-secondary/50 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Cơ bản</span>
                <span>{easyScore}/10</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-300"
                  style={{ width: `${(easyScore / 10) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="p-5 bg-secondary/50 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Trung bình</span>
                <span>{mediumScore}/10</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-300"
                  style={{ width: `${(mediumScore / 10) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="p-5 bg-secondary/50 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Nâng cao</span>
                <span>{hardScore}/10</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-300"
                  style={{ width: `${(hardScore / 10) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Wrong Answers Review */}
          {wrongAnswers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-red-500">✗</span> Câu trả lời sai ({wrongAnswers.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {wrongAnswers.map((item) => (
                  <div key={item.index} className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="font-medium mb-2">{item.question.question}</p>
                    <div className="text-sm space-y-1">
                      <p className="text-red-400">
                        ✗ Đã chọn: {item.question.options[item.answer]}
                      </p>
                      <p className="text-green-400">
                        ✓ Đáp án đúng: {item.question.options[item.question.correct]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restart Button */}
          <button
            onClick={restartQuiz}
            className="w-full py-4 px-6 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity duration-200"
          >
            Làm lại Quiz
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default AppWrapper;
