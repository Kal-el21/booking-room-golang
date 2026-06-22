import { useState } from 'react';
import { useCarRequests, useAvailableCarsForRequest, useApproveCarRequest, useRejectCarRequest } from '@/hooks/useCars';
import { useDrivers } from '@/hooks/useUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText, Calendar, Clock, Users, CheckCircle, XCircle, User, Car as CarIcon,
  Repeat, Coffee, Search, Car,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCarRequestDateRange, formatTimeRange, getCarRequestTypeLabel } from '@/utils/dateHelpers';
import { toast } from 'sonner';
import type { CarRequest, CarRequestFilters } from '@/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export const PendingCarRequestsPage = () => {
  return (
    <ErrorBoundary>
      <PendingCarRequestsPageContent />
    </ErrorBoundary>
  );
};

const PendingCarRequestsPageContent = () => {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CarRequest | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');
  const [gaConsumptionNote, setGaConsumptionNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: allRequestsData } = useCarRequests({
    page: 1,
    page_size: 1000,
  });

  const { data: requestsData, isLoading } = useCarRequests({
    page: 1,
    page_size: 100,
    status: statusFilter !== 'all' ? (statusFilter as CarRequestFilters['status']) : undefined,
  });

  const { data: availableCars, isLoading: loadingCars } = useAvailableCarsForRequest(
    selectedRequest?.id || 0
  );

  const { data: drivers, isLoading: loadingDrivers } = useDrivers();

  // ── Mutations ──────────────────────────────────────────────────────────────

  const approveCarRequest = useApproveCarRequest();
  const rejectCarRequest = useRejectCarRequest();

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleApproveClick = (request: CarRequest) => {
    setSelectedRequest(request);
    setSelectedCarId('');
    setSelectedDriverId('');
    setGaConsumptionNote(request.consumption_note || '');
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (request: CarRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !selectedCarId) return;
    if (selectedRequest.driver_required && !selectedDriverId) {
      toast.error('Driver is required for this request');
      return;
    }

    try {
      await approveCarRequest.mutateAsync({
        requestId: selectedRequest.id,
        data: {
          car_id: parseInt(selectedCarId),
          ga_consumption_note: gaConsumptionNote || undefined,
          driver_id: selectedDriverId ? parseInt(selectedDriverId) : undefined,
        },
      });
      toast.success('Car request approved successfully');
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setSelectedCarId('');
      setSelectedDriverId('');
      setGaConsumptionNote('');
    } catch {
      toast.error('Failed to approve car request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;

    try {
      await rejectCarRequest.mutateAsync({
        requestId: selectedRequest.id,
        data: { reason: rejectReason },
      });
      toast.success('Car request rejected');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
    } catch {
      toast.error('Failed to reject car request');
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const requests = requestsData?.data || [];
  const allRequests = allRequestsData?.data || [];

  const filteredRequests = requests.filter((r: CarRequest) =>
    (r.purpose || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const driverOptions = drivers ?? [];
  const isDriverRequired = !!selectedRequest?.driver_required;
  const canApprove = !!selectedCarId && (!isDriverRequired || !!selectedDriverId) && (!isDriverRequired || driverOptions.length > 0);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Car Requests</h2>
          <p className="text-muted-foreground">
            Review and process vehicle booking requests from users
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by purpose or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Pending', count: allRequests.filter((r: CarRequest) => r.status === 'pending').length },
          { label: 'Approved', count: allRequests.filter((r: CarRequest) => r.status === 'approved').length },
          { label: 'Rejected', count: allRequests.filter((r: CarRequest) => r.status === 'rejected').length },
          { label: 'Total', count: allRequests.length },
        ].map(({ label, count }) => (
          <Card key={label}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Cards */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No car requests found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {statusFilter !== 'all'
                ? `No ${statusFilter} car requests at the moment`
                : 'No car requests have been submitted yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request: CarRequest) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CarIcon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg truncate">{request.purpose}</CardTitle>
                      <Badge variant={request.status === 'pending' ? 'outline' : request.status === 'approved' ? 'default' : 'destructive'}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                      {request.has_consumption && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <Coffee className="h-3 w-3 mr-1" />
                          Consumption
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{request.user_name || 'Unknown User'}</span>
                      </div>
                      {/* Booking type badge */}
                      {(request.is_recurring || request.end_date) && (
                        <div className="flex items-center gap-1">
                          {request.is_recurring ? (
                            <Repeat className="h-3 w-3 text-primary" />
                          ) : (
                            <Calendar className="h-3 w-3 text-primary" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getCarRequestTypeLabel(request)}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatCarRequestDateRange(request)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeRange(request.start_time, request.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Capacity: {request.required_capacity}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Notes / Consumption */}
                <div className="grid gap-3 md:grid-cols-2">
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

                {/* Rejection reason */}
                {request.status === 'rejected' && request.rejected_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                    <p className="text-sm text-muted-foreground">{request.rejected_reason}</p>
                  </div>
                )}

                {/* Pending actions */}
                {request.status === 'pending' && (
                  <div className="flex gap-2 justify-end pt-2 border-t mt-2">
                    <Button variant="outline" onClick={() => handleRejectClick(request)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleApproveClick(request)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                )}

                {/* Non-pending metadata */}
                {request.status !== 'pending' && (
                  <p className="text-xs text-muted-foreground text-right mt-2">
                    Processed on {format(parseISO(request.updated_at), 'MMM dd, yyyy')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Approve Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Car Request</DialogTitle>
            <DialogDescription>
              Select an available car and confirm consumption details
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Request:</span> {selectedRequest.purpose}
                </p>
                <p className="text-muted-foreground">
                  {formatCarRequestDateRange(selectedRequest)} · {formatTimeRange(selectedRequest.start_time, selectedRequest.end_time)}
                </p>
                <p className="text-muted-foreground">Capacity: {selectedRequest.required_capacity} people</p>
                {selectedRequest.departure_date && (
                  <p className="text-muted-foreground">Departure: {selectedRequest.departure_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="car">Select Car *</Label>
                {loadingCars ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                    <SelectTrigger id="car">
                      <SelectValue placeholder="Choose a car..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCars && availableCars.length > 0 ? (
                        availableCars.map((car) => (
                          <SelectItem key={car.id} value={car.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4" />
                              <span>{car.car_name}</span>
                              <span className="text-muted-foreground text-xs">
                                ({car.capacity} seats)
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No available cars
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {availableCars && availableCars.length === 0 && (
                  <p className="text-xs text-destructive">
                    No cars available for this time slot. Consider rejecting this request.
                  </p>
                )}
              </div>

              {selectedRequest.driver_required && (
                <div className="space-y-2">
                  <Label htmlFor="driver">Assign Driver *</Label>
                  {loadingDrivers ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                      <SelectTrigger id="driver">
                        <SelectValue placeholder="Choose a driver..." />
                      </SelectTrigger>
                      <SelectContent>
                        {driverOptions.length > 0 ? (
                          driverOptions.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{driver.name}</span>
                                {driver.driver_license && (
                                  <span className="text-muted-foreground text-xs">
                                    ({driver.driver_license})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No drivers available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {driverOptions.length === 0 && !loadingDrivers && (
                    <p className="text-xs text-destructive">
                      No drivers available. Add a driver before approving this request.
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.has_consumption && (
                <div className="space-y-2 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                  <Label htmlFor="ga_consumption_note" className="text-orange-800">
                    Consumption Feedback (Optional)
                  </Label>
                  <Textarea
                    id="ga_consumption_note"
                    placeholder="Update availability or add notes about consumption..."
                    value={gaConsumptionNote}
                    onChange={(e) => setGaConsumptionNote(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={!canApprove || approveCarRequest.isPending}
            >
              {approveCarRequest.isPending ? 'Approving…' : 'Approve Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Car Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this vehicle request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Request:</span> {selectedRequest.purpose}
                </p>
                <p className="text-muted-foreground">
                  By: {selectedRequest.user_name || 'Unknown User'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reject_reason">Rejection Reason *</Label>
                <Textarea
                  id="reject_reason"
                  placeholder="e.g., No vehicle available for the requested time slot..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectCarRequest.isPending}
            >
              {rejectCarRequest.isPending ? 'Rejecting…' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};