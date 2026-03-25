import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';
import { Search, FileText, CheckCircle, Shield, Activity } from 'lucide-react';
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
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              الحل الأمثل للمستشفيات والعيادات لإصدار والتحقق من الإجازات المرضية بشكل فوري وموثوق.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Search Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="glass-card p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/50"
            >
              <div className="text-right mb-8">
                <h2 className="text-2xl font-bold text-medical-dark">التحقق من الإجازة</h2>
                <p className="text-slate-500">أدخل البيانات للتحقق من صحة الشهادة الطبية</p>
              </div>

              <form onSubmit={handleSearch} className="space-y-6">
                <div className="text-right">
                  <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهوية الوطنية / الإقامة</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="أدخل رقم الهوية (اختياري)"
                    className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-medical-primary/10 focus:border-medical-primary transition-all outline-none text-right text-lg"
                  />
                </div>

                <div className="text-right">
                  <label className="block text-sm font-bold text-slate-700 mb-2">رقم الإجازة المرضية</label>
                  <input
                    type="text"
                    value={leaveId}
                    onChange={(e) => setLeaveId(e.target.value)}
                    placeholder="GSL-YYYYMMDD-XXXX (اختياري)"
                    className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-medical-primary/10 focus:border-medical-primary transition-all outline-none text-right text-lg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full medical-gradient text-white py-5 rounded-2xl font-bold text-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Search size={24} />
                      التحقق من صلاحية الإجازة
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            {/* Visual Element */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="hidden lg:block text-right"
            >
              <div className="space-y-8">
                <div className="flex items-center gap-6 bg-white p-6 rounded-3xl shadow-lg border border-slate-100 transform -rotate-2 hover:rotate-0 transition-all">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                    <CheckCircle size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-medical-dark">موثوقية تامة</h4>
                    <p className="text-slate-500">نظام مشفر يمنع التزوير والتلاعب بالبيانات الطبية.</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 bg-white p-6 rounded-3xl shadow-lg border border-slate-100 transform rotate-1 hover:rotate-0 transition-all translate-x-8">
                  <div className="w-16 h-16 bg-sky-100 text-medical-primary rounded-2xl flex items-center justify-center shrink-0">
                    <Activity size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-medical-dark">تكامل ذكي</h4>
                    <p className="text-slate-500">ربط مباشر مع أنظمة المستشفيات والجهات الحكومية.</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 bg-white p-6 rounded-3xl shadow-lg border border-slate-100 transform -rotate-1 hover:rotate-0 transition-all">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-medical-dark">تقارير فورية</h4>
                    <p className="text-slate-500">إصدار وتحميل الشهادات بصيغة PDF مع رمز QR.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
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
