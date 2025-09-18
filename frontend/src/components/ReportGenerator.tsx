import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Event } from "./ProctorInterface";
import { 
  Download, 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  User,
  Calendar,
  Shield
} from "lucide-react";

interface ReportGeneratorProps {
  events: Event[];
  candidateName: string;
  sessionDuration: string;
  integrityScore: number;
  sessionStartTime: Date | null;
  isOpen: boolean;
  onClose: () => void;
}

const ReportGenerator = ({
  events,
  candidateName,
  sessionDuration,
  integrityScore,
  sessionStartTime,
  isOpen,
  onClose
}: ReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = () => {
    setIsGenerating(true);
    
    // Simulate report generation delay
    setTimeout(() => {
      const report = createReportData();
      downloadReport(report);
      setIsGenerating(false);
    }, 2000);
  };

  const createReportData = () => {
    const criticalEvents = events.filter(e => e.severity === 'critical').length;
    const warningEvents = events.filter(e => e.severity === 'warning').length;
    const infoEvents = events.filter(e => e.severity === 'info').length;

    const eventSummary = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      candidate: candidateName,
      sessionDate: sessionStartTime?.toLocaleDateString() || 'N/A',
      sessionTime: sessionStartTime?.toLocaleTimeString() || 'N/A',
      duration: sessionDuration,
      integrityScore,
      totalEvents: events.length,
      criticalEvents,
      warningEvents,
      infoEvents,
      eventBreakdown: eventSummary,
      events: events.map(event => ({
        timestamp: event.timestamp.toLocaleTimeString(),
        type: event.type,
        severity: event.severity,
        message: event.message
      }))
    };
  };

  const downloadReport = (data: any) => {
    const reportContent = `
PROCTORING SESSION REPORT
========================

CANDIDATE INFORMATION
• Name: ${data.candidate}
• Session Date: ${data.sessionDate}
• Session Time: ${data.sessionTime}
• Duration: ${data.duration}

INTEGRITY ASSESSMENT
• Final Score: ${data.integrityScore}%
• Total Events: ${data.totalEvents}
• Critical Violations: ${data.criticalEvents}
• Warnings: ${data.warningEvents}
• Info Events: ${data.infoEvents}

EVENT BREAKDOWN
${Object.entries(data.eventBreakdown).map(([type, count]) => 
  `• ${type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${count}`
).join('\n')}

DETAILED EVENT LOG
==================
${data.events.map((event: any) => 
  `[${event.timestamp}] ${event.severity.toUpperCase()}: ${event.message}`
).join('\n')}

INTEGRITY ASSESSMENT CRITERIA
============================
• Excellent (80-100%): High integrity, minimal violations
• Good (60-79%): Acceptable with minor concerns
• Fair (40-59%): Moderate violations detected
• Poor (0-39%): Significant integrity concerns

Generated on: ${new Date().toLocaleString()}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proctoring-report-${candidateName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  const criticalEvents = events.filter(e => e.severity === 'critical').length;
  const warningEvents = events.filter(e => e.severity === 'warning').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Proctoring Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Overview */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Session Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Candidate:</strong> {candidateName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Duration:</strong> {sessionDuration}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Date:</strong> {sessionStartTime?.toLocaleDateString() || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Score:</strong> 
                  <span className={`ml-1 ${getScoreColor(integrityScore)}`}>
                    {integrityScore}% ({getScoreStatus(integrityScore)})
                  </span>
                </span>
              </div>
            </div>
          </Card>

          {/* Event Summary */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Event Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-status-critical/10 rounded-lg">
                <div className="text-2xl font-bold text-status-critical">{criticalEvents}</div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
              <div className="text-center p-3 bg-status-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-status-warning">{warningEvents}</div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{events.length}</div>
                <div className="text-xs text-muted-foreground">Total Events</div>
              </div>
            </div>
          </Card>

          {/* Recent Events */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Recent Events</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {event.severity === 'critical' && <AlertTriangle className="h-3 w-3 text-status-critical" />}
                    {event.severity === 'warning' && <AlertTriangle className="h-3 w-3 text-status-warning" />}
                    {event.severity === 'info' && <CheckCircle className="h-3 w-3 text-status-active" />}
                    {event.message}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {event.timestamp.toLocaleTimeString()}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={generateReport} 
              disabled={isGenerating}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Download Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGenerator;