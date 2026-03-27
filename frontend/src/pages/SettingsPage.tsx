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
      toast.error('Invalid file type. Only JPG, PNG, and WebP are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 5MB.');
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
      toast.error('New passwords do not match');
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
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className={`grid w-full ${tabGridCols}`}>
          <TabsTrigger value="profile" className="flex items-center justify-center gap-1.5 px-2">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center justify-center gap-1.5 px-2">
            <Bell className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center justify-center gap-1.5 px-2">
            <Lock className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Security</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center justify-center gap-1.5 px-2">
            <Palette className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Appearance</span>
          </TabsTrigger>

          {/* ── Admin-only tab ── */}
          {isAdmin && (
            <TabsTrigger value="system" className="flex items-center justify-center gap-1.5 px-2">
              <Settings2 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">System</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Profile Tab ─────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your name, division, and profile photo</CardDescription>
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
                  Edit Profile
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
                    title="Change photo"
                  >
                    <Camera className="h-6 w-6 text-white" />
                    <span className="text-white text-[10px] mt-1 font-medium">Change</span>
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
                    Hover over the photo to change it · JPG, PNG, WebP · Max 5MB
                  </p>
                  {avatarFile && (
                    <p className="text-xs text-primary font-medium">
                      ✓ New photo selected — click Save Changes to apply
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={onUpdateProfile} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={isEditingProfile ? profileData.name : user.name}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                      readOnly={!isEditingProfile}
                      className={!isEditingProfile ? 'bg-muted' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={user.email} readOnly className="bg-muted opacity-70" />
                    <p className="text-[10px] text-muted-foreground italic">* Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="division">Division</Label>
                    <Input
                      id="division"
                      value={isEditingProfile ? profileData.division : (user.division || 'Not set')}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, division: e.target.value }))}
                      readOnly={!isEditingProfile}
                      className={!isEditingProfile ? 'bg-muted' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Created</Label>
                    <Input
                      value={new Date(user.created_at).toLocaleDateString('en-US', {
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
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateProfile.isPending}>
                      {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
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
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose when and how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Meeting Reminders
                </h4>
                {[
                  { key: 'notification_24h' as const, label: '24 Hours Before', desc: 'Receive a reminder 1 day before the meeting' },
                  { key: 'notification_3h'  as const, label: '3 Hours Before',  desc: 'Receive a reminder 3 hours before the meeting' },
                  { key: 'notification_30m' as const, label: '30 Minutes Before', desc: 'Receive a final reminder 30 minutes before the meeting' },
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
                  Communication Channels
                </h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive request updates and reminders via email
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
                  Save Preferences
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
                  <CardTitle>Two-Step Login (OTP)</CardTitle>
                </div>
                <CardDescription>
                  Add an extra layer of security. An OTP code is sent to your email every time you log in.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Login with Email OTP</p>
                    <p className="text-sm text-muted-foreground">
                      {prefs.otp_login_enabled
                        ? '🔒 Active — an OTP code is sent to your email on every login'
                        : '🔓 Inactive — log in directly with email & password'}
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
                      ⚠️ Make sure you have access to the email <strong>{user.email}</strong> to
                      receive the OTP code every time you log in.
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
                    Save Security Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onUpdatePassword} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input id="current_password" name="current_password" type="password"
                      value={passwordData.current_password} onChange={handlePasswordChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input id="new_password" name="new_password" type="password"
                      value={passwordData.new_password} onChange={handlePasswordChange} required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input id="confirm_password" name="confirm_password" type="password"
                      value={passwordData.confirm_password} onChange={handlePasswordChange} required />
                  </div>
                  <Button type="submit" disabled={changePassword.isPending} className="mt-2">
                    {changePassword.isPending
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Lock className="h-4 w-4 mr-2" />
                    }
                    Update Password
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
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look of the application for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Theme Mode</Label>
                <div className="grid grid-cols-3 gap-4 max-w-md">
                  <Button variant={theme === 'light' ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-4 gap-2" onClick={() => setTheme('light')}>
                    <Sun className="h-6 w-6" /><span>Light</span>
                  </Button>
                  <Button variant={theme === 'dark' ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-4 gap-2" onClick={() => setTheme('dark')}>
                    <Moon className="h-6 w-6" /><span>Dark</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col h-auto py-4 gap-2 opacity-50" disabled>
                    <Monitor className="h-6 w-6" /><span>System</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  * System theme automatically follows your device settings
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
                  <CardTitle>System Settings</CardTitle>
                </div>
                <CardDescription>
                  System-wide configuration that applies to all users. Only Admins can change these settings.
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
                        Registration
                      </h4>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">Email Verification on Registration</p>
                          <p className="text-sm text-muted-foreground">
                            When enabled, new users must verify their email with an
                            OTP code before the account is active and can be used to log in.
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
                          ℹ️ Make sure the SMTP configuration is correctly set on the server so OTP emails can be delivered.
                            Check the <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">SMTP_*</code> variables in your <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code> file.
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
                        Save System Settings
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