import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { LogOut, User, Activity, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
}

export default function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    authService.logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
         

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-slate-600 mr-4">
                  <User size={18} />
                  <span className="text-sm font-medium">{user.displayName}</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">
                    {user.role === 'admin' ? 'مدير' : 'طبيب'}
                  </span>
                </div>
                
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-slate-600 hover:text-medical-primary transition-colors">
                    <ShieldCheck size={20} />
                  </Link>
                )}
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-all"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium hidden sm:block">تسجيل الخروج</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  state={{ isLogin: true }}
                  className="text-medical-primary font-bold hover:text-sky-600 transition-colors"
                >
                  تسجيل دخول
                </Link>
                <Link
                  to="/login"
                  state={{ isLogin: false }}
                  className="bg-medical-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-sky-600 transition-all shadow-md"
                >
                  إنشاء حساب جديد
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
