import { useRef, useState } from 'react';
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
import {
  User, Bell, Lock, Palette, Save, Loader2,
  Moon, Sun, Monitor, Edit2, Camera,
} from 'lucide-react';
import { toast } from 'sonner';

// Build full URL from a relative path like /uploads/users/filename.jpg
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
  // useUpdateProfile must call userService.updateMyProfile({ name, division, avatar })
  const updateProfile = useUpdateProfile();

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

  // ── Preferences state ────────────────────────────────────────
  const [prefs, setPrefs] = useState({
    notification_24h: user?.preferences?.notification_24h ?? true,
    notification_3h: user?.preferences?.notification_3h ?? true,
    notification_30m: user?.preferences?.notification_30m ?? true,
    email_notifications: user?.preferences?.email_notifications ?? true,
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
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Auto-enter edit mode so user can adjust name/division and save all at once
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

  // ── Save profile: name + division + optional avatar in ONE request ──
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

  // ── Password handler ─────────────────────────────────────────
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

  // ── Preferences handler ──────────────────────────────────────
  const onUpdatePreferences = async () => {
    try {
      await updatePreferences.mutateAsync(prefs);
    } catch {
      // Error handled by hook
    }
  };

  if (!user) return null;

  const displayAvatar = avatarPreview ?? getAvatarUrl(user.avatar);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid md:grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden md:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden md:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden md:inline">Appearance</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ─────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your name, division, and profile photo
                </CardDescription>
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
              {/* Avatar + info */}
              <div className="flex items-start gap-5">
                {/* Avatar with camera hover overlay */}
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
                    Hover photo to change · JPG, PNG, WebP · Max 5MB
                  </p>
                  {avatarFile && (
                    <p className="text-xs text-primary font-medium">
                      ✓ New photo selected — click Save Changes to apply
                    </p>
                  )}
                </div>
              </div>

              {/* Profile form */}
              <form onSubmit={onUpdateProfile} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={isEditingProfile ? profileData.name : user.name}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      readOnly={!isEditingProfile}
                      className={!isEditingProfile ? 'bg-muted' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={user.email} readOnly className="bg-muted opacity-70" />
                    <p className="text-[10px] text-muted-foreground italic">
                      * Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="division">Division</Label>
                    <Input
                      id="division"
                      value={
                        isEditingProfile
                          ? profileData.division
                          : user.division || 'Not assigned'
                      }
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, division: e.target.value }))
                      }
                      readOnly={!isEditingProfile}
                      className={!isEditingProfile ? 'bg-muted' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Created</Label>
                    <Input
                      value={new Date(user.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      readOnly
                      className="bg-muted opacity-70"
                    />
                  </div>
                </div>

                {/* Action buttons — visible when editing text or a photo is queued */}
                {(isEditingProfile || avatarFile) && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={updateProfile.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateProfile.isPending}>
                      {updateProfile.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
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
                <h4 className="text-sm font-medium">Meeting Reminders</h4>
                {[
                  { key: 'notification_24h' as const, label: '24 Hours Before', desc: 'Receive a reminder 1 day before your meeting' },
                  { key: 'notification_3h' as const, label: '3 Hours Before', desc: 'Receive a reminder 3 hours before your meeting' },
                  { key: 'notification_30m' as const, label: '30 Minutes Before', desc: 'Receive a final reminder 30 minutes before your meeting' },
                ].map(({ key, label, desc }, i) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between ${i > 0 ? 'border-t pt-4' : ''}`}
                  >
                    <div className="space-y-0.5">
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={prefs[key]}
                      onCheckedChange={(checked) =>
                        setPrefs((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t pt-6">
                <h4 className="text-sm font-medium">Communication Channels</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive request updates and reminders via email
                    </p>
                  </div>
                  <Switch
                    checked={prefs.email_notifications}
                    onCheckedChange={(checked) =>
                      setPrefs((prev) => ({ ...prev, email_notifications: checked }))
                    }
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={onUpdatePreferences} disabled={updatePreferences.isPending}>
                  {updatePreferences.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ──────────────────────────────────── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onUpdatePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    name="current_password"
                    type="password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    name="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <Button type="submit" disabled={changePassword.isPending} className="mt-2">
                  {changePassword.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance Tab ────────────────────────────────── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how the application looks for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Theme Mode</Label>
                <div className="grid grid-cols-3 gap-4 max-w-md">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-6 w-6" />
                    <span>Light</span>
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-6 w-6" />
                    <span>Dark</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4 gap-2 opacity-50"
                    disabled
                  >
                    <Monitor className="h-6 w-6" />
                    <span>System</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  * System theme automatically matches your device settings
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};