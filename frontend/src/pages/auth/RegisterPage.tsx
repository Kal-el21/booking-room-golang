import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Moon, ShieldCheck, Sun } from 'lucide-react';

/**
 * RegisterPage — DISABLED in LDAP/Active Directory mode.
 *
 * User accounts are created automatically the first time you log in with your
 * Active Directory credentials. Manual registration is not supported.
 *
 * If this route is accessed directly (e.g. someone bookmarked /register),
 * we auto-redirect to /login after a short delay.
 */
export const RegisterPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Auto-redirect to login after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => navigate('/login', { replace: true }), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      {/* Theme Toggle */}
      <Button variant="ghost" size="icon" onClick={toggleTheme} className="absolute top-4 right-4">
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <CalendarDays className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Pendaftaran Dinonaktifkan</CardTitle>
          <CardDescription>
            Sistem ini menggunakan Active Directory untuk manajemen akun
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Login menggunakan akun Active Directory
              </p>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-400 pl-6">
              Akun Anda akan dibuat secara otomatis saat pertama kali login menggunakan
              email dan password Active Directory perusahaan.
            </p>
          </div>

          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-sm font-medium">Belum bisa login?</p>
            <p className="text-sm text-muted-foreground">
              Pastikan akun Active Directory Anda sudah aktif, atau hubungi administrator
              IT untuk bantuan akses.
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Anda akan diarahkan ke halaman login dalam beberapa detik...
          </p>
        </CardContent>

{/* <<<<<<< HEAD
            <div className="space-y-2">
              <Label htmlFor="division">Division *</Label>
              <Input
                id="division"
                name="division"
                type="text"
                placeholder="e.g. IT, HR, Finance"
                value={formData.division}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registering...</>
              ) : (
                'Register'
              )}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
======= */}
        <CardFooter>
          <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Ke Halaman Login
          </Button>
        </CardFooter>
{/* >>>>>>> origin/LDAP */}
      </Card>
    </div>
  );
};