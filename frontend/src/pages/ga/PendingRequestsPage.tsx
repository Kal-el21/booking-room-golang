import { useState } from 'react';
import { useRequests, useAvailableRooms, useApproveRequest, useRejectRequest } from '@/hooks/useRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Calendar, Clock, Users, CheckCircle, XCircle, User, DoorOpen, Repeat, Coffee } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatDateRange, formatTimeRange, getBookingTypeLabel } from '@/utils/dateHelpers';
import type { RoomRequest, RequestFilters } from '@/types';

export const PendingRequestsPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RoomRequest | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');
  const [gaConsumptionNote, setGaConsumptionNote] = useState('');

  // Fetch all requests for stats (unfiltered)
  const { data: allRequestsData } = useRequests({
    page: 1,
    page_size: 1000,
  });

  // Fetch filtered requests for display
  const { data: requestsData, isLoading } = useRequests({
    page: 1,
    page_size: 100,
    status: statusFilter !== 'all' ? (statusFilter as RequestFilters['status']) : undefined,
  });

  const { data: availableRooms, isLoading: loadingRooms } = useAvailableRooms(
    selectedRequest?.id || 0
  );

  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const handleApproveClick = (request: RoomRequest) => {
    setSelectedRequest(request);
    setSelectedRoomId('');
    setGaConsumptionNote(request.consumption_note || '');
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (request: RoomRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !selectedRoomId) return;

    try {
      await approveRequest.mutateAsync({
        requestId: selectedRequest.id,
        data: { 
          room_id: parseInt(selectedRoomId),
          consumption_note: gaConsumptionNote || undefined
        },
      });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setSelectedRoomId('');
      setGaConsumptionNote('');
    } catch {
      // Error handled in hook
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;

    try {
      await rejectRequest.mutateAsync({
        requestId: selectedRequest.id,
        data: { reason: rejectReason },
      });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
    } catch {
      // Error handled in hook
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const requests = requestsData?.data || [];
  const allRequests = allRequestsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Room Requests</h2>
          <p className="text-muted-foreground">
            Review and process room booking requests
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allRequests.filter((r) => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allRequests.filter((r) => r.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allRequests.filter((r) => r.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {statusFilter !== 'all'
                ? `No ${statusFilter} requests at the moment`
                : 'No room requests have been submitted yet'}
            </p>
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
                      {request.has_consumption && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <Coffee className="h-3 w-3 mr-1" />
                          Consumption
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{request.user_name || 'Unknown User'}</span>
                      </div>
                      {/* Booking Type Badge */}
                      {(request.is_recurring || request.end_date) && (
                        <div className="flex items-center gap-1">
                          {request.is_recurring ? (
                            <Repeat className="h-3 w-3 text-primary" />
                          ) : (
                            <Calendar className="h-3 w-3 text-primary" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getBookingTypeLabel(request)}
                          </Badge>
                        </div>
                      )}
                      <CardDescription className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateRange(request)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeRange(request.start_time, request.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {request.required_capacity} people
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {request.notes && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm">
                        <span className="font-medium">General Notes:</span> {request.notes}
                      </p>
                    </div>
                  )}

                  {request.has_consumption && (
                    <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3">
                      <p className="text-sm">
                        <span className="font-medium text-orange-800">Consumption Requested:</span>
                      </p>
                      <p className="text-sm italic">
                        {request.consumption_note || 'No specific details provided'}
                      </p>
                    </div>
                  )}
                </div>

                {request.status === 'rejected' && request.rejected_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
                    <p className="text-sm font-medium text-destructive mb-1">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.rejected_reason}
                    </p>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-2 justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleRejectClick(request)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleApproveClick(request)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                )}

                {request.status !== 'pending' && (
                  <div className="text-xs text-muted-foreground text-right mt-4">
                    Processed on {format(parseISO(request.updated_at), 'MMM dd, yyyy')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Select an available room and confirm consumption
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Request:</span> {selectedRequest.purpose}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDateRange(selectedRequest)} • {' '}
                  {formatTimeRange(selectedRequest.start_time, selectedRequest.end_time)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room">Select Room *</Label>
                {loadingRooms ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                    <SelectTrigger id="room">
                      <SelectValue placeholder="Choose a room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms && availableRooms.length > 0 ? (
                        availableRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            <div className="flex items-center gap-2">
                              <DoorOpen className="h-4 w-4" />
                              <span>{room.room_name}</span>
                              <span className="text-muted-foreground text-xs">
                                ({room.capacity} capacity)
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No available rooms
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {availableRooms && availableRooms.length === 0 && (
                  <p className="text-xs text-destructive">
                    No rooms available for this time slot. Consider rejecting this request.
                  </p>
                )}
              </div>

              {selectedRequest.has_consumption && (
                <div className="space-y-2 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                  <Label htmlFor="ga_consumption_note" className="text-orange-800">
                    Consumption Feedback (Optional)
                  </Label>
                  <Textarea
                    id="ga_consumption_note"
                    placeholder="Update status or give note about consumption availability..."
                    value={gaConsumptionNote}
                    onChange={(e) => setGaConsumptionNote(e.target.value)}
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    You can clarify if some requested items are not available.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!selectedRoomId || approveRequest.isPending}
            >
              {approveRequest.isPending ? 'Approving...' : 'Approve Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Request:</span> {selectedRequest.purpose}
                </div>
                <div className="text-sm text-muted-foreground">
                  By: {selectedRequest.user_name || 'Unknown User'}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Room not available for the requested time slot..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectRequest.isPending}
            >
              {rejectRequest.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};