import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Clock, 
  Shield, 
  AlertCircle,
  TrendingUp,
  CheckCircle
} from "lucide-react";

interface StatusPanelProps {
  candidateName: string;
  sessionDuration: string;
  integrityScore: number;
  totalEvents: number;
  isActive: boolean;
  analysisData?: any;
}

const StatusPanel = ({
  candidateName,
  sessionDuration,
  integrityScore,
  totalEvents,
  isActive,
  analysisData
}: StatusPanelProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-status-active';
    if (score >= 60) return 'text-status-warning';
    return 'text-status-critical';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Session Status</h3>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className="text-xs"
          >
            {isActive ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </div>

        {/* Candidate Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{candidateName}</p>
              <p className="text-sm text-muted-foreground">Candidate</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium font-mono">{sessionDuration}</p>
              <p className="text-sm text-muted-foreground">Session Duration</p>
            </div>
          </div>
        </div>

        {/* Integrity Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-medium">Integrity Score</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {getScoreStatus(integrityScore)}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={`text-2xl font-bold ${getScoreColor(integrityScore)}`}>
                {integrityScore}%
              </span>
              <div className="text-right text-sm text-muted-foreground">
                <div>Target: 80%+</div>
              </div>
            </div>
            
            <Progress 
              value={integrityScore} 
              className="h-2"
            />
          </div>
        </div>

        {/* Event Summary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <span className="font-medium">Event Summary</span>
          </div>

          {analysisData ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{analysisData.summary?.total_events || 0}</div>
                <div className="text-xs text-muted-foreground">AI Detected Events</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{analysisData.summary?.critical_events || 0}</div>
                <div className="text-xs text-muted-foreground">Critical Events</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{analysisData.summary?.object_detections || 0}</div>
                <div className="text-xs text-muted-foreground">Objects Detected</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{analysisData.summary?.face_events || 0}</div>
                <div className="text-xs text-muted-foreground">Face Events</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{totalEvents}</div>
                <div className="text-xs text-muted-foreground">Real-time Events</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">
                  {Math.max(0, 100 - integrityScore)}
                </div>
                <div className="text-xs text-muted-foreground">Points Lost</div>
              </div>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">System Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Camera Feed</span>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-status-active" />
                <span className="text-status-active">Active</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span>AI Analysis</span>
              <div className="flex items-center gap-1">
                {analysisData ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-status-active" />
                    <span className="text-status-active">Complete</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-yellow-500">Processing</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span>Recording</span>
              <div className="flex items-center gap-1">
                {isActive ? (
                  <>
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500">Recording</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 bg-muted rounded-full" />
                    <span className="text-muted-foreground">Stopped</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatusPanel;