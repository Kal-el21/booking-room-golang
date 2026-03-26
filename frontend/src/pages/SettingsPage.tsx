import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useUpdatePreferences, useChangePassword, useUpdateProfile } from '@/hooks/useUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, Bell, Lock, Palette, Save, Loader2,
  Moon, Sun, Monitor, Edit2, Camera, ShieldCheck, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';

const getAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return undefined;
  if (avatar.startsWith('http')) return avatar;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  return `${base}${avatar}`;
};

export const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const updatePreferences = useUpdatePreferences();
  const changePassword = useChangePassword();
  const updateProfile = useUpdateProfile();

  const isAdmin = user?.role === 'room_admin';

  // ── System settings (admin only) ─────────────────────────────
  const { data: systemSettings, isLoading: isLoadingSystemSettings } = useSystemSettings();
  const updateSystemSettings = useUpdateSystemSettings();
  const [sysPrefs, setSysPrefs] = useState({
    email_verification_enabled: false,
  });

  // Sync sysPrefs once the query resolves
  useEffect(() => {
    if (systemSettings) {
      setSysPrefs({ email_verification_enabled: systemSettings.email_verification_enabled });
    }
  }, [systemSettings]);

  const onSaveSystemSettings = async () => {
    try {
      await updateSystemSettings.mutateAsync(sysPrefs);
    } catch {
      // Error handled by hook
    }
  };

  // ── Avatar / profile edit state ──────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    division: user?.division || '',
  });

  // ── Password state ───────────────────────────────────────────
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // ── User preferences state ───────────────────────────────────
  const [prefs, setPrefs] = useState({
    notification_24h:    user?.preferences?.notification_24h    ?? true,
    notification_3h:     user?.preferences?.notification_3h     ?? true,
    notification_30m:    user?.preferences?.notification_30m    ?? true,
    email_notifications: user?.preferences?.email_notifications ?? false,
    otp_login_enabled:   user?.preferences?.otp_login_enabled   ?? false,
  });

  // ── Avatar file picker ───────────────────────────────────────
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Tipe file tidak valid. Hanya JPG, PNG, dan WebP yang diizinkan.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File terlalu besar. Ukuran maksimal 5MB.');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    if (!isEditingProfile) {
      setIsEditingProfile(true);
      setProfileData({ name: user?.name || '', division: user?.division || '' });
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setProfileData({ name: user?.name || '', division: user?.division || '' });
  };

  const onUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        name: profileData.name,
        division: profileData.division,
        avatar: avatarFile ?? undefined,
      });
      await refreshUser();
      setIsEditingProfile(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // Error handled by hook
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const onUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Password baru tidak cocok');
      return;
    }
    try {
      await changePassword.mutateAsync({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch {
      // Error handled by hook
    }
  };

  const onUpdatePreferences = async () => {
    try {
      await updatePreferences.mutateAsync(prefs);
    } catch {
      // Error handled by hook
    }
  };

  if (!user) return null;

  const displayAvatar = avatarPreview ?? getAvatarUrl(user.avatar);

  // Tab count: 4 for regular users, 5 for admin (+ System tab)
  const tabGridCols = isAdmin ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pengaturan</h2>
        <p className="text-muted-foreground">Kelola pengaturan akun dan preferensi Anda</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className={`grid w-full ${tabGridCols}`}>
          <TabsTrigger value="profile" className="flex items-center justify-center gap-1.5 px-2">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center justify-center gap-1.5 px-2">
            <Bell className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center justify-center gap-1.5 px-2">
            <Lock className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Keamanan</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center justify-center gap-1.5 px-2">
            <Palette className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Tampilan</span>
          </TabsTrigger>

          {/* ── Admin-only tab ── */}
          {isAdmin && (
            <TabsTrigger value="system" className="flex items-center justify-center gap-1.5 px-2">
              <Settings2 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Sistem</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Profile Tab ─────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Informasi Profil</CardTitle>
                <CardDescription>Perbarui nama, divisi, dan foto profil Anda</CardDescription>
              </div>
              {!isEditingProfile && !avatarFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingProfile(true);
                    setProfileData({ name: user.name, division: user.division || '' });
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profil
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-start gap-5">
                <div className="relative group flex-shrink-0">
                  <Avatar className="h-24 w-24 ring-2 ring-border">
                    <AvatarImage src={displayAvatar} alt={user.name} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Ganti foto"
                  >
                    <Camera className="h-6 w-6 text-white" />
                    <span className="text-white text-[10px] mt-1 font-medium">Ganti</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-xl font-bold leading-tight">{user.name}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{user.role}</Badge>
                    {user.division && <Badge variant="secondary">{user.division}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Arahkan kursor ke foto untuk mengganti · JPG, PNG, WebP · Maks 5MB
                  </p>
                  {avatarFile && (
                    <p className="text-xs text-primary font-medium">
                      ✓ Foto baru dipilih — klik Simpan Perubahan untuk menerapkan
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={onUpdateProfile} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={isEditingProfile ? profileData.name : user.name}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                      readOnly={!isEditingProfile}
                      className={!isEditingProfile ? 'bg-muted' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Alamat Email</Label>
                    <Input value={user.email} readOnly className="bg-muted opacity-70" />
                    <p className="text-[10px] text-muted-foreground italic">* Email tidak dapat diubah</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="division">Divisi</Label>
                    <Input
                      id="division"
                      value={isEditingProfile ? profileData.division : (user.division || 'Belum ditentukan')}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, division: e.target.value }))}
                      readOnly={!isEditingProfile}
                      className={!isEditingProfile ? 'bg-muted' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Akun Dibuat</Label>
                    <Input
                      value={new Date(user.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      readOnly
                      className="bg-muted opacity-70"
                    />
                  </div>
                </div>

                {(isEditingProfile || avatarFile) && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={handleCancelEdit} disabled={updateProfile.isPending}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={updateProfile.isPending}>
                      {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Simpan Perubahan
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ──────────────────────────────── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferensi Notifikasi</CardTitle>
              <CardDescription>Pilih kapan dan bagaimana Anda ingin diberitahu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Pengingat Rapat
                </h4>
                {[
                  { key: 'notification_24h' as const, label: '24 Jam Sebelumnya', desc: 'Terima pengingat 1 hari sebelum rapat' },
                  { key: 'notification_3h'  as const, label: '3 Jam Sebelumnya',  desc: 'Terima pengingat 3 jam sebelum rapat' },
                  { key: 'notification_30m' as const, label: '30 Menit Sebelumnya', desc: 'Terima pengingat terakhir 30 menit sebelum rapat' },
                ].map(({ key, label, desc }, i) => (
                  <div key={key} className={`flex items-center justify-between ${i > 0 ? 'border-t pt-4' : ''}`}>
                    <div className="space-y-0.5">
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={prefs[key]}
                      onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, [key]: checked }))}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t pt-6">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Saluran Komunikasi
                </h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifikasi Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Terima pembaruan permintaan dan pengingat melalui email
                    </p>
                  </div>
                  <Switch
                    checked={prefs.email_notifications}
                    onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, email_notifications: checked }))}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={onUpdatePreferences} disabled={updatePreferences.isPending}>
                  {updatePreferences.isPending
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Save className="h-4 w-4 mr-2" />
                  }
                  Simpan Preferensi
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ──────────────────────────────────── */}
        <TabsContent value="security">
          <div className="space-y-6">
            {/* OTP Login Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <CardTitle>Login Dua Langkah (OTP)</CardTitle>
                </div>
                <CardDescription>
                  Tambahkan lapisan keamanan ekstra. Kode OTP dikirim ke email Anda setiap kali login.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Login dengan OTP Email</p>
                    <p className="text-sm text-muted-foreground">
                      {prefs.otp_login_enabled
                        ? '🔒 Aktif — kode OTP dikirim ke email setiap login'
                        : '🔓 Nonaktif — login langsung dengan email & password'}
                    </p>
                  </div>
                  <Switch
                    checked={prefs.otp_login_enabled}
                    onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, otp_login_enabled: checked }))}
                  />
                </div>

                {prefs.otp_login_enabled && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      ⚠️ Pastikan Anda memiliki akses ke email <strong>{user.email}</strong> agar
                      dapat menerima kode OTP setiap kali login.
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={onUpdatePreferences}
                    disabled={updatePreferences.isPending}
                    variant={prefs.otp_login_enabled ? 'default' : 'outline'}
                  >
                    {updatePreferences.isPending
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Save className="h-4 w-4 mr-2" />
                    }
                    Simpan Pengaturan Keamanan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card>
              <CardHeader>
                <CardTitle>Ubah Password</CardTitle>
                <CardDescription>Perbarui password Anda untuk menjaga keamanan akun</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onUpdatePassword} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Password Saat Ini</Label>
                    <Input id="current_password" name="current_password" type="password"
                      value={passwordData.current_password} onChange={handlePasswordChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Password Baru</Label>
                    <Input id="new_password" name="new_password" type="password"
                      value={passwordData.new_password} onChange={handlePasswordChange} required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
                    <Input id="confirm_password" name="confirm_password" type="password"
                      value={passwordData.confirm_password} onChange={handlePasswordChange} required />
                  </div>
                  <Button type="submit" disabled={changePassword.isPending} className="mt-2">
                    {changePassword.isPending
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Lock className="h-4 w-4 mr-2" />
                    }
                    Perbarui Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Appearance Tab ────────────────────────────────── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Tampilan</CardTitle>
              <CardDescription>Sesuaikan tampilan aplikasi untuk Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Mode Tema</Label>
                <div className="grid grid-cols-3 gap-4 max-w-md">
                  <Button variant={theme === 'light' ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-4 gap-2" onClick={() => setTheme('light')}>
                    <Sun className="h-6 w-6" /><span>Terang</span>
                  </Button>
                  <Button variant={theme === 'dark' ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-4 gap-2" onClick={() => setTheme('dark')}>
                    <Moon className="h-6 w-6" /><span>Gelap</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col h-auto py-4 gap-2 opacity-50" disabled>
                    <Monitor className="h-6 w-6" /><span>Sistem</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  * Tema sistem secara otomatis menyesuaikan pengaturan perangkat Anda
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── System Tab (room_admin only) ───────────────────── */}
        {isAdmin && (
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <CardTitle>Pengaturan Sistem</CardTitle>
                </div>
                <CardDescription>
                  Konfigurasi sistem yang berlaku untuk semua pengguna. Hanya Admin yang dapat mengubah ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingSystemSettings ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-10 w-32 ml-auto" />
                  </div>
                ) : (
                  <>
                    {/* Email Verification Toggle */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Registrasi
                      </h4>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">Verifikasi Email saat Registrasi</p>
                          <p className="text-sm text-muted-foreground">
                            Jika aktif, pengguna baru harus memverifikasi email mereka dengan
                            kode OTP sebelum akun aktif dan bisa digunakan untuk login.
                          </p>
                        </div>
                        <Switch
                          checked={sysPrefs.email_verification_enabled}
                          onCheckedChange={(checked) =>
                            setSysPrefs((prev) => ({ ...prev, email_verification_enabled: checked }))
                          }
                        />
                      </div>

                      {sysPrefs.email_verification_enabled && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                          <p className="text-xs text-blue-800 dark:text-blue-300">
                            ℹ️ Pastikan konfigurasi SMTP sudah benar di server agar email OTP dapat terkirim.
                            Cek variabel <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">SMTP_*</code> di file <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code>.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        onClick={onSaveSystemSettings}
                        disabled={updateSystemSettings.isPending}
                      >
                        {updateSystemSettings.isPending
                          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          : <Save className="h-4 w-4 mr-2" />
                        }
                        Simpan Pengaturan Sistem
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};