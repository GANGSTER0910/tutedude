import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VideoMonitor from "./VideoMonitor";
import EventLogger from "./EventLogger";
import StatusPanel from "./StatusPanel";
import ReportGenerator from "./ReportGenerator";
import { Play, Square, AlertTriangle, Eye, EyeOff, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Removed WebRTC imports - using direct camera access

export interface Event {
  id: string;
  type: 'focus-lost' | 'face-absent' | 'multiple-faces' | 'phone-detected' | 'notes-detected' | 'focus-restored';
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

const ProctorInterface = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [candidateName, setCandidateName] = useState("John Doe");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [currentStatus, setCurrentStatus] = useState<'good' | 'warning' | 'critical'>('good');
  const [showReport, setShowReport] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const addEvent = (event: Omit<Event, 'id'>) => {
    const newEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setEvents(prev => [newEvent, ...prev]);
    
    // Update integrity score based on event severity
    if (event.severity === 'critical') {
      setIntegrityScore(prev => Math.max(0, prev - 10));
      setCurrentStatus('critical');
    } else if (event.severity === 'warning') {
      setIntegrityScore(prev => Math.max(0, prev - 5));
      setCurrentStatus(prev => prev !== 'critical' ? 'warning' : prev);
    }

    // Show toast for critical events
    if (event.severity === 'critical') {
      toast({
        title: "Critical Alert",
        description: event.message,
        variant: "destructive",
      });
    }
  };

  const startMonitoring = async () => {
    setIsMonitoring(true);
    setSessionStartTime(new Date());
    addEvent({
      type: 'focus-restored',
      timestamp: new Date(),
      severity: 'info',
      message: 'Proctoring session started'
    });

    // Get local camera stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      
      setLocalStream(stream);

      // Setup MediaRecorder on local stream
      const options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8,opus' } as any;
      const recorder = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const file = new File([blob], `session-${Date.now()}.webm`, { type: 'video/webm' });
          const form = new FormData();
          form.append('file', file);
          const response = await fetch('http://localhost:8000/upload', { method: 'POST', body: form });
          const result = await response.json();
          
          if (result.analysis_complete) {
            toast({ 
              title: 'Analysis Complete', 
              description: 'Video uploaded and analyzed successfully. Report is ready.' 
            });
            // Fetch the analysis results
            await fetchAnalysisResults(result.path.split('/').pop());
          } else {
            toast({ 
              title: 'Upload Complete', 
              description: 'Video uploaded but analysis failed. You can still generate a basic report.' 
            });
          }
        } catch (err) {
          toast({ title: 'Upload failed', description: 'Could not upload recording.', variant: 'destructive' });
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      toast({
        title: "Monitoring Started",
        description: "Camera access granted. Recording and analysis started.",
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Failed",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    addEvent({
      type: 'focus-restored',
      timestamp: new Date(),
      severity: 'info',
      message: 'Proctoring session ended'
    });

    // Stop recording and camera
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    toast({
      title: "Monitoring Stopped",
      description: "Recording stopped and camera released.",
    });
  };

  const fetchAnalysisResults = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:8000/analysis/${filename}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysisData(data);
      } else {
        console.error('Failed to fetch analysis results');
      }
    } catch (error) {
      console.error('Error fetching analysis results:', error);
    }
  };

  const generatePDFReport = async () => {
  setIsGeneratingReport(true);

  try {
    // Dynamic imports for PDF generation libraries
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = 0; // We will manage this carefully

    // --- 1. Main Header ---
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Proctoring Session Report", pageWidth / 2, margin, { align: "center" });
    yPosition = margin + 10;
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    if (!analysisData || !analysisData.integrity_analysis) {
      doc.text("No AI analysis data available for this session.", 20, yPosition);
      doc.save("proctoring-report-incomplete.pdf");
      setIsGeneratingReport(false);
      return;
    }

    const { integrity_analysis, events } = analysisData;
    const { final_integrity_score, summary_details, deductions_breakdown } = integrity_analysis;

    // --- 2. Two-Column Layout ---
    const leftColumnX = margin;
    const rightColumnX = pageWidth / 2 + 10;
    const initialY = yPosition;

    // --- Left Column ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Session Details", leftColumnX, yPosition);
    yPosition += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Candidate: ${candidateName}`, leftColumnX, yPosition);
    yPosition += 6;
    doc.text(`Date: ${sessionStartTime?.toLocaleDateString() || "N/A"}`, leftColumnX, yPosition);
    yPosition += 6;
    doc.text(`Duration: ${getSessionDuration()}`, leftColumnX, yPosition);
    yPosition += 12;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Final Integrity Score", leftColumnX, yPosition);
    yPosition += 12;

    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    // Set color based on score
    if (final_integrity_score >= 80) doc.setTextColor("#28a745"); // Green
    else if (final_integrity_score >= 60) doc.setTextColor("#ffc107"); // Yellow
    else doc.setTextColor("#dc3545"); // Red
    doc.text(`${final_integrity_score}`, leftColumnX, yPosition);
    doc.setTextColor(0); // Reset color to black
    
    let leftColumnEndY = yPosition;

    // --- Right Column ---
    yPosition = initialY; // Reset Y for the right column
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Activity Summary", rightColumnX, yPosition);
    yPosition += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const summaryLines = [
      `Focus lost: ${summary_details["Number of times focus lost"] || 0} time(s)`,
      `Face absent: ${summary_details["Number of times face was absent"] || 0} time(s)`,
      `Multiple faces detected: ${summary_details["Number of times multiple faces were detected"] || 0} time(s)`
    ];
    summaryLines.forEach(line => {
      doc.text(line, rightColumnX, yPosition);
      yPosition += 6;
    });

    // Handle suspicious items separately for better formatting
    const suspiciousItems = summary_details["Suspicious items detected"];
    if (Object.keys(suspiciousItems).length > 0) {
      yPosition += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Suspicious Items:", rightColumnX, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      for (const [item, count] of Object.entries(suspiciousItems)) {
        doc.text(`- ${item}: ${count} time(s)`, rightColumnX + 5, yPosition);
        yPosition += 6;
      }
    }
    
    let rightColumnEndY = yPosition;

    // --- 3. Position the Event Log Table below the longest column ---
    yPosition = Math.max(leftColumnEndY, rightColumnEndY) + 15;
    doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5); // Separator line
    
    if (events && events.length > 0) {
      autoTable(doc, {
        head: [["Timestamp", "Severity", "Event Description"]],
        body: events.map((event: any) => [
          `${event.timestamp?.toFixed(1)}s`,
          event.severity?.toUpperCase() || "INFO",
          event.message || "No message",
        ]),
        startY: yPosition,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] }, // Dark blue header
        styles: { fontSize: 9, cellPadding: 2 },
        // This will automatically add new pages if the table is too long
      });
    } else {
      doc.text("No specific events were logged during this session.", margin, yPosition);
    }
    
    // --- 4. Footer on every page (handled by autoTable's didDrawPage hook) ---
    const footer = () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Report generated on ${new Date().toLocaleString()}`,
        margin,
        pageHeight - 10
      );
      doc.text(
        "AI Proctoring System",
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    };

    // Manually add footer to the first page
    footer();
    // For subsequent pages created by autoTable, use the hook
    if (doc.internal.pages.length > 1) {
      for (let i = 2; i <= doc.internal.pages.length; i++) {
        doc.setPage(i);
        footer();
      }
    }


    // --- Save the PDF ---
    const filename = `proctoring-report-${candidateName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);

    toast({
      title: "Report Generated",
      description: `PDF report saved as ${filename}`,
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    toast({
      title: "PDF Generation Failed",
      description: "Could not generate PDF report. Please check the console.",
      variant: "destructive",
    });
  } finally {
    setIsGeneratingReport(false);
  }
};
  const getSessionDuration = () => {
    if (!sessionStartTime) return "00:00:00";
    const now = new Date();
    const diff = now.getTime() - sessionStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMonitoring) {
      interval = setInterval(() => {
        // This will trigger re-render to update session duration
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  return (
    <div className="min-h-screen bg-monitor-bg p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Video Proctoring System
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered monitoring with real-time analysis
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge 
              variant={currentStatus === 'good' ? 'default' : currentStatus === 'warning' ? 'secondary' : 'destructive'}
              className="text-sm px-3 py-1"
            >
              {currentStatus === 'good' && <Eye className="h-4 w-4 mr-1" />}
              {currentStatus === 'warning' && <AlertTriangle className="h-4 w-4 mr-1" />}
              {currentStatus === 'critical' && <EyeOff className="h-4 w-4 mr-1" />}
              {currentStatus.toUpperCase()}
            </Badge>
            <Button
              onClick={generatePDFReport}
              disabled={isGeneratingReport}
              variant="outline"
              className="px-6"
            >
              {isGeneratingReport ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate PDF Report
                </>
              )}
            </Button>
            
            <Button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              variant={isMonitoring ? "destructive" : "default"}
              className="px-6"
            >
              {isMonitoring ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Monitoring
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Monitor - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <VideoMonitor
              isActive={isMonitoring}
              onEvent={addEvent}
              candidateName={candidateName}
              localStream={localStream}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <StatusPanel
              candidateName={candidateName}
              sessionDuration={getSessionDuration()}
              integrityScore={integrityScore}
              totalEvents={events.length}
              isActive={isMonitoring}
              analysisData={analysisData}
            />
            
            <EventLogger events={events.slice(0, 10)} />
          </div>
        </div>

        {/* Report Generator Modal */}
        <ReportGenerator
          events={events}
          candidateName={candidateName}
          sessionDuration={getSessionDuration()}
          integrityScore={integrityScore}
          sessionStartTime={sessionStartTime}
          isOpen={showReport}
          onClose={() => setShowReport(false)}
        />
      </div>
    </div>
  );
};

export default ProctorInterface;