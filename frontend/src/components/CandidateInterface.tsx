import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startCandidateWebRTC } from "@/lib/webrtc-candidate";

const CandidateInterface = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [interviewerName, setInterviewerName] = useState("Interviewer");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const stopWebRTCRef = useRef<null | (() => void)>(null);
  const { toast } = useToast();

  const connectToInterview = async () => {
    setIsConnecting(true);
    try {
      const { localStream: ls, remoteStream: rs, stop } = await startCandidateWebRTC(
        (stream: MediaStream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        }
      );
      
      setLocalStream(ls);
      setRemoteStream(rs);
      stopWebRTCRef.current = stop;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = ls;
      }
      
      setIsConnected(true);
      setSessionStartTime(new Date());
      
      toast({
        title: "Connected",
        description: "You are now connected to the interviewer.",
      });
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to interviewer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromInterview = () => {
    if (stopWebRTCRef.current) {
      stopWebRTCRef.current();
      stopWebRTCRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStream(null);
    setSessionStartTime(null);
    
    toast({
      title: "Disconnected",
      description: "You have left the interview.",
    });
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
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
    if (isConnected && sessionStartTime) {
      interval = setInterval(() => {
        // Trigger re-render to update session duration
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, sessionStartTime]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Interview Session
            </h1>
            <p className="text-gray-600 mt-1">
              Connected with {interviewerName}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {isConnected && (
              <Badge variant="default" className="text-sm px-3 py-1">
                Duration: {getSessionDuration()}
              </Badge>
            )}
            
            <Button
              onClick={isConnected ? disconnectFromInterview : connectToInterview}
              variant={isConnected ? "destructive" : "default"}
              disabled={isConnecting}
              className="px-6"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Connecting...
                </>
              ) : isConnected ? (
                <>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Leave Interview
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Join Interview
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Interviewer Video (Remote) */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{interviewerName}</h3>
                <Badge variant={remoteStream ? "default" : "secondary"}>
                  {remoteStream ? "Connected" : "Waiting..."}
                </Badge>
              </div>
              
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <CameraOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Waiting for interviewer...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Your Video (Local) */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">You</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={isMuted ? "destructive" : "default"}>
                    <Mic className="h-3 w-3 mr-1" />
                    {isMuted ? "Muted" : "Unmuted"}
                  </Badge>
                  <Badge variant={isVideoOff ? "destructive" : "default"}>
                    <Camera className="h-3 w-3 mr-1" />
                    {isVideoOff ? "Video Off" : "Video On"}
                  </Badge>
                </div>
              </div>
              
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!localStream && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <CameraOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Your camera will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        {isConnected && (
          <Card className="p-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "outline"}
                className="gap-2"
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              
              <Button
                onClick={toggleVideo}
                variant={isVideoOff ? "destructive" : "outline"}
                className="gap-2"
              >
                {isVideoOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {isVideoOff ? "Turn On Video" : "Turn Off Video"}
              </Button>
            </div>
          </Card>
        )}

        {/* Instructions */}
        {!isConnected && (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Ready to Start Your Interview?</h3>
              <p className="text-gray-600">
                Click "Join Interview" to connect with your interviewer. 
                Make sure your camera and microphone are working properly.
              </p>
              <div className="flex justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  Camera Required
                </div>
                <div className="flex items-center gap-1">
                  <Mic className="h-4 w-4" />
                  Microphone Required
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CandidateInterface;
