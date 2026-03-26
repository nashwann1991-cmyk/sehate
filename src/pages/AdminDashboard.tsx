import { useState, useEffect, FormEvent } from 'react';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';
import { geminiService } from '../services/geminiService';
import { UserProfile, SickLeave, Patient } from '../types';
import { Users, Activity, TrendingUp, Shield, UserPlus, X, Download, UserCheck, FileText, CheckCircle, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  user: UserProfile;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'doctors' | 'patients' | 'issue' | 'leaves' | 'pending'>('doctors');
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [leaves, setLeaves] = useState<SickLeave[]>([]);
  const [stats, setStats] = useState({ totalLeaves: 0, totalDoctors: 0, activeLeaves: 0, totalPatients: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successLeaveId, setSuccessLeaveId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editingLeave, setEditingLeave] = useState<SickLeave | null>(null);
  const [editingSubscriptionDoctor, setEditingSubscriptionDoctor] = useState<UserProfile | null>(null);
  const [subscriptionFormData, setSubscriptionFormData] = useState({
    plan: 'free' as 'free' | 'pro' | 'enterprise',
    expiryDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive' | 'trial'
  });

  // Issue Leave Form State
  const [leaveFormData, setLeaveFormData] = useState({
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
    doctorPosition: 'استشاري',
    doctorPositionEn: 'Consultant',
    admissionDate: new Date().toISOString().split('T')[0],
    dischargeDate: new Date().toISOString().split('T')[0],
  });

  // New Doctor Form
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
    employeeId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allUsers, allPatients, allLeaves] = await Promise.all([
        authService.getAllUsers(),
        dataService.getPatients(),
        dataService.getLeaves()
      ]);

      const doctorsList = allUsers.filter(u => u.role === 'doctor');
      const pendingList = allUsers.filter(u => u.status === 'pending');
      setDoctors(doctorsList);
      setPendingUsers(pendingList);
      setPatients(allPatients);
      setLeaves(allLeaves);
      
      setStats({
        totalLeaves: allLeaves.length,
        totalDoctors: doctorsList.length,
        activeLeaves: allLeaves.filter(l => l.status === 'active').length,
        totalPatients: allPatients.length
      });
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await authService.registerByAdmin({
        email: newDoctor.email,
        displayName: newDoctor.name,
        role: 'doctor',
        status: 'active',
        specialization: newDoctor.specialization,
        employeeId: newDoctor.employeeId,
      }, newDoctor.password);
      
      alert('تم إضافة الطبيب بنجاح');
      setShowAddDoctor(false);
      setNewDoctor({ name: '', email: '', password: '', specialization: '', employeeId: '' });
      fetchData();
    } catch (err: any) {
      console.error('Error adding doctor:', err);
      alert('خطأ في إضافة الطبيب: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUserStatus = async (uid: string, status: 'pending' | 'active' | 'suspended') => {
    try {
      await authService.updateUserStatus(uid, status);
      alert('تم تحديث حالة المستخدم بنجاح');
      fetchData();
    } catch (err: any) {
      console.error('Error updating user status:', err);
      alert('خطأ في تحديث حالة المستخدم: ' + err.message);
    }
  };

  const handleUpdateSubscription = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSubscriptionDoctor) return;
    setSubmitting(true);
    try {
      await authService.updateUserSubscription(editingSubscriptionDoctor.uid, {
        plan: subscriptionFormData.plan,
        status: subscriptionFormData.status,
        expiryDate: new Date(subscriptionFormData.expiryDate).getTime()
      });
      alert('تم تحديث الاشتراك بنجاح');
      setEditingSubscriptionDoctor(null);
      fetchData();
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      alert('خطأ في تحديث الاشتراك: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueLeave = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const endDate = new Date(leaveFormData.startDate);
      endDate.setDate(endDate.getDate() + leaveFormData.duration);

      const newLeave = await dataService.addLeave({
        patientName: leaveFormData.patientName,
        patientNameEn: leaveFormData.patientNameEn || await geminiService.translateToEnglish(leaveFormData.patientName),
        patientId: leaveFormData.patientId,
        doctorId: user.uid,
        doctorName: user.displayName,
        doctorNameEn: await geminiService.translateToEnglish(user.displayName),
        diagnosis: leaveFormData.diagnosis,
        diagnosisEn: leaveFormData.diagnosisEn || await geminiService.translateToEnglish(leaveFormData.diagnosis),
        startDate: leaveFormData.startDate,
        endDate: endDate.toISOString().split('T')[0],
        duration: leaveFormData.duration,
        nationality: leaveFormData.nationality,
        nationalityEn: leaveFormData.nationalityEn || await geminiService.translateToEnglish(leaveFormData.nationality),
        employer: leaveFormData.employer,
        employerEn: leaveFormData.employerEn || await geminiService.translateToEnglish(leaveFormData.employer),
        doctorPosition: leaveFormData.doctorPosition,
        doctorPositionEn: leaveFormData.doctorPositionEn || await geminiService.translateToEnglish(leaveFormData.doctorPosition),
        admissionDate: leaveFormData.admissionDate,
        dischargeDate: leaveFormData.dischargeDate,
      });
      
      setSuccessLeaveId(newLeave.id);
      
      setLeaveFormData({
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
        doctorPosition: 'استشاري',
        doctorPositionEn: 'Consultant',
        admissionDate: new Date().toISOString().split('T')[0],
        dischargeDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (err) {
      console.error('Error issuing leave:', err);
      alert('خطأ في إصدار الإجازة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المريض؟')) return;
    try {
      await dataService.deletePatient(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('خطأ في حذف المريض');
    }
  };

  const handleUpdatePatient = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setSubmitting(true);
    try {
      await dataService.updatePatient(editingPatient.id, editingPatient);
      setEditingPatient(null);
      fetchData();
    } catch (err) {
      console.error('Error updating patient:', err);
      alert('خطأ في تحديث بيانات المريض');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الإجازة؟')) return;
    try {
      await dataService.deleteLeave(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting leave:', err);
      alert('خطأ في حذف الإجازة');
    }
  };

  const handleDeleteDoctor = async (uid: string) => {
    if (uid === user.uid) {
      alert('لا يمكنك حذف حسابك الخاص');
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف حساب هذا الطبيب؟ سيتم إزالة ملفه الشخصي من النظام.')) return;
    try {
      await authService.deleteUser(uid);
      fetchData();
    } catch (err) {
      console.error('Error deleting doctor:', err);
      alert('خطأ في حذف حساب الطبيب');
    }
  };

  const handleUpdateLeave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingLeave) return;
    setSubmitting(true);
    try {
      // Recalculate endDate based on startDate and duration
      const endDate = new Date(editingLeave.startDate);
      endDate.setDate(endDate.getDate() + editingLeave.duration);
      
      const updatedLeave = {
        ...editingLeave,
        endDate: endDate.toISOString().split('T')[0]
      };

      await dataService.updateLeave(editingLeave.id, updatedLeave);
      setEditingLeave(null);
      fetchData();
    } catch (err) {
      console.error('Error updating leave:', err);
      alert('خطأ في تحديث الإجازة');
    } finally {
      setSubmitting(false);
    }
  };

  const exportDoctorsToCSV = () => {
    if (doctors.length === 0) {
      alert('No doctors to export');
      return;
    }

    const headers = ['Name', 'Email', 'Specialization', 'Employee ID', 'Joined Date'];
    const rows = doctors.map(doc => [
      doc.displayName,
      doc.email,
      doc.specialization || '',
      doc.employeeId || '',
      new Date(doc.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `doctors_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPatientsToCSV = () => {
    if (patients.length === 0) {
      alert('لا يوجد مرضى لتصديرهم');
      return;
    }

    const headers = ['Name', 'National ID', 'Created Date'];
    const rows = patients.map(patient => [
      patient.name,
      patient.id,
      new Date(patient.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `patients_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLeavesToCSV = () => {
    if (leaves.length === 0) {
      alert('لا يوجد إجازات لتصديرها');
      return;
    }

    const headers = ['Patient Name', 'Patient ID', 'Start Date', 'Duration', 'Doctor Name', 'Status', 'Leave Number'];
    const rows = leaves.map(leave => [
      leave.patientName,
      leave.patientId,
      leave.startDate,
      `${leave.duration} days`,
      leave.doctorName,
      leave.status,
      leave.leaveNumber
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sick_leaves_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-medical-dark">لوحة تحكم المدير</h1>
        <p className="text-slate-500">مراقبة النظام وإدارة الكادر الطبي</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="w-14 h-14 bg-sky-50 text-medical-primary rounded-2xl flex items-center justify-center">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">إجمالي الإجازات</p>
            <h3 className="text-2xl font-bold">{stats.totalLeaves}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="w-14 h-14 bg-emerald-50 text-medical-secondary rounded-2xl flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">الأطباء</p>
            <h3 className="text-2xl font-bold">{stats.totalDoctors}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <UserCheck size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">المرضى</p>
            <h3 className="text-2xl font-bold">{stats.totalPatients}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
            <CreditCard size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500 font-medium">نوع الاشتراك</p>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold uppercase">{user?.subscription?.plan || 'Free'}</h3>
              <button className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-bold hover:bg-amber-200 transition-colors">
                ترقية
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit mb-8">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'doctors' ? 'bg-medical-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Shield size={18} />
          إدارة الأطباء
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'pending' ? 'bg-medical-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserCheck size={18} />
          طلبات الانضمام ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('patients')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'patients' ? 'bg-medical-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={18} />
          إدارة المرضى
        </button>
        <button
          onClick={() => setActiveTab('issue')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'issue' ? 'bg-medical-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity size={18} />
          إصدار إجازة
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'leaves' ? 'bg-medical-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText size={18} />
          سجل الإجازات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'doctors' ? (
              <motion.div
                key="doctors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="text-medical-primary" size={20} />
                    الأطباء المعتمدون
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={exportDoctorsToCSV}
                      className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <Download size={18} />
                      تصدير CSV
                    </button>
                    <button
                      onClick={() => setShowAddDoctor(true)}
                      className="flex items-center gap-2 bg-medical-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-600 transition-all"
                    >
                      <UserPlus size={18} />
                      إضافة طبيب جديد
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">الطبيب</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">التخصص</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">البريد الإلكتروني</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">الاشتراك</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">تاريخ الانضمام</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {doctors.map((doc) => (
                          <tr key={doc.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold flex items-center gap-2">
                                {doc.displayName}
                                {doc.status === 'pending' && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">جديد</span>
                                )}
                                {doc.status === 'suspended' && (
                                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">معلق</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">رقم الموظف: {doc.employeeId || 'غير متوفر'}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{doc.specialization}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{doc.email}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                                  doc.subscription?.plan === 'pro' ? 'bg-amber-100 text-amber-700' :
                                  doc.subscription?.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {doc.subscription?.plan?.toUpperCase() || 'FREE'}
                                </span>
                                {doc.subscription?.expiryDate && (
                                  <span className="text-[10px] text-slate-400 mt-1">
                                    ينتهي: {new Date(doc.subscription.expiryDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingSubscriptionDoctor(doc);
                                    setSubscriptionFormData({
                                      plan: doc.subscription?.plan || 'free',
                                      status: doc.subscription?.status || 'active',
                                      expiryDate: new Date(doc.subscription?.expiryDate || Date.now()).toISOString().split('T')[0]
                                    });
                                  }}
                                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="إدارة الاشتراك"
                                >
                                  <CreditCard size={16} />
                                </button>
                                <select
                                  value={doc.status}
                                  onChange={(e) => handleUpdateUserStatus(doc.uid, e.target.value as any)}
                                  className={`text-xs border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-medical-primary ${
                                    doc.status === 'active' ? 'border-emerald-200 text-emerald-700' : 
                                    doc.status === 'pending' ? 'border-amber-200 text-amber-700' : 
                                    'border-red-200 text-red-700'
                                  }`}
                                >
                                  <option value="active">نشط (مفعل)</option>
                                  <option value="pending">قيد الانتظار</option>
                                  <option value="suspended">معلق (إيقاف)</option>
                                </select>
                                <button
                                  onClick={() => handleDeleteDoctor(doc.uid)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="حذف حساب الطبيب"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {doctors.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                              لا يوجد أطباء مسجلين بعد
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'pending' ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <UserCheck className="text-medical-primary" size={20} />
                    طلبات الانضمام الجديدة
                  </h2>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">المستخدم</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">الدور</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">البريد الإلكتروني</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">تاريخ الطلب</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pendingUsers.map((u) => (
                          <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold">{u.displayName}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{u.role === 'doctor' ? 'طبيب' : u.role}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateUserStatus(u.uid, 'active')}
                                  className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-600 transition-all"
                                >
                                  موافقة
                                </button>
                                <button
                                  onClick={() => handleUpdateUserStatus(u.uid, 'suspended')}
                                  className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 transition-all"
                                >
                                  رفض
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pendingUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                              لا توجد طلبات انضمام معلقة
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'patients' ? (
              <motion.div
                key="patients"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="text-medical-primary" size={20} />
                    سجل المرضى
                  </h2>
                  <button
                    onClick={exportPatientsToCSV}
                    className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                  >
                    <Download size={18} />
                    تصدير CSV
                  </button>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">المريض</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">رقم الهوية</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">تاريخ التسجيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {patients.map((patient) => (
                          <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold">{patient.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{patient.id}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {new Date(patient.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingPatient(patient)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="تعديل"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeletePatient(patient.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {patients.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                              لا يوجد مرضى مسجلين بعد
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'issue' ? (
              <motion.div
                key="issue"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
              >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Activity className="text-medical-primary" size={20} />
                  إصدار إجازة مرضية جديدة
                </h2>

                {successLeaveId && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center text-center"
                  >
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle size={24} />
                    </div>
                    <h3 className="font-bold text-emerald-800 mb-1">تم إصدار الإجازة بنجاح!</h3>
                    <p className="text-sm text-emerald-600 mb-4">يمكنك الآن عرض وتحميل الشهادة بصيغة PDF</p>
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
                  <form onSubmit={handleIssueLeave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">اسم المريض (عربي)</label>
                        <input
                          type="text"
                          required
                          value={leaveFormData.patientName}
                          onChange={(e) => setLeaveFormData({...leaveFormData, patientName: e.target.value})}
                          placeholder="الاسم الكامل بالعربي"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Name (English)</label>
                        <input
                          type="text"
                          required
                          value={leaveFormData.patientNameEn}
                          onChange={(e) => setLeaveFormData({...leaveFormData, patientNameEn: e.target.value})}
                          placeholder="Full Name in English"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">رقم الهوية / National ID</label>
                      <input
                        type="text"
                        required
                        value={leaveFormData.patientId}
                        onChange={(e) => setLeaveFormData({...leaveFormData, patientId: e.target.value})}
                        placeholder="10XXXXXXXX"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">التشخيص الطبي (عربي)</label>
                        <textarea
                          required
                          rows={2}
                          value={leaveFormData.diagnosis}
                          onChange={(e) => setLeaveFormData({...leaveFormData, diagnosis: e.target.value})}
                          placeholder="وصف الحالة بالعربي..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none resize-none"
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Diagnosis (English)</label>
                        <textarea
                          required
                          rows={2}
                          value={leaveFormData.diagnosisEn}
                          onChange={(e) => setLeaveFormData({...leaveFormData, diagnosisEn: e.target.value})}
                          placeholder="Diagnosis in English..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none resize-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ البدء</label>
                        <input
                          type="date"
                          required
                          value={leaveFormData.startDate}
                          onChange={(e) => setLeaveFormData({...leaveFormData, startDate: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">المدة (أيام)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="30"
                          value={leaveFormData.duration}
                          onChange={(e) => setLeaveFormData({...leaveFormData, duration: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">الجنسية (عربي)</label>
                        <input
                          type="text"
                          value={leaveFormData.nationality}
                          onChange={(e) => setLeaveFormData({...leaveFormData, nationality: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nationality (English)</label>
                        <input
                          type="text"
                          value={leaveFormData.nationalityEn}
                          onChange={(e) => setLeaveFormData({...leaveFormData, nationalityEn: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">جهة العمل (عربي)</label>
                        <input
                          type="text"
                          value={leaveFormData.employer}
                          onChange={(e) => setLeaveFormData({...leaveFormData, employer: e.target.value})}
                          placeholder="اسم الشركة بالعربي"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Employer (English)</label>
                        <input
                          type="text"
                          value={leaveFormData.employerEn}
                          onChange={(e) => setLeaveFormData({...leaveFormData, employerEn: e.target.value})}
                          placeholder="Company Name in English"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ التنويم</label>
                        <input
                          type="date"
                          value={leaveFormData.admissionDate}
                          onChange={(e) => setLeaveFormData({...leaveFormData, admissionDate: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ الخروج</label>
                        <input
                          type="date"
                          value={leaveFormData.dischargeDate}
                          onChange={(e) => setLeaveFormData({...leaveFormData, dischargeDate: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">مسمى الطبيب (عربي)</label>
                        <input
                          type="text"
                          value={leaveFormData.doctorPosition}
                          onChange={(e) => setLeaveFormData({...leaveFormData, doctorPosition: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Position (English)</label>
                        <input
                          type="text"
                          value={leaveFormData.doctorPositionEn}
                          onChange={(e) => setLeaveFormData({...leaveFormData, doctorPositionEn: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full medical-gradient text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'إصدار الإجازة وتوليد QR'
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="leaves"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="text-medical-primary" size={20} />
                    سجل الإجازات المرضية
                  </h2>
                  <button
                    onClick={exportLeavesToCSV}
                    className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                  >
                    <Download size={18} />
                    تصدير CSV
                  </button>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">المريض</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">التاريخ</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">المدة</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">الطبيب</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-600">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {leaves.map((leave) => (
                          <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold">{leave.patientName}</div>
                              <div className="text-xs text-slate-400">رقم الهوية: {leave.patientId}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{leave.startDate}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{leave.duration} أيام</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{leave.doctorName}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => window.open(`/verify/${leave.id}`, '_blank')}
                                  className="text-medical-primary hover:underline text-sm font-bold flex items-center gap-1"
                                >
                                  <Download size={14} />
                                  عرض
                                </button>
                                <button
                                  onClick={() => setEditingLeave(leave)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="تعديل"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteLeave(leave.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {leaves.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                              لا يوجد إجازات مسجلة بعد
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Activity or Sidebar */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">إجراءات سريعة</h2>
          <div className="bg-medical-dark text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-4">تصدير التقارير</h3>
              <p className="text-slate-300 text-sm mb-6">تحميل تقارير مفصلة عن أداء النظام والإجازات الصادرة.</p>
              <div className="space-y-3">
                <button 
                  onClick={exportLeavesToCSV}
                  className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold transition-all border border-white/20 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  تقرير الإجازات
                </button>
                <button 
                  onClick={exportPatientsToCSV}
                  className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold transition-all border border-white/20 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  قائمة المرضى
                </button>
                <button 
                  onClick={exportDoctorsToCSV}
                  className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold transition-all border border-white/20 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  قائمة الأطباء
                </button>
              </div>
            </div>
            <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-medical-primary/20 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingSubscriptionDoctor && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="text-medical-primary" size={20} />
                  إدارة اشتراك الطبيب
                </h3>
                <button onClick={() => setEditingSubscriptionDoctor(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleUpdateSubscription} className="p-6 space-y-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">الطبيب:</p>
                  <p className="font-bold text-medical-dark">{editingSubscriptionDoctor.displayName}</p>
                  <p className="text-xs text-slate-400">{editingSubscriptionDoctor.email}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">خطة الاشتراك</label>
                    <select
                      value={subscriptionFormData.plan}
                      onChange={(e) => setSubscriptionFormData({...subscriptionFormData, plan: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                    >
                      <option value="free">مجاني (Free)</option>
                      <option value="pro">احترافي (Pro)</option>
                      <option value="enterprise">مؤسسات (Enterprise)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">حالة الاشتراك</label>
                    <select
                      value={subscriptionFormData.status}
                      onChange={(e) => setSubscriptionFormData({...subscriptionFormData, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                      <option value="trial">تجريبي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ انتهاء الاشتراك</label>
                    <input
                      type="date"
                      required
                      value={subscriptionFormData.expiryDate}
                      onChange={(e) => setSubscriptionFormData({...subscriptionFormData, expiryDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-medical-primary text-white py-3 rounded-xl font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-100 disabled:opacity-50"
                  >
                    {submitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSubscriptionDoctor(null)}
                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl relative"
          >
            <button 
              onClick={() => setShowAddDoctor(false)}
              className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold mb-6">إضافة طبيب جديد</h3>
            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div className="text-right">
                <label className="block text-sm font-semibold text-slate-700 mb-1">اسم الطبيب</label>
                <input
                  type="text"
                  required
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                  placeholder="الاسم الكامل"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary"
                />
              </div>
              <div className="text-right">
                <label className="block text-sm font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={newDoctor.email}
                  onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                  placeholder="doctor@hospital.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary"
                />
              </div>
              <div className="text-right">
                <label className="block text-sm font-semibold text-slate-700 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={newDoctor.password}
                  onChange={(e) => setNewDoctor({...newDoctor, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary"
                />
              </div>
              <div className="text-right">
                <label className="block text-sm font-semibold text-slate-700 mb-1">التخصص</label>
                <input
                  type="text"
                  required
                  value={newDoctor.specialization}
                  onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
                  placeholder="مثال: طب الأسرة"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary"
                />
              </div>
              <div className="text-right">
                <label className="block text-sm font-semibold text-slate-700 mb-1">رقم الموظف</label>
                <input
                  type="text"
                  required
                  value={newDoctor.employeeId}
                  onChange={(e) => setNewDoctor({...newDoctor, employeeId: e.target.value})}
                  placeholder="EMP-123"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary"
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full medical-gradient text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mt-6"
              >
                {submitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'إضافة الطبيب'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl relative"
          >
            <button 
              onClick={() => setEditingPatient(null)}
              className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold mb-6">تعديل بيانات المريض</h3>
            <form onSubmit={handleUpdatePatient} className="space-y-4">
              <div className="text-right">
                <label className="block text-sm font-semibold text-slate-700 mb-1">اسم المريض</label>
                <input
                  type="text"
                  required
                  value={editingPatient.name}
                  onChange={(e) => setEditingPatient({...editingPatient, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-medical-primary"
                />
              </div>
              <div className="text-right">
                <label className="block text-sm font-semibold text-slate-700 mb-1">رقم الهوية</label>
                <input
                  type="text"
                  required
                  value={editingPatient.id}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none cursor-not-allowed"
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full medical-gradient text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mt-6"
              >
                {submitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'حفظ التغييرات'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Leave Modal */}
      {editingLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl p-8 rounded-3xl shadow-2xl relative my-8"
          >
            <button 
              onClick={() => setEditingLeave(null)}
              className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold mb-6">تعديل الإجازة المرضية</h3>
            <form onSubmit={handleUpdateLeave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">اسم المريض (عربي)</label>
                  <input
                    type="text"
                    required
                    value={editingLeave.patientName}
                    onChange={(e) => setEditingLeave({...editingLeave, patientName: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Name (English)</label>
                  <input
                    type="text"
                    required
                    value={editingLeave.patientNameEn || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, patientNameEn: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">رقم الهوية / National ID</label>
                  <input
                    type="text"
                    required
                    value={editingLeave.patientId}
                    onChange={(e) => setEditingLeave({...editingLeave, patientId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">الجنسية (عربي)</label>
                  <input
                    type="text"
                    value={editingLeave.nationality || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, nationality: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nationality (English)</label>
                  <input
                    type="text"
                    value={editingLeave.nationalityEn || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, nationalityEn: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">جهة العمل (عربي)</label>
                  <input
                    type="text"
                    value={editingLeave.employer || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, employer: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Employer (English)</label>
                  <input
                    type="text"
                    value={editingLeave.employerEn || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, employerEn: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">الحالة</label>
                  <select
                    value={editingLeave.status}
                    onChange={(e) => setEditingLeave({...editingLeave, status: e.target.value as any})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  >
                    <option value="active">نشطة</option>
                    <option value="expired">منتهية</option>
                    <option value="cancelled">ملغاة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">التشخيص الطبي (عربي)</label>
                  <textarea
                    required
                    rows={2}
                    value={editingLeave.diagnosis}
                    onChange={(e) => setEditingLeave({...editingLeave, diagnosis: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none resize-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Diagnosis (English)</label>
                  <textarea
                    required
                    rows={2}
                    value={editingLeave.diagnosisEn || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, diagnosisEn: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ البدء</label>
                  <input
                    type="date"
                    required
                    value={editingLeave.startDate}
                    onChange={(e) => setEditingLeave({...editingLeave, startDate: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">المدة (أيام)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingLeave.duration}
                    onChange={(e) => setEditingLeave({...editingLeave, duration: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ التنويم</label>
                  <input
                    type="date"
                    value={editingLeave.admissionDate || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, admissionDate: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">تاريخ الخروج</label>
                  <input
                    type="date"
                    value={editingLeave.dischargeDate || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, dischargeDate: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">مسمى الطبيب (عربي)</label>
                  <input
                    type="text"
                    value={editingLeave.doctorPosition || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, doctorPosition: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Position (English)</label>
                  <input
                    type="text"
                    value={editingLeave.doctorPositionEn || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, doctorPositionEn: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">اسم الطبيب (عربي)</label>
                  <input
                    type="text"
                    value={editingLeave.doctorName}
                    onChange={(e) => setEditingLeave({...editingLeave, doctorName: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Doctor Name (English)</label>
                  <input
                    type="text"
                    value={editingLeave.doctorNameEn || ''}
                    onChange={(e) => setEditingLeave({...editingLeave, doctorNameEn: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full medical-gradient text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'حفظ التغييرات'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}

