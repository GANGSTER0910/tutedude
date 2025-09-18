// import { useState, useRef, useEffect } from "react";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import VideoMonitor from "./VideoMonitor";
// import EventLogger from "./EventLogger";
// import StatusPanel from "./StatusPanel";
// import ReportGenerator from "./ReportGenerator";
// import { Play, Square, AlertTriangle, Eye, EyeOff, FileText } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";

// export interface Event {
//   id: string;
//   type: 'focus-lost' | 'face-absent' | 'multiple-faces' | 'phone-detected' | 'notes-detected' | 'focus-restored';
//   timestamp: Date;
//   severity: 'info' | 'warning' | 'critical';
//   message: string;
// }

// const ProctorInterface = () => {
//   const [isMonitoring, setIsMonitoring] = useState(false);
//   const [events, setEvents] = useState<Event[]>([]);
//   const [candidateName, setCandidateName] = useState("John Doe");
//   const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
//   const [integrityScore, setIntegrityScore] = useState(100);
//   const [currentStatus, setCurrentStatus] = useState<'good' | 'warning' | 'critical'>('good');
//   const [showReport, setShowReport] = useState(false);
//   const { toast } = useToast();

//   const addEvent = (event: Omit<Event, 'id'>) => {
//     const newEvent = {
//       ...event,
//       id: Math.random().toString(36).substr(2, 9)
//     };
    
//     setEvents(prev => [newEvent, ...prev]);
    
//     // Update integrity score based on event severity
//     if (event.severity === 'critical') {
//       setIntegrityScore(prev => Math.max(0, prev - 10));
//       setCurrentStatus('critical');
//     } else if (event.severity === 'warning') {
//       setIntegrityScore(prev => Math.max(0, prev - 5));
//       setCurrentStatus(prev => prev !== 'critical' ? 'warning' : prev);
//     }

//     // Show toast for critical events
//     if (event.severity === 'critical') {
//       toast({
//         title: "Critical Alert",
//         description: event.message,
//         variant: "destructive",
//       });
//     }
//   };

//   const startMonitoring = () => {
//     setIsMonitoring(true);
//     setSessionStartTime(new Date());
//     addEvent({
//       type: 'focus-restored',
//       timestamp: new Date(),
//       severity: 'info',
//       message: 'Proctoring session started'
//     });
//   };

//   const stopMonitoring = () => {
//     setIsMonitoring(false);
//     addEvent({
//       type: 'focus-restored',
//       timestamp: new Date(),
//       severity: 'info',
//       message: 'Proctoring session ended'
//     });
//   };

//   const getSessionDuration = () => {
//     if (!sessionStartTime) return "00:00:00";
//     const now = new Date();
//     const diff = now.getTime() - sessionStartTime.getTime();
//     const hours = Math.floor(diff / (1000 * 60 * 60));
//     const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
//     const seconds = Math.floor((diff % (1000 * 60)) / 1000);
//     return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
//   };

//   useEffect(() => {
//     let interval: NodeJS.Timeout;
//     if (isMonitoring) {
//       interval = setInterval(() => {
//         // This will trigger re-render to update session duration
//       }, 1000);
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [isMonitoring]);

//   return (
//     <div className="min-h-screen bg-monitor-bg p-6">
//       <div className="mx-auto max-w-7xl space-y-6">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-3xl font-bold text-foreground">
//               Interview Proctoring System
//             </h1>
//             <p className="text-muted-foreground mt-1">
//               Real-time monitoring and integrity assessment
//             </p>
//           </div>
//           <div className="flex items-center gap-4">
//             <Badge 
//               variant={currentStatus === 'good' ? 'default' : currentStatus === 'warning' ? 'secondary' : 'destructive'}
//               className="text-sm px-3 py-1"
//             >
//               {currentStatus === 'good' && <Eye className="h-4 w-4 mr-1" />}
//               {currentStatus === 'warning' && <AlertTriangle className="h-4 w-4 mr-1" />}
//               {currentStatus === 'critical' && <EyeOff className="h-4 w-4 mr-1" />}
//               {currentStatus.toUpperCase()}
//             </Badge>
//             <Button
//               onClick={() => setShowReport(true)}
//               variant="outline"
//               className="px-6"
//             >
//               <FileText className="h-4 w-4 mr-2" />
//               Generate Report
//             </Button>
//             <Button
//               onClick={isMonitoring ? stopMonitoring : startMonitoring}
//               variant={isMonitoring ? "destructive" : "default"}
//               className="px-6"
//             >
//               {isMonitoring ? (
//                 <>
//                   <Square className="h-4 w-4 mr-2" />
//                   Stop Monitoring
//                 </>
//               ) : (
//                 <>
//                   <Play className="h-4 w-4 mr-2" />
//                   Start Monitoring
//                 </>
//               )}
//             </Button>
//           </div>
//         </div>

//         {/* Main Content */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Video Monitor - Takes up 2 columns on large screens */}
//           <div className="lg:col-span-2">
//             <VideoMonitor
//               isActive={isMonitoring}
//               onEvent={addEvent}
//               candidateName={candidateName}
//             />
//           </div>

//           {/* Right Sidebar */}
//           <div className="space-y-6">
//             <StatusPanel
//               candidateName={candidateName}
//               sessionDuration={getSessionDuration()}
//               integrityScore={integrityScore}
//               totalEvents={events.length}
//               isActive={isMonitoring}
//             />
            
//             <EventLogger events={events.slice(0, 10)} />
//           </div>
//         </div>

//         {/* Report Generator Modal */}
//         <ReportGenerator
//           events={events}
//           candidateName={candidateName}
//           sessionDuration={getSessionDuration()}
//           integrityScore={integrityScore}
//           sessionStartTime={sessionStartTime}
//           isOpen={showReport}
//           onClose={() => setShowReport(false)}
//         />
//       </div>
//     </div>
//   );
// };

// export default ProctorInterface;

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
      // Dynamic import for PDF generation
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PROCTORING SESSION REPORT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Session Info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Candidate: ${candidateName}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Session Date: ${sessionStartTime?.toLocaleDateString() || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Session Time: ${sessionStartTime?.toLocaleTimeString() || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Duration: ${getSessionDuration()}`, 20, yPosition);
      yPosition += 15;

      // Analysis Results (if available)
      if (analysisData) {
        doc.setFont('helvetica', 'bold');
        doc.text('AI ANALYSIS RESULTS', 20, yPosition);
        yPosition += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Video Duration: ${analysisData.video_info?.duration_seconds?.toFixed(1)}s`, 20, yPosition);
        yPosition += 8;
        doc.text(`Total Events Detected: ${analysisData.summary?.total_events || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Critical Events: ${analysisData.summary?.critical_events || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Warning Events: ${analysisData.summary?.warning_events || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Object Detections: ${analysisData.summary?.object_detections || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Face Events: ${analysisData.summary?.face_events || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Focus Events: ${analysisData.summary?.focus_events || 0}`, 20, yPosition);
        yPosition += 15;

        // Detailed Events
        if (analysisData.events && analysisData.events.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('DETAILED EVENT LOG', 20, yPosition);
          yPosition += 10;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          analysisData.events.forEach((event: any, index: number) => {
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = 20;
            }
            
            const timestamp = `${event.timestamp?.toFixed(1)}s`;
            const severity = event.severity?.toUpperCase() || 'INFO';
            const message = event.message || 'No message';
            
            doc.text(`[${timestamp}] ${severity}: ${message}`, 20, yPosition);
            yPosition += 6;
          });
        }
      } else {
        // Fallback to real-time events if no analysis data
        doc.setFont('helvetica', 'bold');
        doc.text('REAL-TIME EVENTS', 20, yPosition);
        yPosition += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        events.forEach((event, index) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }
          
          const timestamp = event.timestamp.toLocaleTimeString();
          const severity = event.severity.toUpperCase();
          const message = event.message;
          
          doc.text(`[${timestamp}] ${severity}: ${message}`, 20, yPosition);
          yPosition += 6;
        });
      }

      // Integrity Score
      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`FINAL INTEGRITY SCORE: ${integrityScore}%`, 20, yPosition);
      yPosition += 10;
      
      // Score interpretation
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let interpretation = '';
      if (integrityScore >= 80) interpretation = 'Excellent - High integrity, minimal violations';
      else if (integrityScore >= 60) interpretation = 'Good - Acceptable with minor concerns';
      else if (integrityScore >= 40) interpretation = 'Fair - Moderate violations detected';
      else interpretation = 'Poor - Significant integrity concerns';
      
      doc.text(`Assessment: ${interpretation}`, 20, yPosition);
      yPosition += 15;

      // Footer
      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, pageHeight - 10);
      doc.text('Video Proctoring System - AI-Powered Analysis', pageWidth - 20, pageHeight - 10, { align: 'right' });

      // Save the PDF
      const filename = `proctoring-report-${candidateName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      toast({
        title: "Report Generated",
        description: `PDF report saved as ${filename}`,
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Could not generate PDF report. Please try again.",
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