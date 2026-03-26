import { useState, FormEvent, useEffect } from 'react';
import { authService } from '../services/authService';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, UserPlus, ArrowRight, Phone, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('Name');
  const [role, setRole] = useState<'doctor' | 'admin'>('doctor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).isLogin !== undefined) {
      setIsLogin((location.state as any).isLogin);
    }
  }, [location.state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await authService.login(email, password);
        // Navigate based on role
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/doctor');
        }
      } else {
        const user = await authService.register({
          email,
          displayName,
          role,
          status: 'pending',
          specialization: role === 'doctor' ? 'General Medicine' : undefined
        }, password);
        
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          // Show success message and switch to login for doctors
          alert('تم إنشاء الحساب بنجاح! حسابك الآن قيد المراجعة، يرجى الانتظار حتى يتم تفعيله من قبل الإدارة لتتمكن من تسجيل الدخول.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      let message = err.message;
      const errorCode = err.code || (err.message?.includes('(') ? err.message.split('(')[1].split(')')[0] : '');

      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
        if (adminEmail && email.toLowerCase() === adminEmail) {
          message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا كنت تدخل لأول مرة، يرجى استخدام تبويب "إنشاء حساب" لتفعيل حساب المسؤول بكلمة مرور، أو استخدم زر "جوجل" أدناه.';
        } else {
          message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات أو إنشاء حساب جديد إذا لم تكن قد سجلت من قبل.';
        }
      } else if (errorCode === 'auth/email-already-in-use') {
        message = 'هذا البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.';
      } else if (errorCode === 'auth/weak-password') {
        message = 'كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى.';
      } else if (errorCode === 'auth/too-many-requests') {
        message = 'لقد قمت بمحاولات كثيرة جداً. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى.';
      } else if (errorCode === 'auth/popup-closed-by-user') {
        message = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
      }
      
      setError(message);
      console.error('Auth Error Details:', { code: errorCode, original: err });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await authService.loginWithGoogle();
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/doctor');
      }
    } catch (err: any) {
      setError('فشل تسجيل الدخول بواسطة جوجل. يرجى المحاولة مرة أخرى.');
      console.error('Google Auth Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-medical-primary hover:bg-sky-50 rounded-2xl shadow-md hover:shadow-xl border border-sky-100 hover:border-medical-primary/30 transition-all mb-8 group self-start hover:scale-105 active:scale-95"
        >
          <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
          <span className="font-bold text-lg">العودة للرئيسية</span>
        </Link>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-sky-100 text-medical-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              {isLogin ? <LogIn size={32} /> : <UserPlus size={32} />}
            </div>
            <h1 className="text-2xl font-bold text-medical-dark">
              {isLogin ? 'دخول الكادر الطبي' : 'إنشاء حساب جديد'}
            </h1>
            <p className="text-slate-500 mt-2">
              {isLogin ? 'يرجى إدخال بيانات الاعتماد للوصول إلى لوحة التحكم' : 'املأ البيانات للانضمام إلى المنصة'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="د. أحمد محمد"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">نوع الحساب</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  >
                    <option value="doctor">طبيب </option>
                    {email.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase() && (
                      <option value="admin">مسؤول (Admin)</option>
                    )}
                  </select>
                </div>
              </>
            )}

            <div className="text-right">
              <label className="block text-sm font-semibold text-slate-700 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.com"
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
            </div>

            <div className="text-right">
              <label className="block text-sm font-semibold text-slate-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full medical-gradient text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">أو</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            {isLogin ? 'الدخول بواسطة جوجل' : 'التسجيل بواسطة جوجل'}
          </button>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-medical-primary font-semibold hover:underline mb-6 block w-full"
            >
              {isLogin ? "ليس لديك حساب؟ سجل الآن" : 'لديك حساب بالفعل؟ سجل دخولك'}
            </button>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">للدعم الفني والاستفسارات</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                  href="tel:776458925" 
                  className="flex items-center gap-2 text-slate-600 hover:text-medical-primary transition-colors text-sm font-bold"
                >
                  <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-medical-primary">
                    <Phone size={16} />
                  </div>
                  <span>776458925</span>
                </a>
                <div className="hidden sm:block w-px h-4 bg-slate-200"></div>
                <a 
                  href="https://wa.me/967776458925" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors text-sm font-bold"
                >
                  <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-emerald-500">
                    <MessageCircle size={16} />
                  </div>
                  <span>واتساب: 776458925</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

