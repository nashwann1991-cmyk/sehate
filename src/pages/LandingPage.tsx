import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';
import { Search, FileText, CheckCircle, Shield, Activity, LogIn, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  const [nationalId, setNationalId] = useState('');
  const [leaveId, setLeaveId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/doctor');
    }
  }, [navigate]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!nationalId && !leaveId) return;
    
    setLoading(true);
    try {
      const leave = await dataService.searchLeave(leaveId, nationalId);
      if (leave) {
        navigate(`/verify/${leave.id}`);
      } else {
        alert('لم يتم العثور على إجازة مرضية بهذه البيانات');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-medical-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-medical-secondary/10 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 relative">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-sky-50 text-medical-primary px-4 py-2 rounded-full text-sm font-bold mb-6 border border-sky-100">
              <Shield size={16} />
              منصة طبية معتمدة وآمنة 100%
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-medical-dark mb-6 leading-tight">
              نظام <span className="text-medical-primary">إجازتي المرضية</span> <br />
              المستقبل الرقمي للرعاية
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
              الحل الأمثل للمستشفيات والعيادات لإصدار والتحقق من الإجازات المرضية بشكل فوري وموثوق.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                state={{ isLogin: true }}
                className="w-full sm:w-auto medical-gradient text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <LogIn size={22} />
                تسجيل دخول
              </Link>
              <Link
                to="/login"
                state={{ isLogin: false }}
                className="w-full sm:w-auto bg-white text-medical-primary border-2 border-medical-primary px-10 py-4 rounded-2xl font-bold text-lg hover:bg-sky-50 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={22} />
                إنشاء حساب جديد
              </Link>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-sky-100 text-medical-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">إصدار فوري</h3>
              <p className="text-slate-600">يتم إصدار الإجازة من قبل الطبيب المعتمد وتكون متاحة للتحقق فوراً.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-emerald-100 text-medical-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">تحقق ذكي</h3>
              <p className="text-slate-600">نظام QR Code متطور يتيح لجهات العمل التحقق من صحة الإجازة في ثوانٍ.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-slate-100 text-medical-dark rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">أمان عالي</h3>
              <p className="text-slate-600">بياناتكم محمية بأعلى معايير التشفير العالمية والخصوصية الطبية.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
