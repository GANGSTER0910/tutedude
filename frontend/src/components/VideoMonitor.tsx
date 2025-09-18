import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Wifi, WifiOff } from "lucide-react";
import { Event } from "./ProctorInterface";

// ...other imports

export interface VideoMonitorProps {
  isActive: boolean;
  onEvent: (event: Omit<Event, "id">) => void;
  candidateName: string;
  localStream?: MediaStream;
}

const VideoMonitor = ({ isActive, onEvent, candidateName, localStream }: VideoMonitorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [focusStatus, setFocusStatus] = useState<'focused' | 'distracted' | 'absent'>('focused');
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastProcessTsRef = useRef<number>(0);

  // Timers and debounce flags
  const lastFaceSeenAtRef = useRef<number | null>(null);
  const lastFocusedAtRef = useRef<number | null>(null);
  const faceAbsentAlertedRef = useRef<boolean>(false);
  const focusLostAlertedRef = useRef<boolean>(false);
  const multipleFacesAlertedRef = useRef<boolean>(false);

  // Initialize video stream from provided local stream
  const startVideo = async () => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
      setStream(localStream);
      setIsConnected(true);
    }
  };

  const stopVideo = () => {
    setStream(null);
    setIsConnected(false);
  };

  // MediaPipe Face Detection integration
  const ensureDetector = async () => {
    if (detectorRef.current) return detectorRef.current;
    const mp = await import("@mediapipe/face_detection");
    const detector = new mp.FaceDetection({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });
    detector.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5,
    });
    detector.onResults((results: any) => {
      const detections = results.detections || [];
      const now = performance.now();

      if (detections.length === 0) {
        setFaceDetected(false);
        setFocusStatus('absent');

        // Start/continue face-absent timer
        if (lastFaceSeenAtRef.current == null) {
          lastFaceSeenAtRef.current = now; // mark when absence started
        }

        // Trigger >10s face-absent once
        if (!faceAbsentAlertedRef.current && lastFaceSeenAtRef.current && now - lastFaceSeenAtRef.current > 10000) {
          faceAbsentAlertedRef.current = true;
          onEvent({
            type: 'face-absent',
            timestamp: new Date(),
            severity: 'critical',
            message: 'No face detected for over 10 seconds',
          });
        }

        // Reset focus timer because no face
        lastFocusedAtRef.current = null;
        focusLostAlertedRef.current = false; // allow future alerts after restoration
        multipleFacesAlertedRef.current = false;
        return;
      }

      // Face present
      setFaceDetected(true);
      lastFaceSeenAtRef.current = now; // reset absence timer
      faceAbsentAlertedRef.current = false;

      // Multiple faces detection (debounced ~1s presence)
      const faceCount = detections.length;
      if (faceCount > 1 && !multipleFacesAlertedRef.current) {
        multipleFacesAlertedRef.current = true;
        onEvent({
          type: 'multiple-faces',
          timestamp: new Date(),
          severity: 'critical',
          message: `Multiple faces detected (${faceCount})`,
        });
      } else if (faceCount <= 1) {
        multipleFacesAlertedRef.current = false;
      }

      // Focus heuristic using eye vs nose alignment from keypoints
      // Using relative keypoints from Face Detection: leftEye, rightEye, noseTip
      const keypoints = detections[0]?.locationData?.relativeKeypoints || [];
      const leftEye = keypoints[0];
      const rightEye = keypoints[1];
      const noseTip = keypoints[2];

      let isFocused = true;
      if (leftEye && rightEye && noseTip) {
        const eyeMidX = (leftEye.x + rightEye.x) / 2;
        const eyeMidY = (leftEye.y + rightEye.y) / 2;
        const dx = noseTip.x - eyeMidX;
        const dy = noseTip.y - eyeMidY;
        const offset = Math.sqrt(dx * dx + dy * dy);
        // If nose deviates too far from midpoint between eyes, likely turned away
        isFocused = offset < 0.04; // heuristic threshold; adjust based on testing
      }

      if (isFocused) {
        setFocusStatus('focused');
        if (!lastFocusedAtRef.current) {
          lastFocusedAtRef.current = now;
        } else {
          lastFocusedAtRef.current = now; // keep refreshing
        }

        // If we had previously alerted for focus lost, emit focus-restored once
        if (focusLostAlertedRef.current) {
          focusLostAlertedRef.current = false;
          onEvent({
            type: 'focus-restored',
            timestamp: new Date(),
            severity: 'info',
            message: 'Focus restored',
          });
        }
      } else {
        setFocusStatus('distracted');
        // If sustained distraction >5s, alert once
        if (!lastFocusedAtRef.current) {
          lastFocusedAtRef.current = now - 6000; // force quick trigger if not initialized
        }
        if (!focusLostAlertedRef.current && now - (lastFocusedAtRef.current || now) > 5000) {
          focusLostAlertedRef.current = true;
          onEvent({
            type: 'focus-lost',
            timestamp: new Date(),
            severity: 'warning',
            message: 'User not looking at screen for over 5 seconds',
          });
        }
      }
    });

    detectorRef.current = detector;
    return detector;
  };

  const processFrame = async () => {
    if (!videoRef.current || !detectorRef.current) return;
    const now = performance.now();
    // Throttle to ~10 FPS
    if (now - lastProcessTsRef.current < 100) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastProcessTsRef.current = now;
    await detectorRef.current.send({ image: videoRef.current });
    rafRef.current = requestAnimationFrame(processFrame);
  };

  useEffect(() => {
    if (isActive && localStream && !stream) {
      startVideo();
    } else if (!isActive && stream) {
      stopVideo();
    }

    return () => {
      stopVideo();
    };
  }, [isActive, localStream]);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (isActive && isConnected) {
        await ensureDetector();
        if (!cancelled) {
          rafRef.current = requestAnimationFrame(processFrame);
        }
      }
    };
    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, isConnected]);

  const getStatusColor = () => {
    switch (focusStatus) {
      case 'focused': return 'bg-status-active';
      case 'distracted': return 'bg-status-warning';
      case 'absent': return 'bg-status-critical';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className="p-6 shadow-video">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
            <h3 className="text-lg font-semibold">Video Monitor</h3>
            <Badge variant="outline" className="text-xs">
              {candidateName}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="default" className="text-xs">
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
            
            <Badge 
              variant={faceDetected ? "default" : "destructive"} 
              className="text-xs"
            >
              {faceDetected ? (
                <>
                  <Camera className="h-3 w-3 mr-1" />
                  Face Detected
                </>
              ) : (
                <>
                  <CameraOff className="h-3 w-3 mr-1" />
                  No Face
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Overlay for detection visualization */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Focus status indicator */}
            <div className="absolute top-4 left-4">
              <Badge 
                className={`
                  ${focusStatus === 'focused' ? 'bg-status-active text-white' : ''}
                  ${focusStatus === 'distracted' ? 'bg-status-warning text-white' : ''}
                  ${focusStatus === 'absent' ? 'bg-status-critical text-white' : ''}
                `}
              >
                {focusStatus.charAt(0).toUpperCase() + focusStatus.slice(1)}
              </Badge>
            </div>

            {/* Recording indicator */}
            {isActive && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                REC
              </div>
            )}
          </div>
          
          {/* Canvas for detection processing (hidden) */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Resolution: 1280x720
            </div>
            <div className="text-sm text-muted-foreground">
              FPS: 30
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Status: {focusStatus === 'focused' ? 'Monitoring Active' : 'Alert Triggered'}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VideoMonitor;