import { useState, FormEvent, useEffect } from 'react';
import { authService } from '../services/authService';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('nashwann1991@gmail.com');
  const [password, setPassword] = useState('*1991*2001*');
  const [displayName, setDisplayName] = useState('General Manager');
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
      } else {
        user = await authService.register({
          email,
          displayName,
          role,
          specialization: role === 'doctor' ? 'General Medicine' : undefined
        }, password);
      }
      
      // Navigate based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/doctor');
      }
    } catch (err: any) {
      let message = err.message;
      if (err.message.includes('auth/invalid-credential')) {
        message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات أو إنشاء حساب جديد إذا لم تكن قد سجلت من قبل.';
      } else if (err.message.includes('auth/email-already-in-use')) {
        message = 'هذا البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.';
      } else if (err.message.includes('auth/weak-password')) {
        message = 'كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى.';
      } else if (err.message.includes('auth/too-many-requests')) {
        message = 'لقد قمت بمحاولات كثيرة جداً. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى.';
      }
      setError(message);
      console.error('Auth Error:', err);
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
                    <option value="doctor">طبيب</option>
                    <option value="admin">مدير نظام</option>
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
              className="text-medical-primary font-semibold hover:underline"
            >
              {isLogin ? "ليس لديك حساب؟ سجل الآن" : 'لديك حساب بالفعل؟ سجل دخولك'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

