import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, Mic, MicOff, Video, VideoOff, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CandidateInterview = () => {
  const [candidateName, setCandidateName] = useState("");
  const [interviewCode, setInterviewCode] = useState("");
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Join Interview - Video Proctoring System";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Join your proctored interview session. Test your camera and microphone before starting.');
    }
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      toast({
        title: "Camera access granted",
        description: "Your camera and microphone are ready.",
      });
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera and microphone access to join the interview.",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const joinInterview = () => {
    if (!candidateName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name to join the interview.",
        variant: "destructive",
      });
      return;
    }

    if (!interviewCode.trim()) {
      toast({
        title: "Interview code required",
        description: "Please enter the interview code provided by your interviewer.",
        variant: "destructive",
      });
      return;
    }

    if (!stream) {
      toast({
        title: "Camera required",
        description: "Please enable your camera before joining the interview.",
        variant: "destructive",
      });
      return;
    }

    setIsInterviewStarted(true);
    toast({
      title: "Interview started",
      description: "You have successfully joined the interview session.",
    });
  };

  const leaveInterview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsInterviewStarted(false);
    toast({
      title: "Interview ended",
      description: "You have left the interview session.",
    });
  };

  if (isInterviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4">
        <div className="container mx-auto max-w-4xl">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Interview Session</h1>
            <p className="text-muted-foreground">Interview in progress - Please remain focused</p>
          </header>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {candidateName} - Session Active
                </CardTitle>
                <CardDescription>
                  Code: {interviewCode} | Keep your face visible and avoid looking away
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-96 object-cover"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                      <VideoOff className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-4 mt-4">
                  <Button
                    onClick={toggleVideo}
                    variant={isVideoEnabled ? "default" : "destructive"}
                    size="sm"
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    {isVideoEnabled ? "Camera On" : "Camera Off"}
                  </Button>
                  
                  <Button
                    onClick={toggleAudio}
                    variant={isAudioEnabled ? "default" : "destructive"}
                    size="sm"
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {isAudioEnabled ? "Mic On" : "Mic Off"}
                  </Button>

                  <Button onClick={leaveInterview} variant="destructive" size="sm">
                    Leave Interview
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    Interview Guidelines
                  </h3>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    <li>• Keep your face clearly visible in the camera</li>
                    <li>• Look directly at the screen during the interview</li>
                    <li>• Avoid using phones, books, or other devices</li>
                    <li>• Ensure you are alone in the room</li>
                    <li>• Maintain good lighting and clear audio</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Join Interview</h1>
          <p className="text-muted-foreground">Enter your details to start the interview</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Interview Setup
            </CardTitle>
            <CardDescription>
              Please test your camera and microphone before joining
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="candidateName">Full Name</Label>
              <Input
                id="candidateName"
                placeholder="Enter your full name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interviewCode">Interview Code</Label>
              <Input
                id="interviewCode"
                placeholder="Enter interview code"
                value={interviewCode}
                onChange={(e) => setInterviewCode(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Camera Preview</Label>
              <div className="relative bg-black rounded-lg overflow-hidden h-48">
                {stream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <Camera className="h-12 w-12 mx-auto mb-2" />
                      <p>Camera not active</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {!stream ? (
                <Button onClick={startCamera} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Test Camera
                </Button>
              ) : (
                <>
                  <Button
                    onClick={toggleVideo}
                    variant={isVideoEnabled ? "default" : "destructive"}
                    size="sm"
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={toggleAudio}
                    variant={isAudioEnabled ? "default" : "destructive"}
                    size="sm"
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>

            <Button onClick={joinInterview} className="w-full" size="lg">
              Join Interview
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact your interviewer for support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidateInterview;