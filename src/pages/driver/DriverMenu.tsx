import { useState } from 'react';
import { useTrips } from '@/hooks/useTrips';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MobileDriverMenu } from '@/components/driver/MobileDriverMenu';
import { MapPin, Calendar, Truck, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

export default function DriverMenuPage() {
  const { data: trips = [], isLoading } = useTrips();
  const { user } = useAuth();
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!trips || trips.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">📋 Báo Cáo & Tài Liệu</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">Không có chuyến nào</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleMenuOpen = (trip: any) => {
    setSelectedTrip(trip);
    setMenuOpen(true);
  };

  return (
    <div className="p-4 space-y-4 pb-32">
      <h2 className="text-xl font-bold">📋 Báo Cáo & Tài Liệu</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Chọn chuyến để báo cáo, check-in, gửi tài liệu hoặc kết thúc xe
      </p>

      <div className="space-y-3">
        {trips.map((trip) => (
          <Card
            key={trip.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleMenuOpen(trip)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    {trip.trip_code || trip.id}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {trip.route_id && `Tuyến: ${trip.route_id}`}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  trip.status === 'confirmed'
                    ? 'bg-blue-100 text-blue-700'
                    : trip.status === 'in_progress'
                    ? 'bg-orange-100 text-orange-700'
                    : trip.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {trip.status === 'confirmed' && 'Ra chuyến'}
                  {trip.status === 'in_progress' && 'Đang chạy'}
                  {trip.status === 'completed' && 'Hoàn thành'}
                  {trip.status === 'draft' && 'Nháp'}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              <div className="flex gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{formatDate(trip.departure_date)}</span>
              </div>
              {trip.customer_id && (
                <div className="text-sm text-muted-foreground">
                  📦 Khách: {trip.customer_id}
                </div>
              )}
              <div className="flex gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{trip.actual_distance_km || 0} km</span>
              </div>
            </CardContent>

            <div className="px-6 pb-3 pt-2 border-t">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuOpen(trip);
                }}
                className="w-full text-xs h-8"
              >
                📝 Báo Cáo & Tài Liệu
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Menu Dialog */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="bg-blue-600 text-white p-4 rounded-t">
            <DialogTitle>{selectedTrip?.trip_code || 'Chuyến'}</DialogTitle>
          </DialogHeader>
          {selectedTrip && (
            <div className="p-4">
              <MobileDriverMenu
                tripId={selectedTrip.id}
                tripName={selectedTrip.trip_code}
                vehicleId={selectedTrip.vehicle_id}
                vehiclePlate={selectedTrip.vehicle_id}
                onClose={() => setMenuOpen(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
