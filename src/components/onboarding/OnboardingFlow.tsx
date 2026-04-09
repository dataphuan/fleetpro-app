import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Cloud,
  Building2,
  TrendingUp,
  Shield,
  Users,
  FileSpreadsheet,
  Database
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingFlowProps {
  tenantId: string;
  onComplete: () => void;
}

export function OnboardingFlow({ tenantId, onComplete }: OnboardingFlowProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Chào mừng đến với FleetPro",
      description: "Nền tảng logistics AI hàng đầu Việt Nam",
      icon: <TrendingUp className="w-8 h-8 text-blue-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Chào mừng đến với FleetPro
            </h2>
            <p className="text-gray-600">
              Nền tảng logistics AI hàng đầu Việt Nam với dữ liệu thực tế 100%
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-600 mb-2">35%</div>
                <p className="text-sm text-gray-600">Tăng doanh thu</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">50%</div>
                <p className="text-sm text-gray-600">Giảm chi phí</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">100%</div>
                <p className="text-sm text-gray-600">Dữ liệu thực tế</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Công ty logistics hàng đầu tin dùng:</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Sapaco Tourist</Badge>
              <Badge variant="secondary">Kumho Samco</Badge>
              <Badge variant="secondary">The Sinh Tourist</Badge>
              <Badge variant="secondary">Sao Việt</Badge>
              <Badge variant="secondary">Hà Sơn Bình</Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "demo-data",
      title: "Khám phá dữ liệu demo",
      description: "Xem cách FleetPro tối ưu hóa logistics",
      icon: <Database className="w-8 h-8 text-green-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Khám phá dữ liệu demo
            </h2>
            <p className="text-gray-600">
              Xem cách FleetPro tối ưu hóa logistics với dữ liệu thực tế
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Quản lý đội xe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Theo dõi vị trí xe realtime</li>
                  <li>• Giám sát nhiên liệu & bảo dưỡng</li>
                  <li>• Phân tích hiệu suất tài xế</li>
                  <li>• Tối ưu hóa lộ trình AI</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Báo cáo thông minh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Báo cáo doanh thu theo xe</li>
                  <li>• Phân tích chi phí vận hành</li>
                  <li>• Dự báo lợi nhuận</li>
                  <li>• Xuất báo cáo Excel/PDF</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-green-800 text-sm">
              <strong>AI Logistics:</strong> FleetPro sử dụng trí tuệ nhân tạo để tối ưu hóa lộ trình,
              giảm 30% nhiên liệu và tăng 25% hiệu suất vận chuyển.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "company-info",
      title: "Thông tin công ty",
      description: "Thiết lập thông tin cơ bản",
      icon: <Building2 className="w-8 h-8 text-purple-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Thông tin công ty
            </h2>
            <p className="text-gray-600">
              Thiết lập thông tin cơ bản cho hệ thống
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên công ty *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Công ty TNHH Logistics Việt Nam"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng xe
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>1-5 xe</option>
                    <option>6-20 xe</option>
                    <option>21-50 xe</option>
                    <option>50+ xe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại hình kinh doanh
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Du lịch</option>
                    <option>Vận tải hàng hóa</option>
                    <option>Cho thuê xe</option>
                    <option>Khác</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "import-data",
      title: "Nhập dữ liệu",
      description: "Chọn phương thức nhập dữ liệu",
      icon: <Upload className="w-8 h-8 text-orange-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nhập dữ liệu đội xe
            </h2>
            <p className="text-gray-600">
              Chọn phương thức nhập dữ liệu phù hợp nhất
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer border-2 hover:border-blue-300 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  Nhập từ Excel
                </CardTitle>
                <CardDescription>
                  Tải lên file Excel với thông tin đội xe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p>• File Excel chuẩn (.xlsx, .xls)</p>
                    <p>• Bao gồm: biển số, loại xe, tài xế</p>
                    <p>• Tối đa 1000 xe/lần</p>
                  </div>
                  <Button className="w-full" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Chọn file Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer border-2 hover:border-blue-300 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-6 h-6 text-blue-600" />
                  Đồng bộ Google Drive
                </CardTitle>
                <CardDescription>
                  Kết nối với Google Drive để đồng bộ dữ liệu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p>• Đồng bộ tự động hàng ngày</p>
                    <p>• Sao lưu an toàn trên đám mây</p>
                    <p>• Truy cập từ nhiều thiết bị</p>
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Cloud className="w-4 h-4 mr-2" />
                    Kết nối Google Drive
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800 text-sm">
              <strong>Mẹo:</strong> Bạn có thể nhập dữ liệu sau hoặc liên hệ hỗ trợ để được hướng dẫn chi tiết.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "complete",
      title: "Hoàn thành",
      description: "Bắt đầu sử dụng FleetPro",
      icon: <CheckCircle className="w-8 h-8 text-green-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Chúc mừng! 🎉
            </h2>
            <p className="text-gray-600">
              Bạn đã hoàn thành thiết lập FleetPro
            </p>
          </div>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    Sẵn sàng sử dụng!
                  </h3>
                  <p className="text-green-700">
                    FleetPro đã được thiết lập với dữ liệu thực tế từ các công ty logistics hàng đầu Việt Nam.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium">Bảo mật 3 năm</h4>
                <p className="text-sm text-gray-600">Cam kết bảo mật dữ liệu</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Cloud className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium">Đồng bộ đám mây</h4>
                <p className="text-sm text-gray-600">Google Drive integration</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-medium">AI Optimization</h4>
                <p className="text-sm text-gray-600">Tăng 35% doanh thu</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={onComplete}>
              Bắt đầu sử dụng FleetPro
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= Math.max(...completedSteps) + 1) {
      setCurrentStep(stepIndex);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Thiết lập FleetPro</h1>
          <span className="text-sm text-gray-600">
            Bước {currentStep + 1} / {steps.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => handleStepClick(index)}
            className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
              index === currentStep
                ? "bg-blue-50 border-2 border-blue-300"
                : completedSteps.has(index)
                ? "bg-green-50 border-2 border-green-300 cursor-pointer hover:bg-green-100"
                : index <= Math.max(...completedSteps) + 1
                ? "border-2 border-gray-200 cursor-pointer hover:bg-gray-50"
                : "border-2 border-gray-100 opacity-50"
            }`}
            disabled={index > Math.max(...completedSteps) + 1}
          >
            <div className={`p-2 rounded-full mb-2 ${
              completedSteps.has(index)
                ? "bg-green-100"
                : index === currentStep
                ? "bg-blue-100"
                : "bg-gray-100"
            }`}>
              {completedSteps.has(index) ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                step.icon
              )}
            </div>
            <span className={`text-xs font-medium text-center ${
              index === currentStep ? "text-blue-700" : "text-gray-600"
            }`}>
              {step.title}
            </span>
          </button>
        ))}
      </div>

      {/* Current Step Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {steps[currentStep].icon}
            {steps[currentStep].title}
          </CardTitle>
          <CardDescription>
            {steps[currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {steps[currentStep].content}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Button
          onClick={handleNext}
          disabled={currentStep === steps.length - 1}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {currentStep === steps.length - 2 ? "Hoàn thành" : "Tiếp theo"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
