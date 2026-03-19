'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Key, HelpCircle, Plus, Trash2, Ban, RotateCcw,
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  Copy, BarChart3, RefreshCw, Eye, EyeOff, Upload, X
} from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface License {
  id: string;
  license_key: string;
  owner_name: string | null;
  owner_email: string | null;
  status: 'active' | 'revoked' | 'expired' | 'pending';
  max_activations: number;
  activation_count: number;
  expires_at: string | null;
  last_checkin: string | null;
  created_at: string;
  revoked_reason: string | null;
  quiz_set_id: string | null;
  quiz_set_name?: string | null;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  phase: string | null;
  is_active: boolean;
  quiz_set_id: string | null;
}

interface QuizSet {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  grade: string | null;
  question_count: number;
  is_active: boolean;
  created_at: string;
}

type Tab = 'licenses' | 'questions' | 'quizsets' | 'analytics';

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('licenses');
  const [isAuth, setIsAuth] = useState(false);
  const [authErr, setAuthErr] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [filterQuizSet, setFilterQuizSet] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandId, setExpandId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  const [revokeReason, setRevokeReason] = useState('');
  const [newQ, setNewQ] = useState({ question_text: '', options: ['', '', '', ''], correct_index: 0, difficulty: 'easy' as 'easy' | 'medium' | 'hard', phase: '', quiz_set_id: '' });
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [newL, setNewL] = useState({ owner_name: '', max_activations: 1, quiz_set_id: '' });
  const [newQS, setNewQS] = useState({ name: '', description: '', subject: '', grade: '' });
  const [editQS, setEditQS] = useState<QuizSet | null>(null);
  const [assignQS, setAssignQS] = useState<{ licenseId: string; quizSetId: string } | null>(null);

  const fetchLicenses = useCallback(async (token: string) => {
    const res = await fetch('/api/license/admin', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setLicenses((await res.json()).licenses || []);
  }, []);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/questions?include_inactive=true');
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      } else {
        console.error('Failed to fetch questions:', res.status);
      }
    } catch (err) {
      console.error('Fetch questions error:', err);
    }
  }, []);

  const fetchQuizSets = useCallback(async () => {
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const res = await fetch('/api/quiz-sets', { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setQuizSets((await res.json()).quiz_sets || []);
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (t) { fetchLicenses(t); fetchQuestions(); fetchQuizSets(); }
  }, [isAuth, fetchLicenses, fetchQuestions, fetchQuizSets]);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
    fetch('/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: input.value }) })
      .then(async (r) => {
        if (r.ok) { sessionStorage.setItem('physiq_admin_pass', input.value); setIsAuth(true); }
        else { setAuthErr(true); input.value = ''; }
      });
  };

  const revoke = async (id: string) => {
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const r = await fetch('/api/license/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ id, action: 'revoke', revoked_reason: revokeReason }) });
    if (r.ok) { addToast('success', 'Đã khóa!'); fetchLicenses(t); setRevokeTarget(null); setRevokeReason(''); }
    else addToast('error', 'Lỗi!');
  };

  const restore = async (id: string) => {
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const r = await fetch('/api/license/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ id, action: 'restore' }) });
    if (r.ok) { addToast('success', 'Đã khôi phục!'); fetchLicenses(t); }
    else addToast('error', 'Lỗi!');
  };

  const createLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const fd = new FormData(e.target as HTMLFormElement);
    const r = await fetch('/api/license/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ owner_name: fd.get('owner_name') || undefined, max_activations: parseInt(fd.get('max_activations') as string, 10) || 1, quiz_set_id: fd.get('quiz_set_id') || undefined }) });
    if (r.ok) { addToast('success', `Tạo thành công!`); fetchLicenses(t); setNewL({ owner_name: '', max_activations: 1, quiz_set_id: '' }); }
    else addToast('error', 'Lỗi!');
  };

  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    
    if (!newQ.question_text.trim()) {
      addToast('error', 'Cần nhập câu hỏi!');
      return;
    }
    
    const body = {
      ...newQ,
      question_text: newQ.question_text.trim(),
      options: newQ.options.map(opt => opt.trim()).filter(opt => opt)
    };
    
    if (body.options.length !== 4) {
      addToast('error', 'Cần điền đủ 4 đáp án!');
      return;
    }
    
    try {
      const r = await fetch('/api/questions', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, 
        body: JSON.stringify(body) 
      });
      
      if (r.ok) { 
        addToast('success', 'Thêm câu hỏi thành công!'); 
        await fetchQuestions(); 
        setNewQ({ question_text: '', options: ['', '', '', ''], correct_index: 0, difficulty: 'easy', phase: '', quiz_set_id: '' }); 
      } else {
        const err = await r.json().catch(() => ({ error: 'Unknown error' }));
        addToast('error', `Lỗi: ${err.error || 'Không thể tạo câu hỏi'}`);
      }
    } catch (err) {
      console.error('Create question error:', err);
      addToast('error', 'Lỗi kết nối!');
    }
  };

  const updateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const r = await fetch('/api/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(editQ) });
    if (r.ok) { addToast('success', 'Cập nhật!'); fetchQuestions(); setEditQ(null); }
    else addToast('error', 'Lỗi!');
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Xóa?')) return;
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const r = await fetch(`/api/questions?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) { addToast('success', 'Xóa!'); fetchQuestions(); }
    else addToast('error', 'Lỗi!');
  };

  const createQuizSet = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const r = await fetch('/api/quiz-sets', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(newQS) });
    if (r.ok) { addToast('success', 'Tạo Quiz Set!'); fetchQuizSets(); setNewQS({ name: '', description: '', subject: '', grade: '' }); }
    else addToast('error', 'Lỗi!');
  };

  const updateQuizSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQS) return;
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const r = await fetch('/api/quiz-sets', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(editQS) });
    if (r.ok) { addToast('success', 'Cập nhật!'); fetchQuizSets(); setEditQS(null); }
    else addToast('error', 'Lỗi!');
  };

  const deleteQuizSet = async (id: string) => {
    if (!confirm('Xóa Quiz Set?')) return;
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const r = await fetch(`/api/quiz-sets?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) { addToast('success', 'Xóa!'); fetchQuizSets(); }
    else addToast('error', 'Lỗi!');
  };

  const assignQuizSetToLicense = async (licenseId: string, quizSetId: string) => {
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    const r = await fetch('/api/quiz-sets/assign', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ license_id: licenseId, quiz_set_id: quizSetId || null }) });
    if (r.ok) { addToast('success', 'Gán Quiz Set!'); fetchLicenses(t); setAssignQS(null); }
    else addToast('error', 'Lỗi!');
  };

  const importQuestionsFromJSON = async (questionsData: Array<{
    question_text: string;
    options: string[];
    correct_index: number;
    difficulty: string;
    phase?: string;
    quiz_set_id?: string;
  }>) => {
    const t = sessionStorage.getItem('physiq_admin_pass');
    if (!t) return;
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const q of questionsData) {
      const r = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(q)
      });
      if (r.ok) successCount++;
      else errorCount++;
    }
    
    if (successCount > 0) {
      addToast('success', `Đã thêm ${successCount} câu hỏi!${errorCount > 0 ? ` (${errorCount} lỗi)` : ''}`);
      fetchQuestions();
    } else {
      addToast('error', 'Lỗi khi import!');
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      addToast('error', 'Chỉ chấp nhận file JSON!');
      return;
    }
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (Array.isArray(data)) {
        importQuestionsFromJSON(data);
      } else if (data.questions && Array.isArray(data.questions)) {
        importQuestionsFromJSON(data.questions);
      } else {
        addToast('error', 'Format JSON không hợp lệ!');
      }
    } catch {
      addToast('error', 'Không thể đọc file!');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (Array.isArray(data)) {
        importQuestionsFromJSON(data);
      } else if (data.questions && Array.isArray(data.questions)) {
        importQuestionsFromJSON(data.questions);
      } else {
        addToast('error', 'Format JSON không hợp lệ!');
      }
    } catch {
      addToast('error', 'Không thể đọc file!');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-foreground/10 rounded-2xl flex items-center justify-center"><Shield size={32} /></div>
            <h1 className="text-2xl font-bold">PhysIQ Admin</h1>
          </div>
          <form onSubmit={login} className="space-y-4">
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} placeholder="Password"
                className={`w-full p-3 border-2 rounded-lg bg-secondary/30 ${authErr ? 'border-red-500' : 'border-border'}`}
                onChange={() => setAuthErr(false)} autoFocus />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {authErr && <p className="text-red-500 text-sm text-center">Sai mật khẩu</p>}
            <button type="submit" className="w-full py-3 bg-foreground text-background font-semibold rounded-lg">Đăng nhập</button>
          </form>
        </div>
      </div>
    );
  }

  const active = licenses.filter((l) => l.status === 'active').length;
  const revoked = licenses.filter((l) => l.status === 'revoked').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-foreground/10 rounded-xl flex items-center justify-center"><Shield size={24} /></div>
            <div><h1 className="text-2xl font-bold">PhysIQ Admin</h1><p className="text-sm text-muted-foreground">Quản lý</p></div>
          </div>
          <button onClick={() => setIsAuth(false)} className="text-sm text-muted-foreground hover:text-foreground">Đăng xuất</button>
        </div>

        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
                toast.type === 'success' ? 'bg-green-500 text-white' :
                toast.type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
              }`}
            >
              {toast.type === 'success' && <CheckCircle size={18} />}
              {toast.type === 'error' && <XCircle size={18} />}
              {toast.type === 'info' && <Shield size={18} />}
              <span className="flex-1">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="hover:opacity-70">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-8 bg-secondary/30 p-1 rounded-lg w-fit">
          {(['licenses', 'questions', 'quizsets', 'analytics'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t ? 'bg-foreground text-background' : 'hover:bg-secondary'}`}>
              {t === 'licenses' && <Key size={14} className="inline mr-2" />}
              {t === 'questions' && <HelpCircle size={14} className="inline mr-2" />}
              {t === 'quizsets' && <BarChart3 size={14} className="inline mr-2" />}
              {t === 'analytics' && <BarChart3 size={14} className="inline mr-2" />}
              {t === 'quizsets' ? 'Quiz Sets' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'licenses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary/30 border border-border rounded-lg p-4"><p className="text-2xl font-bold">{active}</p><p className="text-sm text-muted-foreground">Active</p></div>
              <div className="bg-secondary/30 border border-border rounded-lg p-4"><p className="text-2xl font-bold text-red-500">{revoked}</p><p className="text-sm text-muted-foreground">Revoked</p></div>
              <div className="bg-secondary/30 border border-border rounded-lg p-4"><p className="text-2xl font-bold">{licenses.length}</p><p className="text-sm text-muted-foreground">Tổng</p></div>
            </div>

            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4"><Plus size={18} className="inline mr-2" />Tạo License</h2>
              <form onSubmit={createLicense} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input name="owner_name" placeholder="Tên" value={newL.owner_name} onChange={(e) => setNewL({ ...newL, owner_name: e.target.value })} className="p-2 border border-border rounded bg-background" />
                <input name="max_activations" type="number" min="1" max="10" placeholder="Số thiết bị" value={newL.max_activations} onChange={(e) => setNewL({ ...newL, max_activations: parseInt(e.target.value) || 1 })} className="p-2 border border-border rounded bg-background" />
                <select name="quiz_set_id" value={newL.quiz_set_id} onChange={(e) => setNewL({ ...newL, quiz_set_id: e.target.value })} className="p-2 border border-border rounded bg-background">
                  <option value="">Mặc định</option>
                  {quizSets.filter(qs => qs.is_active).map((qs) => (
                    <option key={qs.id} value={qs.id}>{qs.name}</option>
                  ))}
                </select>
                <button type="submit" className="py-2 bg-foreground text-background font-semibold rounded">Tạo</button>
              </form>
            </div>

            <div className="bg-secondary/30 border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Danh sách ({licenses.length})</h2>
                <button onClick={() => { const t = sessionStorage.getItem('physiq_admin_pass'); if (t) fetchLicenses(t); }} className="text-sm text-muted-foreground hover:text-foreground"><RefreshCw size={14} className="inline mr-1" />Refresh</button>
              </div>
              {licenses.map((l) => (
                <div key={l.id}>
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/20 border-b border-border" onClick={() => setExpandId(expandId === l.id ? null : l.id)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${l.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-mono text-sm font-semibold">{l.license_key}</p>
                        <p className="text-xs text-muted-foreground">{l.owner_name || '?'} • {l.activation_count}/{l.max_activations} thiết bị{l.quiz_set_name ? ` • ${l.quiz_set_name}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${l.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{l.status}</span>
                      {expandId === l.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {expandId === l.id && (
                    <div className="px-4 pb-4 bg-secondary/10 border-b border-border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4 pt-2">
                        <div><p className="text-muted-foreground">Email</p><p>{l.owner_email || '-'}</p></div>
                        <div><p className="text-muted-foreground">Tạo</p><p>{new Date(l.created_at).toLocaleDateString('vi-VN')}</p></div>
                        <div><p className="text-muted-foreground">Checkin</p><p>{l.last_checkin ? new Date(l.last_checkin).toLocaleString('vi-VN') : '-'}</p></div>
                        <div><p className="text-muted-foreground">Hết hạn</p><p>{l.expires_at ? new Date(l.expires_at).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}</p></div>
                        {l.revoked_reason && <div className="col-span-4"><p className="text-red-500">Lý do: {l.revoked_reason}</p></div>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(l.license_key); addToast('success', 'Copy!'); }} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary/50"><Copy size={12} className="inline mr-1" />Copy</button>
                        <button onClick={() => setAssignQS({ licenseId: l.id, quizSetId: l.quiz_set_id || '' })} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary/50"><BarChart3 size={12} className="inline mr-1" />Quiz Set</button>
                        {l.status === 'active' ? (
                          <button onClick={() => setRevokeTarget(l.id)} className="px-3 py-1.5 text-xs bg-red-500/20 text-red-500 border border-red-500/30 rounded"><Ban size={12} className="inline mr-1" />Khóa</button>
                        ) : (
                          <button onClick={() => restore(l.id)} className="px-3 py-1.5 text-xs bg-green-500/20 text-green-500 border border-green-500/30 rounded"><RotateCcw size={12} className="inline mr-1" />Khôi phục</button>
                        )}
                      </div>
                      {assignQS?.licenseId === l.id && (
                        <div className="mt-3 p-3 bg-secondary/20 border border-border rounded">
                          <p className="text-sm mb-2">Gán Quiz Set:</p>
                          <div className="flex gap-2">
                            <select value={assignQS.quizSetId} onChange={(e) => setAssignQS({ ...assignQS, quizSetId: e.target.value })} className="flex-1 p-2 text-sm border border-border rounded bg-background">
                              <option value="">Mặc định (tất cả câu hỏi)</option>
                              {quizSets.filter(qs => qs.is_active).map((qs) => (
                                <option key={qs.id} value={qs.id}>{qs.name}</option>
                              ))}
                            </select>
                            <button onClick={() => assignQuizSetToLicense(l.id, assignQS.quizSetId)} className="px-4 py-2 bg-foreground text-background rounded text-sm">Lưu</button>
                            <button onClick={() => setAssignQS(null)} className="px-4 py-2 border border-border rounded text-sm">Hủy</button>
                          </div>
                        </div>
                      )}
                      {revokeTarget === l.id && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
                          <p className="text-sm mb-2">Lý do (tùy chọn):</p>
                          <div className="flex gap-2">
                            <input value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="VD: Leak" className="flex-1 p-2 text-sm border border-red-500/30 rounded bg-background" />
                            <button onClick={() => revoke(l.id)} className="px-4 py-2 bg-red-500 text-white rounded text-sm">Khóa</button>
                            <button onClick={() => { setRevokeTarget(null); setRevokeReason(''); }} className="px-4 py-2 border border-border rounded text-sm">Hủy</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {licenses.length === 0 && <div className="p-8 text-center text-muted-foreground">Chưa có license!</div>}
            </div>
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary/30 border border-border rounded-lg p-4"><p className="text-2xl font-bold text-green-500">{questions.filter((q) => q.difficulty === 'easy').length}</p><p className="text-sm text-muted-foreground">Cơ bản</p></div>
              <div className="bg-secondary/30 border border-border rounded-lg p-4"><p className="text-2xl font-bold text-yellow-500">{questions.filter((q) => q.difficulty === 'medium').length}</p><p className="text-sm text-muted-foreground">Trung bình</p></div>
              <div className="bg-secondary/30 border border-border rounded-lg p-4"><p className="text-2xl font-bold text-red-500">{questions.filter((q) => q.difficulty === 'hard').length}</p><p className="text-sm text-muted-foreground">Nâng cao</p></div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-blue-500/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload size={32} className={`mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-muted-foreground'}`} />
              <p className="text-muted-foreground mb-2">
                {isDragging ? 'Thả file vào đây...' : 'Kéo thả file JSON để import câu hỏi'}
              </p>
              <p className="text-xs text-muted-foreground/60 mb-3">hoặc</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90"
              >
                Chọn file
              </button>
              <p className="text-xs text-muted-foreground/40 mt-3">
                Format: [{`{ "question_text": "...", "options": [...], "correct_index": 0, "difficulty": "easy" }`}]
              </p>
            </div>

            {editQ ? (
              <div className="bg-secondary/30 border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Sửa câu hỏi</h2>
                <form onSubmit={updateQuestion} className="space-y-4">
                  <textarea value={editQ.question_text} onChange={(e) => setEditQ({ ...editQ, question_text: e.target.value })} className="w-full p-3 border border-border rounded bg-background h-20" />
                  <div className="grid grid-cols-2 gap-3">
                    {editQ.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-sm text-muted-foreground mt-2 w-6">{i + 1}.</span>
                        <input value={opt} onChange={(e) => { const opts = [...editQ.options]; opts[i] = e.target.value; setEditQ({ ...editQ, options: opts }); }} className="flex-1 p-2 border border-border rounded bg-background text-sm" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <select value={editQ.correct_index} onChange={(e) => setEditQ({ ...editQ, correct_index: parseInt(e.target.value) })} className="p-2 border border-border rounded bg-background">
                      {[0, 1, 2, 3].map((i) => <option key={i} value={i}>Đáp án {i + 1}</option>)}
                    </select>
                    <select value={editQ.difficulty} onChange={(e) => setEditQ({ ...editQ, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })} className="p-2 border border-border rounded bg-background">
                      <option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option>
                    </select>
                    <select value={editQ.quiz_set_id || ''} onChange={(e) => setEditQ({ ...editQ, quiz_set_id: e.target.value || null })} className="p-2 border border-border rounded bg-background">
                      <option value="">Mặc định</option>
                      {quizSets.map((qs) => <option key={qs.id} value={qs.id}>{qs.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <input value={editQ.phase || ''} onChange={(e) => setEditQ({ ...editQ, phase: e.target.value })} placeholder="Phase" className="p-2 border border-border rounded bg-background" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="px-6 py-2 bg-foreground text-background font-semibold rounded">Lưu</button>
                    <button type="button" onClick={() => setEditQ(null)} className="px-6 py-2 border border-border rounded">Hủy</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-secondary/30 border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4"><Plus size={18} className="inline mr-2" />Thêm câu hỏi</h2>
                <form onSubmit={createQuestion} className="space-y-4">
                  <textarea value={newQ.question_text} onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })} placeholder="Câu hỏi" className="w-full p-3 border border-border rounded bg-background h-20" required />
                  <div className="grid grid-cols-2 gap-3">
                    {newQ.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-sm text-muted-foreground mt-2 w-6">{i + 1}.</span>
                        <input value={opt} onChange={(e) => { const opts = [...newQ.options]; opts[i] = e.target.value; setNewQ({ ...newQ, options: opts }); }} placeholder={`Đáp án ${i + 1}`} className="flex-1 p-2 border border-border rounded bg-background text-sm" required />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <select value={newQ.correct_index} onChange={(e) => setNewQ({ ...newQ, correct_index: parseInt(e.target.value) })} className="p-2 border border-border rounded bg-background">
                      {[0, 1, 2, 3].map((i) => <option key={i} value={i}>Đáp án {i + 1}</option>)}
                    </select>
                    <select value={newQ.difficulty} onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })} className="p-2 border border-border rounded bg-background">
                      <option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option>
                    </select>
                    <input value={newQ.phase} onChange={(e) => setNewQ({ ...newQ, phase: e.target.value })} placeholder="Phase" className="p-2 border border-border rounded bg-background" />
                    <select value={newQ.quiz_set_id} onChange={(e) => setNewQ({ ...newQ, quiz_set_id: e.target.value })} className="p-2 border border-border rounded bg-background">
                      <option value="">Mặc định</option>
                      {quizSets.map((qs) => <option key={qs.id} value={qs.id}>{qs.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="px-6 py-2 bg-foreground text-background font-semibold rounded">Thêm</button>
                </form>
              </div>
            )}

            <div className="bg-secondary/30 border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold">Tất cả ({questions.length})</h2>
                  <select 
                    value={filterQuizSet || ''} 
                    onChange={(e) => setFilterQuizSet(e.target.value || null)}
                    className="p-1.5 text-sm border border-border rounded bg-background"
                  >
                    <option value="">Tất cả Quiz Set</option>
                    {quizSets.map((qs) => (
                      <option key={qs.id} value={qs.id}>{qs.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={fetchQuestions} className="text-sm text-muted-foreground hover:text-foreground"><RefreshCw size={14} className="inline mr-1" />Refresh</button>
              </div>
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {questions
                  .filter(q => !filterQuizSet || q.quiz_set_id === filterQuizSet)
                  .map((q) => {
                    const qs = quizSets.find(qs => qs.id === q.quiz_set_id);
                    return (
                    <div key={q.id} className="p-4 hover:bg-secondary/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{q.question_text}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs mb-2">
                            {q.options.map((opt, i) => (
                              <span key={i} className={`px-2 py-0.5 rounded ${i === q.correct_index ? 'bg-green-500/20 text-green-500' : 'bg-secondary'}`}>{i + 1}. {opt}</span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded ${q.difficulty === 'easy' ? 'bg-green-500/20 text-green-500' : q.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
                              {q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                            </span>
                            <span className={`px-2 py-0.5 rounded ${q.quiz_set_id ? 'bg-blue-500/20 text-blue-500' : 'bg-secondary text-muted-foreground'}`}>
                              {qs?.name || 'Mặc định'}
                            </span>
                            {q.phase && <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">{q.phase}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex gap-1">
                            <button onClick={() => setEditQ(q)} className="p-1.5 text-xs border border-border rounded hover:bg-secondary/50">Sửa</button>
                            <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-xs border border-red-500/30 text-red-500 rounded hover:bg-red-500/10"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {questions.length === 0 && <div className="p-8 text-center text-muted-foreground">Chưa có câu hỏi!</div>}
              </div>
            </div>
          </div>
        )}

        {tab === 'quizsets' && (
          <div className="space-y-6">
            {editQS ? (
              <div className="bg-secondary/30 border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Sửa Quiz Set</h2>
                <form onSubmit={updateQuizSet} className="space-y-4">
                  <input value={editQS.name} onChange={(e) => setEditQS({ ...editQS, name: e.target.value })} placeholder="Tên Quiz Set" className="w-full p-3 border border-border rounded bg-background" required />
                  <textarea value={editQS.description || ''} onChange={(e) => setEditQS({ ...editQS, description: e.target.value })} placeholder="Mô tả" className="w-full p-3 border border-border rounded bg-background h-20" />
                  <div className="grid grid-cols-2 gap-4">
                    <input value={editQS.subject || ''} onChange={(e) => setEditQS({ ...editQS, subject: e.target.value })} placeholder="Môn học" className="p-3 border border-border rounded bg-background" />
                    <input value={editQS.grade || ''} onChange={(e) => setEditQS({ ...editQS, grade: e.target.value })} placeholder="Lớp" className="p-3 border border-border rounded bg-background" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="px-6 py-2 bg-foreground text-background font-semibold rounded">Lưu</button>
                    <button type="button" onClick={() => setEditQS(null)} className="px-6 py-2 border border-border rounded">Hủy</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-secondary/30 border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4"><Plus size={18} className="inline mr-2" />Tạo Quiz Set</h2>
                <form onSubmit={createQuizSet} className="space-y-4">
                  <input value={newQS.name} onChange={(e) => setNewQS({ ...newQS, name: e.target.value })} placeholder="Tên Quiz Set" className="w-full p-3 border border-border rounded bg-background" required />
                  <textarea value={newQS.description} onChange={(e) => setNewQS({ ...newQS, description: e.target.value })} placeholder="Mô tả" className="w-full p-3 border border-border rounded bg-background h-20" />
                  <div className="grid grid-cols-2 gap-4">
                    <input value={newQS.subject} onChange={(e) => setNewQS({ ...newQS, subject: e.target.value })} placeholder="Môn học" className="p-3 border border-border rounded bg-background" />
                    <input value={newQS.grade} onChange={(e) => setNewQS({ ...newQS, grade: e.target.value })} placeholder="Lớp" className="p-3 border border-border rounded bg-background" />
                  </div>
                  <button type="submit" className="px-6 py-2 bg-foreground text-background font-semibold rounded">Tạo</button>
                </form>
              </div>
            )}

            <div className="bg-secondary/30 border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Tất cả ({quizSets.length})</h2>
                <button onClick={fetchQuizSets} className="text-sm text-muted-foreground hover:text-foreground"><RefreshCw size={14} className="inline mr-1" />Refresh</button>
              </div>
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {quizSets.map((qs) => (
                  <div key={qs.id} className="p-4 hover:bg-secondary/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium mb-1">{qs.name}</p>
                        {qs.description && <p className="text-sm text-muted-foreground mb-1">{qs.description}</p>}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {qs.subject && <span>{qs.subject}</span>}
                          {qs.grade && <span>• {qs.grade}</span>}
                          <span>• {qs.question_count} câu hỏi</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded ${qs.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {qs.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => setEditQS(qs)} className="p-1.5 text-xs border border-border rounded hover:bg-secondary/50">Sửa</button>
                          <button onClick={() => deleteQuizSet(qs.id)} className="p-1.5 text-xs border border-red-500/30 text-red-500 rounded hover:bg-red-500/10"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {quizSets.length === 0 && <div className="p-8 text-center text-muted-foreground">Chưa có Quiz Set!</div>}
              </div>
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4"><BarChart3 size={18} className="inline mr-2" />Thống kê</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-secondary/50 rounded-lg"><p className="text-3xl font-bold">{licenses.length}</p><p className="text-sm text-muted-foreground">Tổng License</p></div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg"><p className="text-3xl font-bold text-green-500">{active}</p><p className="text-sm text-muted-foreground">Active</p></div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg"><p className="text-3xl font-bold text-red-500">{revoked}</p><p className="text-sm text-muted-foreground">Revoked</p></div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg"><p className="text-3xl font-bold">{licenses.reduce((s, l) => s + l.activation_count, 0)}</p><p className="text-sm text-muted-foreground">Tổng thiết bị</p></div>
              </div>
            </div>
            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Câu hỏi</h2>
              <div className="space-y-4">
                {[{ label: 'Dễ', color: 'bg-green-500', count: questions.filter((q) => q.difficulty === 'easy').length }, { label: 'Trung bình', color: 'bg-yellow-500', count: questions.filter((q) => q.difficulty === 'medium').length }, { label: 'Khó', color: 'bg-red-500', count: questions.filter((q) => q.difficulty === 'hard').length }].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1"><span>{item.label}</span><span>{item.count} câu</span></div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${questions.length ? (item.count / questions.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">Tổng: {questions.length} câu hỏi</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
