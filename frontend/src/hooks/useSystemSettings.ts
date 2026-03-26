import { systemSettingService, type SystemSettings } from '@/services/system.setting,service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/** Fetch system settings — only room_admin should call this. */
export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: () => systemSettingService.getSettings(),
    // Don't throw errors visibly — callers guard by role anyway
    retry: false,
  });
};

/** Persist system settings changes. */
export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SystemSettings>) =>
      systemSettingService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Pengaturan sistem berhasil disimpan');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
        error.message ||
        'Gagal menyimpan pengaturan sistem',
      );
    },
  });
};