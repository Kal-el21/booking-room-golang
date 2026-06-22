import { useRef, useState } from 'react';
import { useCars, useCreateCar, useUpdateCar, useDeleteCar, useUploadCarImage } from '@/hooks/useCars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Car as CarIcon, Plus, Edit, Trash2, Search, Users, MapPin,
  Camera, Upload, ImageIcon, X, Fuel, Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Car, CreateCarInput, CarFilters } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build full image URL from a relative backend path */
const getCarImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  return `${base}${imageUrl}`;
};

// ─── Reusable Image Picker ─────────────────────────────────────────────────────

interface CarImagePickerProps {
  label: string;
  currentImageUrl?: string;
  imagePreview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const CarImagePicker = ({ label, currentImageUrl, imagePreview, onFileChange, onClear }: CarImagePickerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displaySrc = imagePreview ?? getCarImageUrl(currentImageUrl);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className="relative w-full h-40 rounded-lg border-2 border-dashed border-border overflow-hidden bg-muted/40 group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {displaySrc ? (
          <>
            <img src={displaySrc} alt="Car preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-8 w-8 text-white" />
              <span className="ml-2 text-white text-sm font-medium">Change Photo</span>
            </div>
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
            <span className="text-sm">Click to upload car photo</span>
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
      <p className="text-xs text-muted-foreground">Optional. Helps users identify the vehicle.</p>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────────

export const ManageCarsPage = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    car_name: '',
    plate_number: '',
    brand: '',
    model: '',
    vehicle_type: '',
    transmission: '',
    fuel_type: '',
    capacity: '',
    location: '',
    description: '',
    status: 'available' as 'available' | 'occupied' | 'maintenance',
    is_active: true,
  });

  // Image state
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────

  const { data: carsData, isLoading } = useCars({
    page: 1,
    page_size: 100,
    status: statusFilter !== 'all' ? (statusFilter as CarFilters['status']) : undefined,
  } as CarFilters);

  const { data: allCarsData } = useCars({ page: 1, page_size: 1000 } as CarFilters);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createCar = useCreateCar();
  const updateCar = useUpdateCar();
  const deleteCar = useDeleteCar();
  const uploadCarImage = useUploadCarImage();

  // ── Image validation ────────────────────────────────────────────────────────

  const validateImageFile = (file: File): boolean => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
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

  // ── Dialog handlers ─────────────────────────────────────────────────────────

  const handleCreateClick = () => {
    setFormData({
      car_name: '', plate_number: '', brand: '', model: '', vehicle_type: '',
      transmission: '', fuel_type: '', capacity: '', location: '',
      description: '', status: 'available', is_active: true,
    });
    setCreateImageFile(null);
    setCreateImagePreview(null);
    setCreateDialogOpen(true);
  };

  const handleEditClick = (car: Car) => {
    setSelectedCar(car);
    setFormData({
      car_name: car.car_name,
      plate_number: car.plate_number || '',
      brand: car.brand || '',
      model: car.model || '',
      vehicle_type: car.vehicle_type || '',
      transmission: car.transmission || '',
      fuel_type: car.fuel_type || '',
      capacity: car.capacity.toString(),
      location: car.location || '',
      description: car.description || '',
      status: car.status,
      is_active: car.is_active,
    });
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (car: Car) => {
    setSelectedCar(car);
    setDeleteDialogOpen(true);
  };

  // ── CRUD handlers ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    try {
      const newCar = await createCar.mutateAsync({
        car_name: formData.car_name,
        plate_number: formData.plate_number || undefined,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        vehicle_type: formData.vehicle_type || undefined,
        transmission: formData.transmission || undefined,
        fuel_type: formData.fuel_type || undefined,
        capacity: parseInt(formData.capacity),
        location: formData.location || undefined,
        description: formData.description || undefined,
        is_active: formData.is_active,
      });

      if (createImageFile && newCar?.id) {
        try {
          await uploadCarImage.mutateAsync({ id: newCar.id, file: createImageFile });
        } catch {
          toast.warning('Car created but image upload failed. You can add it later via edit.');
        }
      }

      toast.success('Car created successfully');
      setCreateDialogOpen(false);
      setCreateImageFile(null);
      setCreateImagePreview(null);
    } catch {
      toast.error('Failed to create car');
    }
  };

  const handleUpdate = async () => {
    if (!selectedCar) return;
    setIsUploadingImage(true);
    try {
      await updateCar.mutateAsync({
        id: selectedCar.id,
        data: {
          car_name: formData.car_name,
          plate_number: formData.plate_number || undefined,
          brand: formData.brand || undefined,
          model: formData.model || undefined,
          vehicle_type: formData.vehicle_type || undefined,
          transmission: formData.transmission || undefined,
          fuel_type: formData.fuel_type || undefined,
          capacity: parseInt(formData.capacity),
          location: formData.location || undefined,
          description: formData.description || undefined,
          status: formData.status,
          is_active: formData.is_active,
        },
      });

      if (editImageFile) {
        try {
          await uploadCarImage.mutateAsync({ id: selectedCar.id, file: editImageFile });
        } catch {
          toast.warning('Car updated but image upload failed.');
        }
      }

      toast.success('Car updated successfully');
      setEditDialogOpen(false);
      setSelectedCar(null);
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch {
      toast.error('Failed to update car');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCar) return;
    try {
      await deleteCar.mutateAsync(selectedCar.id);
      toast.success('Car deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedCar(null);
    } catch {
      toast.error('Failed to delete car');
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const config = {
      available: { variant: 'default' as const, label: 'Available' },
      occupied: { variant: 'secondary' as const, label: 'Occupied' },
      maintenance: { variant: 'destructive' as const, label: 'Maintenance' },
    };
    const { variant, label } = config[status as keyof typeof config] || config.available;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const isFormValid = formData.car_name && formData.capacity;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const allCars = allCarsData?.data || [];
  const cars = carsData?.data || [];

  const filteredCars = cars.filter((car) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      car.car_name.toLowerCase().includes(term) ||
      (car.plate_number || '').toLowerCase().includes(term) ||
      (car.brand || '').toLowerCase().includes(term) ||
      (car.model || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || car.status === statusFilter;
    const matchesActive = !activeOnly || car.is_active;
    return matchesSearch && matchesStatus && matchesActive;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Cars</h2>
          <p className="text-muted-foreground">Create, edit, and manage fleet vehicles</p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Car
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, plate, brand, model..."
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
            <div className="flex items-end gap-2 pb-2">
              <Switch
                id="active-only"
                checked={activeOnly}
                onCheckedChange={setActiveOnly}
              />
              <Label htmlFor="active-only" className="cursor-pointer">Active only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: 'Total Cars', value: allCars.length },
          { label: 'Available', value: allCars.filter((c) => c.status === 'available').length },
          { label: 'Occupied', value: allCars.filter((c) => c.status === 'occupied').length },
          { label: 'Maintenance', value: allCars.filter((c) => c.status === 'maintenance').length },
          { label: 'Active', value: allCars.filter((c) => c.is_active).length },
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

      {/* Cars Grid */}
      {filteredCars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CarIcon className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No cars found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchTerm ? 'Try adjusting your search term' : 'Get started by adding your first vehicle'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateClick}>
                <Plus className="h-4 w-4 mr-2" />
                Add Car
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCars.map((car) => {
            const imgUrl = getCarImageUrl(car.image_url);
            return (
              <Card key={car.id} className="hover:shadow-md transition-shadow overflow-hidden">
                {/* Car Image */}
                {imgUrl ? (
                  <div className="w-full h-40 overflow-hidden bg-muted">
                    <img
                      src={imgUrl}
                      alt={car.car_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center">
                    <CarIcon className="h-10 w-10 text-muted-foreground opacity-40" />
                  </div>
                )}

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-base truncate">{car.car_name}</CardTitle>
                        {getStatusBadge(car.status)}
                        {!car.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription className="flex flex-col gap-1 text-xs">
                        {car.plate_number && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {car.plate_number}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 flex-shrink-0" />
                          {car.capacity} seats
                        </span>
                        {car.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {car.location}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-1">
                  {/* Specs row */}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {car.brand && <span>{car.brand}</span>}
                    {car.model && <span>{car.model}</span>}
                    {car.vehicle_type && <span>· {car.vehicle_type}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {car.transmission && <span>{car.transmission}</span>}
                    {car.fuel_type && (
                      <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />{car.fuel_type}</span>
                    )}
                    {car.current_odometer != null && (
                      <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{car.current_odometer.toLocaleString()} km</span>
                    )}
                  </div>

                  {car.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{car.description}</p>
                  )}

                  <div className="flex gap-2 justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(car)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(car)}>
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

      {/* ── Create Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Car</DialogTitle>
            <DialogDescription>Register a new vehicle in the fleet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Car Image */}
            <CarImagePicker
              label="Car Photo (Optional)"
              imagePreview={createImagePreview}
              onFileChange={handleCreateImageChange}
              onClear={() => { setCreateImageFile(null); setCreateImagePreview(null); }}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-car_name">Car Name *</Label>
                <Input
                  id="create-car_name"
                  placeholder="e.g., Toyota Avanza"
                  value={formData.car_name}
                  onChange={(e) => setFormData({ ...formData, car_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-plate_number">Plate Number</Label>
                <Input
                  id="create-plate_number"
                  placeholder="e.g., B 1234 XYZ"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-brand">Brand</Label>
                <Input
                  id="create-brand"
                  placeholder="e.g., Toyota"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-model">Model</Label>
                <Input
                  id="create-model"
                  placeholder="e.g., Avanza Veloz"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-vehicle_type">Vehicle Type</Label>
                <Input
                  id="create-vehicle_type"
                  placeholder="e.g., MPV, Sedan, SUV"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-capacity">Seats *</Label>
                <Input
                  id="create-capacity"
                  type="number"
                  placeholder="e.g., 7"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-transmission">Transmission</Label>
                <Select
                  value={formData.transmission}
                  onValueChange={(v) => setFormData({ ...formData, transmission: v })}
                >
                  <SelectTrigger id="create-transmission"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic">Automatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-fuel_type">Fuel Type</Label>
                <Input
                  id="create-fuel_type"
                  placeholder="e.g., Gasoline, Diesel, Electric"
                  value={formData.fuel_type}
                  onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-location">Location</Label>
              <Input
                id="create-location"
                placeholder="e.g., Floor 1, Parking Lot A"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as CreateCarInput['status'] })}
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
                placeholder="Notes about this vehicle..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!isFormValid || createCar.isPending}>
              {createCar.isPending ? (
                <><Upload className="h-4 w-4 mr-2 animate-pulse" />Creating…</>
              ) : 'Create Car'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Car</DialogTitle>
            <DialogDescription>Update vehicle information and photo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Car Image */}
            <CarImagePicker
              label="Car Photo"
              currentImageUrl={selectedCar?.image_url}
              imagePreview={editImagePreview}
              onFileChange={handleEditImageChange}
              onClear={() => { setEditImageFile(null); setEditImagePreview(null); }}
            />
            {editImageFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="h-3 w-3" />
                New photo will be saved when you click Update Car.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-car_name">Car Name *</Label>
                <Input
                  id="edit-car_name"
                  value={formData.car_name}
                  onChange={(e) => setFormData({ ...formData, car_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plate_number">Plate Number</Label>
                <Input
                  id="edit-plate_number"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Brand</Label>
                <Input
                  id="edit-brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Model</Label>
                <Input
                  id="edit-model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-vehicle_type">Vehicle Type</Label>
                <Input
                  id="edit-vehicle_type"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Seats *</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-transmission">Transmission</Label>
                <Select
                  value={formData.transmission}
                  onValueChange={(v) => setFormData({ ...formData, transmission: v })}
                >
                  <SelectTrigger id="edit-transmission"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic">Automatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fuel_type">Fuel Type</Label>
                <Input
                  id="edit-fuel_type"
                  value={formData.fuel_type}
                  onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as 'available' | 'occupied' | 'maintenance' })}
                >
                  <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3 pb-2">
                <Switch
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit-is_active" className="cursor-pointer">Active</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!isFormValid || isUploadingImage}>
              {isUploadingImage ? (
                <><Upload className="h-4 w-4 mr-2 animate-pulse" />Updating…</>
              ) : 'Update Car'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Car?</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone. The car photo will also be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {selectedCar && (
            <div className="rounded-lg border overflow-hidden my-4">
              {selectedCar.image_url && (
                <img
                  src={getCarImageUrl(selectedCar.image_url)}
                  alt={selectedCar.car_name}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="bg-muted p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CarIcon className="h-4 w-4" />
                  <span className="font-medium">{selectedCar.car_name}</span>
                  {selectedCar.plate_number && (
                    <span className="text-xs text-muted-foreground">({selectedCar.plate_number})</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                  {selectedCar.brand && <span>{selectedCar.brand} {selectedCar.model}</span>}
                  <span>{selectedCar.capacity} seats</span>
                  {selectedCar.status && <span>· {selectedCar.status}</span>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCar.isPending}>
              {deleteCar.isPending ? 'Deleting…' : 'Delete Car'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
