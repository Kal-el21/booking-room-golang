import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Moon, RotateCcw, Sun } from 'lucide-react';
import { authService } from '@/services/auth.service';
import type { UserRole } from '@/types';

interface LocationState {
  userId: number;
  email: string;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

const getDashboardPath = (role: UserRole | string) => {
  switch (role) {
    case 'GA':         return '/ga/dashboard';
    case 'room_admin': return '/admin/dashboard';
    default:           return '/user/dashboard';
  }
};

export const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const state = location.state as LocationState | null;

  // Guard: must arrive here from register page
  useEffect(() => {
    if (!state?.userId) {
      navigate('/register', { replace: true });
    }
  }, [state, navigate]);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const otp = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch; });
    setDigits(newDigits);

    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIdx = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH || !state?.userId) return;

    setIsVerifying(true);
    try {
      await authService.verifyEmail({ user_id: state.userId, code: otp });

      // refreshUser returns the fetched user so we can navigate immediately
      const verifiedUser = await refreshUser();
      toast.success('Email berhasil diverifikasi! Selamat datang 🎉');

      navigate(
        verifiedUser ? getDashboardPath(verifiedUser.role) : '/login',
        { replace: true },
      );
    } catch (err: any) {
      const message = err?.response?.data?.error ?? err?.response?.data?.message ?? 'Kode verifikasi tidak valid';
      toast.error(message);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!state?.userId || cooldown > 0) return;

    setIsResending(true);
    try {
      await authService.resendVerificationEmail(state.userId);
      toast.success('Kode verifikasi baru telah dikirim ke email Anda');
      setCooldown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'Gagal mengirim ulang kode verifikasi';
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = state?.email
    ? state.email.replace(/(.{2})(.+)(@.+)/, '$1***$3')
    : '***';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      {/* Theme toggle */}
      <Button variant="ghost" size="icon" onClick={toggleTheme} className="absolute top-4 right-4">
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <Mail className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Verifikasi Email</CardTitle>
          <CardDescription>
            Kami telah mengirimkan kode verifikasi ke{' '}
            <span className="font-medium text-foreground">{maskedEmail}</span>
            <br />
            <span className="text-xs">Silakan cek folder inbox atau spam.</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OTP digit inputs */}
          <div className="flex justify-center gap-2">
            {digits.map((digit, i) => (
              <Input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={isVerifying}
                className="w-12 h-12 text-center text-xl font-bold border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            ⏱ Kode berlaku selama <strong>5 menit</strong>
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleVerify}
            disabled={otp.length !== OTP_LENGTH || isVerifying}
          >
            {isVerifying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memverifikasi...</>
            ) : (
              'Verifikasi Email'
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
          >
            {isResending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</>
            ) : cooldown > 0 ? (
              `Kirim ulang dalam ${cooldown}s`
            ) : (
              <><RotateCcw className="mr-2 h-4 w-4" />Kirim ulang kode</>
            )}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Kembali ke halaman registrasi
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};