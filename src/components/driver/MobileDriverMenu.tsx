import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FileText,
  MapPin,
  CheckSquare,
  FlagOff,
} from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { LocationCheckIn } from './LocationCheckIn';
import { PreTripInspection } from './PreTripInspection';
import { PostTripInspection } from './PostTripInspection';

interface MobileDriverMenuProps {
  tripId: string;
  tripName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  onClose?: () => void;
}

export function MobileDriverMenu({
  tripId,
  tripName,
  vehicleId,
  vehiclePlate,
  onClose,
}: MobileDriverMenuProps) {
  const [activeTab, setActiveTab] = useState('pretip');

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <Card className="p-0 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          {/* Tab Navigation */}
          <TabsList className="w-full grid grid-cols-4 gap-0 rounded-b-none bg-blue-50 p-1">
            <TabsTrigger
              value="pretip"
              className="flex flex-col items-center gap-1 py-3 text-xs"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Nhận</span>
            </TabsTrigger>
            <TabsTrigger
              value="checkin"
              className="flex flex-col items-center gap-1 py-3 text-xs"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Check-in</span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex flex-col items-center gap-1 py-3 text-xs"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Tài liệu</span>
            </TabsTrigger>
            <TabsTrigger
              value="posttip"
              className="flex flex-col items-center gap-1 py-3 text-xs"
            >
              <FlagOff className="w-4 h-4" />
              <span className="hidden sm:inline">Kết thúc</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <div className="p-4">
            {/* Pre-Trip */}
            <TabsContent value="pretip" className="space-y-4">
              <PreTripInspection
                tripId={tripId}
                vehicleId={vehicleId}
                vehiclePlate={vehiclePlate}
                onSuccess={() => {
                  setActiveTab('checkin');
                }}
              />
            </TabsContent>

            {/* Check-in */}
            <TabsContent value="checkin" className="space-y-4">
              <LocationCheckIn
                tripId={tripId}
                tripName={tripName}
                onSuccess={() => {
                  setActiveTab('documents');
                }}
              />
            </TabsContent>

            {/* Documents */}
            <TabsContent value="documents" className="space-y-4">
              <DocumentUpload
                tripId={tripId}
                onSuccess={() => {
                  setActiveTab('posttip');
                }}
              />
            </TabsContent>

            {/* Post-Trip */}
            <TabsContent value="posttip" className="space-y-4">
              <PostTripInspection
                tripId={tripId}
                vehicleId={vehicleId}
                vehiclePlate={vehiclePlate}
                onSuccess={onClose}
              />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Progress Indicator */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>
          {activeTab === 'pretip' && '1/4: Báo cáo nhận xe'}
          {activeTab === 'checkin' && '2/4: Check-in vị trí'}
          {activeTab === 'documents' && '3/4: Gửi tài liệu'}
          {activeTab === 'posttip' && '4/4: Báo cáo kết thúc'}
        </p>
      </div>
    </div>
  );
}
