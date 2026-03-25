import { useState, useEffect, FormEvent } from 'react';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';
import { geminiService } from '../services/geminiService';
import { UserProfile, SickLeave } from '../types';
import { Plus, List, Calendar, User, FileText, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';

interface DoctorDashboardProps {
  user: UserProfile;
}

export default function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'issue' | 'history'>('issue');
  const [leaves, setLeaves] = useState<SickLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successLeaveId, setSuccessLeaveId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    patientName: '',
    patientNameEn: '',
    patientId: '',
    diagnosis: '',
    diagnosisEn: '',
    startDate: new Date().toISOString().split('T')[0],
    duration: 1,
    nationality: 'المملكة العربية السعودية',
    nationalityEn: 'Saudi Arabia',
    employer: '',
    employerEn: '',
    doctorName: user.displayName || '',
    doctorNameEn: '',
    doctorPosition: user.role === 'doctor' ? 'استشاري' : 'ممارس',
    doctorPositionEn: user.role === 'doctor' ? 'Consultant' : 'Practitioner',
    admissionDate: new Date().toISOString().split('T')[0],
    dischargeDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const syncProfile = async () => {
      try {
        await authService.ensureProfileExists(user);
      } catch (err) {
        console.error('Error syncing profile:', err);
      }
    };
    syncProfile();
    fetchLeaves();
  }, [user.uid]);

  const fetchLeaves = async () => {
    setFetching(true);
    try {
      const fetchedLeaves = await dataService.getLeavesByDoctor(user.uid);
      setLeaves(fetchedLeaves);
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleIssueLeave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endDate = new Date(formData.startDate);
      endDate.setDate(endDate.getDate() + formData.duration);

      const newLeave = await dataService.addLeave({
        patientName: formData.patientName,
        patientNameEn: formData.patientNameEn || await geminiService.translateToEnglish(formData.patientName).catch(() => ''),
        patientId: formData.patientId,
        doctorId: user.uid,
        doctorName: formData.doctorName,
        doctorNameEn: formData.doctorNameEn || await geminiService.translateToEnglish(formData.doctorName).catch(() => ''),
        diagnosis: formData.diagnosis,
        diagnosisEn: formData.diagnosisEn || await geminiService.translateToEnglish(formData.diagnosis).catch(() => ''),
        startDate: formData.startDate,
        endDate: endDate.toISOString().split('T')[0],
        duration: formData.duration,
        nationality: formData.nationality,
        nationalityEn: formData.nationalityEn || await geminiService.translateToEnglish(formData.nationality).catch(() => ''),
        employer: formData.employer,
        employerEn: formData.employerEn || await geminiService.translateToEnglish(formData.employer).catch(() => ''),
        doctorPosition: formData.doctorPosition,
        doctorPositionEn: formData.doctorPositionEn || await geminiService.translateToEnglish(formData.doctorPosition).catch(() => ''),
        admissionDate: formData.admissionDate,
        dischargeDate: formData.dischargeDate,
      });

      // حفظ بيانات المريض أيضاً
      await dataService.addPatient({
        id: formData.patientId,
        name: formData.patientName,
        createdAt: Date.now()
      }).catch(err => console.error('Error saving patient:', err));
      
      if (newLeave && newLeave.id) {
        setSuccessLeaveId(newLeave.id);
      }
      
      // Reset form and refresh list
      setFormData({
        patientName: '',
        patientNameEn: '',
        patientId: '',
        diagnosis: '',
        diagnosisEn: '',
        startDate: new Date().toISOString().split('T')[0],
        duration: 1,
        nationality: 'المملكة العربية السعودية',
        nationalityEn: 'Saudi Arabia',
        employer: '',
        employerEn: '',
        doctorName: user.displayName || '',
        doctorNameEn: '',
        doctorPosition: user.role === 'doctor' ? 'استشاري' : 'ممارس',
        doctorPositionEn: user.role === 'doctor' ? 'Consultant' : 'Practitioner',
        admissionDate: new Date().toISOString().split('T')[0],
        dischargeDate: new Date().toISOString().split('T')[0],
      });
      setActiveTab('history');
      fetchLeaves();
    } catch (err) {
      console.error('Error issuing leave:', err);
      alert('Error issuing leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="text-right">
          <h1 className="text-3xl font-bold text-medical-dark">لوحة تحكم الطبيب</h1>
          <p className="text-slate-500">إدارة وإصدار الإجازات المرضية للمرضى</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'issue' ? 'bg-medical-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Plus size={18} />
            إصدار إجازة
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'history' ? 'bg-medical-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={18} />
            السجل
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'issue' ? (
          <motion.div
            key="issue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
          >
            {successLeaveId && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle size={24} />
                </div>
                <h3 className="font-bold text-emerald-800 mb-1">تم إصدار الإجازة بنجاح!</h3>
                <p className="text-sm text-emerald-600 mb-4">يمكنك الآن عرض وتحميل الشهادة كملف PDF</p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => window.open(`/verify/${successLeaveId}`, '_blank')}
                    className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
                  >
                    عرض الشهادة
                  </button>
                  <button 
                    onClick={() => setSuccessLeaveId(null)}
                    className="flex-1 bg-white text-emerald-600 border border-emerald-200 py-2 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all"
                  >
                    إصدار أخرى
                  </button>
                </div>
              </motion.div>
            )}

            {!successLeaveId && (
              <form onSubmit={handleIssueLeave} className="space-y-8">
                {/* Section: Patient Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <User className="text-medical-primary" size={20} />
                    <h3 className="font-bold text-slate-800">بيانات المريض / Patient Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">اسم المريض (عربي)</label>
                      <input
                        type="text"
                        required
                        value={formData.patientName}
                        onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                        placeholder="الاسم الكامل بالعربي"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Name (English)</label>
                      <input
                        type="text"
                        required
                        value={formData.patientNameEn}
                        onChange={(e) => setFormData({...formData, patientNameEn: e.target.value})}
                        placeholder="Full Name in English"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">رقم الهوية / National ID</label>
                      <input
                        type="text"
                        required
                        value={formData.patientId}
                        onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                        placeholder="10XXXXXXXX"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">الجنسية (عربي)</label>
                      <input
                        type="text"
                        required
                        value={formData.nationality}
                        onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                        placeholder="مثال: سعودي"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Nationality (English)</label>
                      <input
                        type="text"
                        required
                        value={formData.nationalityEn}
                        onChange={(e) => setFormData({...formData, nationalityEn: e.target.value})}
                        placeholder="Example: Saudi"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">جهة العمل (عربي)</label>
                      <input
                        type="text"
                        required
                        value={formData.employer}
                        onChange={(e) => setFormData({...formData, employer: e.target.value})}
                        placeholder="اسم الشركة بالعربي"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Employer (English)</label>
                    <input
                      type="text"
                      required
                      value={formData.employerEn}
                      onChange={(e) => setFormData({...formData, employerEn: e.target.value})}
                      placeholder="Company Name in English"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Section: Medical Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <FileText className="text-medical-primary" size={20} />
                    <h3 className="font-bold text-slate-800">البيانات الطبية / Medical Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">التشخيص الطبي (عربي)</label>
                      <textarea
                        required
                        rows={2}
                        value={formData.diagnosis}
                        onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                        placeholder="وصف الحالة بالعربي..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none resize-none transition-all"
                      />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Diagnosis (English)</label>
                      <textarea
                        required
                        rows={2}
                        value={formData.diagnosisEn}
                        onChange={(e) => setFormData({...formData, diagnosisEn: e.target.value})}
                        placeholder="Diagnosis in English..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none resize-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ البدء / Start Date</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">المدة (أيام) / Duration (Days)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="30"
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ التنويم / Admission Date</label>
                      <input
                        type="date"
                        required
                        value={formData.admissionDate}
                        onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ الخروج / Discharge Date</label>
                      <input
                        type="date"
                        required
                        value={formData.dischargeDate}
                        onChange={(e) => setFormData({...formData, dischargeDate: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Practitioner Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <CheckCircle className="text-medical-primary" size={20} />
                    <h3 className="font-bold text-slate-800">بيانات الممارس / Practitioner Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">اسم الممارس (عربي)</label>
                      <input
                        type="text"
                        required
                        value={formData.doctorName}
                        onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Practitioner Name (English)</label>
                      <input
                        type="text"
                        required
                        value={formData.doctorNameEn}
                        onChange={(e) => setFormData({...formData, doctorNameEn: e.target.value})}
                        placeholder="Doctor Name in English"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">المسمى الوظيفي (عربي)</label>
                      <input
                        type="text"
                        required
                        value={formData.doctorPosition}
                        onChange={(e) => setFormData({...formData, doctorPosition: e.target.value})}
                        placeholder="مثال: استشاري"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Position (English)</label>
                      <input
                        type="text"
                        required
                        value={formData.doctorPositionEn}
                        onChange={(e) => setFormData({...formData, doctorPositionEn: e.target.value})}
                        placeholder="Example: Consultant"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full medical-gradient text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle size={22} />
                      إصدار الإجازة وإنشاء رمز QR
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {fetching ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-medical-primary"></div>
              </div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">لم يتم إصدار أي إجازات بعد</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaves.map((leave) => (
                  <div key={leave.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group text-right">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-sky-50 text-medical-primary rounded-xl flex items-center justify-center group-hover:bg-medical-primary group-hover:text-white transition-colors">
                        <User size={24} />
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        leave.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {leave.status === 'active' ? 'نشط' : 'منتهي'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{leave.patientName}</h3>
                    <p className="text-sm text-slate-500 mb-4">رقم الإجازة: {leave.leaveNumber}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={16} />
                        <span>من: {formatDate(leave.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock size={16} />
                        <span>المدة: {leave.duration} أيام</span>
                      </div>
                    </div>

                    <button
                      onClick={() => window.open(`/verify/${leave.id}`, '_blank')}
                      className="w-full py-2 text-medical-primary font-semibold text-sm border border-medical-primary/20 rounded-lg hover:bg-medical-primary hover:text-white transition-all"
                    >
                      عرض التفاصيل والتحقق
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
