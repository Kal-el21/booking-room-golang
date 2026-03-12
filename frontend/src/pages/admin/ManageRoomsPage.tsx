import { useRef, useState } from 'react';
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, useUploadRoomImage } from '@/hooks/useRooms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DoorOpen, Plus, Edit, Trash2, Search, Users, MapPin,
  Camera, Upload, ImageIcon, X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Room } from '@/types';

// Helper: build full image URL from relative path
const getRoomImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  return `${base}${imageUrl}`;
};

// Reusable image picker component for room dialogs
const RoomImagePicker = ({
  label,
  currentImageUrl,
  imagePreview,
  onFileChange,
  onClear,
}: {
  label: string;
  currentImageUrl?: string;
  imagePreview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displaySrc = imagePreview ?? getRoomImageUrl(currentImageUrl);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative w-full h-40 rounded-lg border-2 border-dashed border-border overflow-hidden bg-muted/40 group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {displaySrc ? (
          <>
            <img
              src={displaySrc}
              alt="Room preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-8 w-8 text-white" />
              <span className="ml-2 text-white text-sm font-medium">Change Photo</span>
            </div>
            {/* Clear button */}
            {imagePreview && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 z-10"
                title="Remove selected photo"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <ImageIcon className="h-10 w-10 opacity-50" />
            <span className="text-sm">Click to upload room photo</span>
            <span className="text-xs">JPG, PNG, WebP · Max 5MB</span>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
      <p className="text-xs text-muted-foreground">Optional. Helps users identify the room.</p>
    </div>
  );
};

export const ManageRoomsPage = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form data
  const [formData, setFormData] = useState({
    room_name: '',
    capacity: '',
    location: '',
    description: '',
    status: 'available' as 'available' | 'occupied' | 'maintenance',
  });

  // Image state for create dialog
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);

  // Image state for edit dialog
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { data: roomsData, isLoading } = useRooms({
    page: 1,
    page_size: 100,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
  });

  const { data: allRoomsData } = useRooms({ page: 1, page_size: 1000 });

  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();
  const uploadRoomImage = useUploadRoomImage();

  // ── Image file validation ────────────────────────────────────
  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPG, PNG, and WebP are allowed.');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return false;
    }
    return true;
  };

  const handleCreateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateImageFile(file)) return;
    setCreateImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCreateImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateImageFile(file)) return;
    setEditImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setEditImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Dialog handlers ──────────────────────────────────────────
  const handleCreateClick = () => {
    setFormData({ room_name: '', capacity: '', location: '', description: '', status: 'available' });
    setCreateImageFile(null);
    setCreateImagePreview(null);
    setCreateDialogOpen(true);
  };

  const handleEditClick = (room: Room) => {
    setSelectedRoom(room);
    setFormData({
      room_name: room.room_name,
      capacity: room.capacity.toString(),
      location: room.location,
      description: room.description || '',
      status: room.status,
    });
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (room: Room) => {
    setSelectedRoom(room);
    setDeleteDialogOpen(true);
  };

  // ── CRUD handlers ────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const newRoom = await createRoom.mutateAsync({
        room_name: formData.room_name,
        capacity: parseInt(formData.capacity),
        location: formData.location,
        description: formData.description || undefined,
        status: formData.status,
      });

      // Upload image if selected
      if (createImageFile && newRoom?.id) {
        try {
          await uploadRoomImage.mutateAsync({ id: newRoom.id, file: createImageFile });
        } catch {
          toast.warning('Room created but image upload failed. You can add it later via edit.');
        }
      }

      setCreateDialogOpen(false);
      setCreateImageFile(null);
      setCreateImagePreview(null);
    } catch {
      // Error handled in hook
    }
  };

  const handleUpdate = async () => {
    if (!selectedRoom) return;

    setIsUploadingImage(true);
    try {
      await updateRoom.mutateAsync({
        id: selectedRoom.id,
        data: {
          room_name: formData.room_name,
          capacity: parseInt(formData.capacity),
          location: formData.location,
          description: formData.description || undefined,
          status: formData.status,
        },
      });

      // Upload new image if selected
      if (editImageFile) {
        try {
          await uploadRoomImage.mutateAsync({ id: selectedRoom.id, file: editImageFile });
        } catch {
          toast.warning('Room updated but image upload failed.');
        }
      }

      setEditDialogOpen(false);
      setSelectedRoom(null);
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch {
      // Error handled in hook
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoom) return;
    try {
      await deleteRoom.mutateAsync(selectedRoom.id);
      setDeleteDialogOpen(false);
      setSelectedRoom(null);
    } catch {
      // Error handled in hook
    }
  };

  // ── Helpers ──────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    const config = {
      available: { variant: 'default' as const, label: 'Available' },
      occupied: { variant: 'secondary' as const, label: 'Occupied' },
      maintenance: { variant: 'destructive' as const, label: 'Maintenance' },
    };
    const { variant, label } = config[status as keyof typeof config] || config.available;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const isFormValid = formData.room_name && formData.capacity && formData.location;
  const isPending = createRoom.isPending || updateRoom.isPending || isUploadingImage;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const allRooms = allRoomsData?.data || [];
  const rooms = roomsData?.data || [];
  const filteredRooms = rooms.filter(
    (room) =>
      room.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Rooms</h2>
          <p className="text-muted-foreground">Create, edit, and manage meeting rooms</p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Rooms', value: allRooms.length },
          { label: 'Available', value: allRooms.filter((r) => r.status === 'available').length },
          { label: 'Occupied', value: allRooms.filter((r) => r.status === 'occupied').length },
          { label: 'Maintenance', value: allRooms.filter((r) => r.status === 'maintenance').length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DoorOpen className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchTerm ? 'Try adjusting your search term' : 'Get started by creating your first room'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateClick}>
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const imgUrl = getRoomImageUrl(room.image_url);
            return (
              <Card key={room.id} className="hover:shadow-md transition-shadow overflow-hidden">
                {/* Room Image */}
                {imgUrl ? (
                  <div className="w-full h-40 overflow-hidden bg-muted">
                    <img
                      src={imgUrl}
                      alt={room.room_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground opacity-40" />
                  </div>
                )}

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-base truncate">{room.room_name}</CardTitle>
                        {getStatusBadge(room.status)}
                      </div>
                      <CardDescription className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {room.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 flex-shrink-0" />
                          Capacity: {room.capacity}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {room.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(room)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(room)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create Dialog ──────────────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>Create a new meeting room in the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Room Image */}
            <RoomImagePicker
              label="Room Photo (Optional)"
              imagePreview={createImagePreview}
              onFileChange={handleCreateImageChange}
              onClear={() => { setCreateImageFile(null); setCreateImagePreview(null); }}
            />

            <div className="space-y-2">
              <Label htmlFor="create-name">Room Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g., Meeting Room A"
                value={formData.room_name}
                onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-capacity">Capacity *</Label>
              <Input
                id="create-capacity"
                type="number"
                placeholder="Number of people"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-location">Location *</Label>
              <Input
                id="create-location"
                placeholder="e.g., Floor 1, Building A"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="create-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description (Optional)</Label>
              <Textarea
                id="create-description"
                placeholder="Facilities, equipment, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!isFormValid || isPending}>
              {createRoom.isPending ? (
                <><Upload className="h-4 w-4 mr-2 animate-pulse" />Creating...</>
              ) : 'Create Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>Update room information and photo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Room Image */}
            <RoomImagePicker
              label="Room Photo"
              currentImageUrl={selectedRoom?.image_url}
              imagePreview={editImagePreview}
              onFileChange={handleEditImageChange}
              onClear={() => { setEditImageFile(null); setEditImagePreview(null); }}
            />
            {editImageFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="h-3 w-3" />
                New photo will be saved when you click Update Room.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-name">Room Name *</Label>
              <Input
                id="edit-name"
                value={formData.room_name}
                onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-capacity">Capacity *</Label>
              <Input
                id="edit-capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location *</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!isFormValid || isPending}>
              {isPending ? (
                <><Upload className="h-4 w-4 mr-2 animate-pulse" />Updating...</>
              ) : 'Update Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ──────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room?</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone. The room photo will also be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {selectedRoom && (
            <div className="rounded-lg border overflow-hidden my-4">
              {selectedRoom.image_url && (
                <img
                  src={getRoomImageUrl(selectedRoom.image_url)}
                  alt={selectedRoom.room_name}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="bg-muted p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DoorOpen className="h-4 w-4" />
                  <span className="font-medium">{selectedRoom.room_name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedRoom.location} · Capacity: {selectedRoom.capacity}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRoom.isPending}>
              {deleteRoom.isPending ? 'Deleting...' : 'Delete Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};