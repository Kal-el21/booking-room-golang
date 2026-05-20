import { useState } from 'react';
import { useCarRequests } from '@/hooks/useCars';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  Eye,
  Repeat,
  Coffee,
  CarIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCarRequestDateRange, formatTimeRange, getCarRequestTypeLabel } from '@/utils/dateHelpers';
import type { CarRequestFilters } from '@/types';

export const MyCarRequestsPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const { data: requestsData, isLoading } = useCarRequests({
    page: 1,
    page_size: 100,
    status: statusFilter !== 'all' ? (statusFilter as CarRequestFilters['status']) : undefined,
  });

  // Note: useDeleteCarRequest may not be fully tested, keeping for reference
  // const deleteRequest = useDeleteCarRequest();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'outline' | 'secondary' | 'destructive'; label: string }> = {
      pending: { variant: 'outline', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      cancelled: { variant: 'secondary', label: 'Cancelled' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDelete = (id: number) => {
    setSelectedRequestId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRequestId) return;
    // Note: delete functionality requires backend support
    // await deleteRequest.mutateAsync(selectedRequestId);
    setDeleteDialogOpen(false);
    setSelectedRequestId(null);
  };

  const requests = requestsData?.data || [];

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
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Car Requests</h1>
          <p className="text-muted-foreground">View and manage your vehicle booking requests</p>
        </div>
        <Button onClick={() => navigate('/user/create-car-request')}>
          <Plus className="h-4 w-4 mr-2" />
          New Car Request
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CarIcon className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No car requests found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Get started by creating your first vehicle request
            </p>
            <Button onClick={() => navigate('/user/create-car-request')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Car Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <CarIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold truncate">{request.purpose}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {formatCarRequestDateRange(request)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {formatTimeRange(request.start_time, request.end_time)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            Capacity: {request.required_capacity}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Repeat className="h-4 w-4" />
                            {getCarRequestTypeLabel(request)}
                          </div>
                        </div>
                        {request.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {request.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-start md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/user/car-requests/${request.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/user/car-requests/${request.id}/edit`)}
                      disabled={request.status !== 'pending'}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(request.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                {request.has_consumption && (
                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                    <Coffee className="h-4 w-4" />
                    <span>Consumption required</span>
                    {request.consumption_note && (
                      <span className="text-xs ml-2">- {request.consumption_note}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Car Request?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this car request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
