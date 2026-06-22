import { useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useCars } from '@/hooks/useCars';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CarIcon, Users, MapPin, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Car } from '@/types';

const CarsPageContent = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minCapacity, setMinCapacity] = useState<string>('');

  const { data: carsData, isLoading, error } = useCars({
    page: 1,
    page_size: 50,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    min_capacity: minCapacity ? parseInt(minCapacity) : undefined,
    is_active: true,
  } as any);

  const filteredCars = (carsData?.data || []).filter((car: Car) =>
    car.car_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config = {
      available: { variant: 'default' as const, color: 'text-green-600', label: 'Available' },
      occupied: { variant: 'secondary' as const, color: 'text-yellow-600', label: 'Occupied' },
      maintenance: { variant: 'destructive' as const, color: 'text-red-600', label: 'Maintenance' },
    };
    const { variant, label } = config[status as keyof typeof config] || config.available;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CarIcon className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load cars</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Vehicles</h1>
          <p className="text-muted-foreground">Manage and view all available cars</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/user/car-requests')}>
            My Requests
          </Button>
          <Button onClick={() => navigate('/user/car-requests/new')}>
            Request Car
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </label>
              <Input
                placeholder="Search by car name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Capacity</label>
              <Input
                type="number"
                placeholder="e.g., 5"
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                min="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
{[  
          { label: 'Total Cars', value: carsData?.data?.length || 0, icon: CarIcon },  
          {  
            label: 'Available',  
            value: (carsData?.data || []).filter((c: Car) => c.status === 'available').length,  
            icon: CarIcon,  
            color: 'text-green-600'  
          },  
          {  
            label: 'Occupied',  
            value: (carsData?.data || []).filter((c: Car) => c.status === 'occupied').length,  
            icon: Users,  
            color: 'text-yellow-600'  
          },  
          {  
            label: 'Maintenance',  
            value: (carsData?.data || []).filter((c: Car) => c.status === 'maintenance').length,  
            icon: CarIcon,  
            color: 'text-red-600'  
          },  
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full bg-muted ${color?.replace('text-', 'bg-')?.replace('600', '100')}`}>
                  <Icon className={`h-5 w-5 ${color || 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
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
              {searchTerm ? 'Try adjusting your search term' : 'No cars available in the system'}
            </p>
            <Button onClick={() => navigate('/user/car-requests/new')}>
              Request a Car
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCars.map((car: Car) => {
            const imgUrl = car.image_url?.startsWith('http') 
              ? car.image_url 
              : car.image_url 
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${car.image_url}`
                : undefined;
            
            return (
              <Card key={car.id} className="hover:shadow-md transition-shadow overflow-hidden group">
                {/* Car Image */}
                <div className="w-full h-40 overflow-hidden bg-muted relative">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={car.car_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <CarIcon className="h-12 w-12 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(car.status)}
                  </div>
                </div>

                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base truncate pr-2">{car.car_name}</CardTitle>
                    </div>
                    <CardDescription className="flex flex-col gap-1 text-xs">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        {car.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        Capacity: {car.capacity} {car.capacity === 1 ? 'person' : 'people'}
                      </span>
                    </CardDescription>
                    {car.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 pt-1">
                        {car.description}
                      </p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate('/user/car-requests/new', {
                          state: { carId: car.id, capacity: car.capacity },
                        })}
                      >
                        Request
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/user/car-requests?car_id=${car.id}`)}
                      >
                        View Requests
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const CarsPage = () => {
  return (
    <ErrorBoundary>
      <CarsPageContent />
    </ErrorBoundary>
  );
};
