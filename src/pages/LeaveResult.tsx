import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { SickLeave } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Printer, CheckCircle2, AlertTriangle, Calendar, User, FileText, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../lib/utils';

export default function LeaveResult() {
  const { leaveId } = useParams();
  const [searchParams] = useSearchParams();
  const nationalId = searchParams.get('id');
  
  const [leave, setLeave] = useState<SickLeave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLeave();
  }, [leaveId]);

  const fetchLeave = async () => {
    if (!leaveId) return;
    setLoading(true);
    try {
      const data = await dataService.getLeaveById(leaveId);
      
      if (data) {
        // Verify national ID if provided
        if (nationalId && data.patientId !== nationalId) {
          setError('National ID does not match the leave records');
        } else {
          setLeave(data);
        }
      } else {
        setError('No sick leave found with this ID');
      }
    } catch (err) {
      console.error('Error fetching leave:', err);
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const [loadingPDF, setLoadingPDF] = useState(false);

  const downloadPDF = async () => {
    if (!certificateRef.current) {
      console.error('Certificate ref not found');
      return;
    }
    
    setLoadingPDF(true);
    try {
      // Wait a bit for any animations to settle
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: false, // Changed to false for better security/compatibility
        windowWidth: 850, // Ensure consistent width for capture
        onclone: (clonedDoc) => {
          // Ensure the cloned element is visible for capture
          const el = clonedDoc.getElementById('certificate-to-print');
          if (el) {
            el.style.display = 'block';
            el.style.margin = '0';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      
      let finalWidth = pdfWidth - 20; // 10mm margins
      let finalHeight = finalWidth / ratio;
      
      if (finalHeight > pdfHeight - 20) {
        finalHeight = pdfHeight - 20;
        finalWidth = finalHeight * ratio;
      }
      
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(`sick-leave-${leave?.leaveNumber || leave?.id || 'report'}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى استخدام خيار الطباعة كبديل.');
    } finally {
      setLoadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-medical-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center" dir="rtl">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-4">{error === 'National ID does not match the leave records' ? 'رقم الهوية لا يتطابق مع سجلات الإجازة' : error === 'No sick leave found with this ID' ? 'لم يتم العثور على إجازة مرضية بهذا الرقم' : 'حدث خطأ أثناء جلب البيانات'}</h1>
        <p className="text-slate-500 mb-8">يرجى التحقق من المعلومات المدخلة والمحاولة مرة أخرى.</p>
        <button
          onClick={() => window.history.back()}
          className="bg-medical-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg"
        >
          العودة
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-medical-dark">إجازة مرضية معتمدة</h1>
            <p className="text-slate-500">موثقة من النظام الطبي المركزي</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={downloadPDF}
            disabled={loadingPDF}
            className="flex items-center gap-2 bg-white text-slate-700 px-6 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {loadingPDF ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download size={20} />
            )}
            {loadingPDF ? 'جاري التحميل...' : 'تحميل PDF'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-medical-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-sky-600 transition-all shadow-md"
          >
            <Printer size={20} />
            طباعة
          </button>
        </div>
      </div>

      {/* Certificate Content */}
      <div className="overflow-x-auto pb-8 -mx-4 px-4 md:mx-0 md:px-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto"
        >
          <div
            ref={certificateRef}
            id="certificate-to-print"
            dir="ltr"
            className="p-6 md:p-10 rounded-none shadow-none border relative overflow-hidden print-container"
            style={{ 
              width: '800px', 
              minHeight: '1130px', 
              margin: '0 auto',
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              color: '#1e293b'
            }}
          >
            <div className="relative z-10 font-sans">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col items-center">
             <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3KZMrJQk9Hf0WKCMpDi28o_y7hSkHxEA96g&s w" width="120px"/>
         
            </div>
            
            <div className="flex flex-col items-center text-center">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNbgkPX1XSz0pmX2N2-ohqTVaz7br7ajZuQw&s" width="200px"/>
              <div className="text-md font-medium">Kingdom of Saudi Arabia</div>
              <div className="my-2">
                <div className="w-12 h-12 flex items-center justify-center" style={{ color: '#059669' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                    <path d="M12,2C12,2 10,6 10,10C10,14 12,18 12,18C12,18 14,14 14,10C14,6 12,2 12,2M12,20C12,20 8,18 6,18C4,18 2,20 2,20L12,22L22,20C22,20 20,18 18,18C16,18 12,20 12,20Z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full" style={{ color: '#cbd5e1' }}>
                <path d="M10,10 L90,10 L90,90 L10,90 Z" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M10,10 L90,90 M90,10 L10,90" stroke="currentColor" strokeWidth="1"/>
                <path d="M50,10 L50,90 M10,50 L90,50" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#0749bc' }}>تقرير إجازة مرضية</h1>
            <h2 className="text-xl font-bold" style={{ color: '#075985' }}>Sick Leave Report</h2>
          </div>

          {/* Report Table */}
          <div className="border rounded-lg overflow-hidden mb-10" style={{ borderColor: '#cbd5e1' }}>
            <table className="w-full border-collapse text-[12px]">
              <tbody>
                {/* Leave ID */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-left font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Leave ID</td>
                  <td colSpan={2} className="w-[60%] p-2 text-center font-bold" style={{ color: '#053588' }}>{leave?.leaveNumber || leave?.id.toUpperCase()}</td>
                  <td className="w-[20%] p-2 border-l text-right font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>رمز الإجازة</td>
                </tr>
                
                {/* Leave Duration - Highlighted */}
                <tr style={{ backgroundColor: '#0e2a5c', color: '#ffffff' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ borderColor: '#475569' }}>Leave Duration</td>
                  <td className="w-[30%] p-1 text-center font-bold border-r" style={{ borderColor: '#475569' }}>
                    {leave?.duration} day ( {leave?.startDate} to {leave?.endDate} )
                  </td>
                  <td className="w-[30%] p-1 text-center font-bold" dir="rtl">
                    {leave?.duration} يوم ( {leave?.startDate} إلى {leave?.endDate} )
                  </td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ borderColor: '#475569' }}>مدة الإجازة</td>
                </tr>

                {/* Admission Date */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Admission Date</td>
                  <td className="w-[30%] p-2 text-center border-r" style={{ borderColor: '#cbd5e1' }}>{leave?.admissionDate || leave?.startDate}</td>
                  <td className="w-[30%] p-2 text-center">{leave?.admissionDate || leave?.startDate}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>تاريخ الدخول</td>
                </tr>

                {/* Discharge Date */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Discharge Date</td>
                  <td className="w-[30%] p-2 text-center border-r" style={{ borderColor: '#cbd5e1' }}>{leave?.dischargeDate || leave?.startDate}</td>
                  <td className="w-[30%] p-2 text-center">{leave?.dischargeDate || leave?.startDate}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>تاريخ الخروج</td>
                </tr>

                {/* Issue Date */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Issue Date</td>
                  <td colSpan={2} className="w-[60%] p-2 text-center">{leave?.startDate}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>تاريخ إصدار التقرير</td>
                </tr>

                {/* Name */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Name</td>
                  <td className="w-[30%] p-2 text-center border-r font-bold" style={{ borderColor: '#cbd5e1' }}>{leave?.patientNameEn || leave?.patientName || '-'}</td>
                  <td className="w-[30%] p-2 text-center font-bold">{leave?.patientName}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>الاسم</td>
                </tr>

                {/* National ID */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>National ID / Iqama</td>
                  <td colSpan={2} className="w-[60%] p-2 text-center">{leave?.patientId}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>رقم الهوية / الإقامة</td>
                </tr>

                {/* Nationality */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Nationality</td>
                  <td className="w-[30%] p-2 text-center border-r" style={{ borderColor: '#cbd5e1' }}>{leave?.nationalityEn || leave?.nationality || '-'}</td>
                  <td className="w-[30%] p-2 text-center">{leave?.nationality}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>الجنسية</td>
                </tr>

                {/* Employer */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Employer</td>
                  <td className="w-[30%] p-2 text-center border-r" style={{ borderColor: '#cbd5e1' }}>{leave?.employerEn || leave?.employer || '-'}</td>
                  <td className="w-[30%] p-2 text-center" >{leave?.employer}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>جهة العمل</td>
                </tr>

                {/* Diagnosis */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Diagnosis</td>
                  <td className="w-[30%] p-2 text-center border-r" style={{ borderColor: '#cbd5e1' }}>{leave?.diagnosisEn || leave?.diagnosis || '-'}</td>
                  <td className="w-[30%] p-2 text-center font-bold">{leave?.diagnosis}</td>
                  <td className="w-[20%] p-2 border-l text-right font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>التشخيص</td>
                </tr>

                {/* Practitioner Name */}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Practitioner Name</td>
                  <td className="w-[30%] p-2 text-center border-r" style={{ borderColor: '#cbd5e1' }}>{leave?.doctorNameEn || leave?.doctorName || '-'}</td>
                  <td className="w-[30%] p-2 text-center font-bold">{leave?.doctorName}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>اسم الممارس</td>
                </tr>

                {/* Position */}
                <tr>
                  <td className="w-[20%] p-2 border-r text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>Position</td>
                  <td className="w-[30%] p-2 text-center border-r" style={{ borderColor: '#cbd5e1' }}>{leave?.doctorPositionEn || leave?.doctorPosition || '-'}</td>
                  <td className="w-[30%] p-2 text-center">{leave?.doctorPosition}</td>
                  <td className="w-[20%] p-2 border-l text-center font-bold" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>المسمى الوظيفي</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end mt-10">
            <div className="flex flex-col  items-center">
              <div className="bg-white p-2 border mb-2" style={{ borderColor: '#e2e8f0' }}>
                <QRCodeSVG 
                  value={leave?.qrCodeData || ''} 
                  size={100}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="text-[12px] text-left max-w-[250px] font-bold items-center text-center">
                <p className="text-center"><b>للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة الرسمي</b></p>
                <p className="mt-0  text-center">To check the report please visit Seha's official website</p>
                <p className="underline mt-1  text-center" style={{ color: '#2563eb' }}>www.seha.sa/#/inquiries/slenquiry</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2">
 
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: '#065f46' }}><img src="https://www.al-madina.com/uploads/images/2023/10/02/2230268.jpeg" width="200px"/> </div>
                 
                </div>
              </div>
              <div className="text-sm font-bold mb-1">مستشفى الملك سلمان</div>
              <div className="text-[10px] font-bold mb-1">king salman Hospital</div>
              
              <div className="flex items-center gap-2 mt-4">
             
               <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS13ho2mkYG1zVo8QSArhdZyoHuTst6nWdseg&s" width="90px"/>
                
              </div>
            </div>
          </div>

          <div className="mt-10 text-[10px] font-bold text-left" style={{ color: '#64748b' }}>
            <div>7:00 AM</div>
            <div>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div dir="rtl">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      </div>
      </motion.div>
    </div>
  </div>
);
}
