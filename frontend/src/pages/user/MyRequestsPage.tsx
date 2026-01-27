import { useState } from 'react';
import { useRequests, useDeleteRequest } from '@/hooks/useRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { FileText, Calendar, Clock, Users, Plus, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

export const MyRequestsPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const { data: requestsData, isLoading } = useRequests({
    page: 1,
    page_size: 100,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
  });

  const deleteRequest = useDeleteRequest();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'outline', color: 'text-yellow-600', label: 'Pending' },
      approved: { variant: 'default', color: 'text-green-600', label: 'Approved' },
      rejected: { variant: 'destructive', color: 'text-red-600', label: 'Rejected' },
      cancelled: { variant: 'secondary', color: 'text-gray-600', label: 'Cancelled' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDelete = async () => {
    if (!selectedRequestId) return;
    
    try {
      await deleteRequest.mutateAsync(selectedRequestId);
      setDeleteDialogOpen(false);
      setSelectedRequestId(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const canDelete = (status: string) => {
    return status === 'pending' || status === 'rejected';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const requests = requestsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Requests</h2>
          <p className="text-muted-foreground">
            Track the status of your room booking requests
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate('/user/requests/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {statusFilter !== 'all'
                ? `You don't have any ${statusFilter} requests`
                : "You haven't created any room requests yet"}
            </p>
            <Button onClick={() => navigate('/user/requests/new')}>
              Create Your First Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{request.purpose}</CardTitle>
                      {getStatusBadge(request.status)}
                    </div>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(request.booking_date), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {request.start_time} - {request.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {request.required_capacity} people
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {request.notes && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <span className="font-medium">Notes:</span> {request.notes}
                  </p>
                )}

                {request.status === 'rejected' && request.rejected_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-destructive mb-1">
                      Reason for Rejection:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.rejected_reason}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  {canDelete(request.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/user/bookings`)}
                    disabled={request.status !== 'approved'}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Booking
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Request?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteRequest.isPending}
            >
              {deleteRequest.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};