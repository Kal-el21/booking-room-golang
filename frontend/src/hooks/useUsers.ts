import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, type UserFilters } from '@/services/user.service';
import { toast } from 'sonner';

export const useUsers = (filters?: UserFilters) => {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => userService.getUsers(filters),
  });
};

export const useUser = (id: number) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUserById(id),
    enabled: !!id,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error.message || 'Gagal memperbarui user');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error.message || 'Gagal menghapus user');
    },
  });
};

export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success('Preferensi berhasil disimpan');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error.message || 'Gagal menyimpan preferensi');
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success('Profil berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error.message || 'Gagal memperbarui profil');
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: userService.changePassword,
    onSuccess: () => {
      toast.success('Password berhasil diubah');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error.message || 'Gagal mengubah password');
    },
  });
};