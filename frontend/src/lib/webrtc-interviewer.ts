// src/lib/webrtc-interviewer.ts
// WebRTC helper for interviewer role

let peerConnection: RTCPeerConnection | null = null;

export type InterviewerWebRTCResult = {
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  stop: () => void;
};

/**
 * Interviewer WebRTC flow:
 * 1. Get local media (camera + mic)
 * 2. Poll for candidate's offer at /interviewer/offer
 * 3. Create answer and send to /interviewer/answer
 * 4. Set remote description and establish connection
 */
export const startInterviewerWebRTC = async (
  onRemoteStream: (stream: MediaStream) => void
): Promise<InterviewerWebRTCResult> => {
  // Prepare RTCPeerConnection
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // Get local media (camera + mic)
  const localStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 },
    audio: true,
  });

  // Add local tracks to connection
  localStream.getTracks().forEach((track) => {
    if (peerConnection) {
      peerConnection.addTrack(track, localStream);
    }
  });

  // Remote media handler
  if (peerConnection) {
    peerConnection.ontrack = (event) => {
      const [remote] = event.streams;
      if (remote) onRemoteStream(remote);
    };
  }

  // Poll for candidate's offer
  let offerReceived = false;
  const pollForOffer = async (): Promise<void> => {
    if (offerReceived) return;
    
    try {
      const response = await fetch("http://localhost:8000/interviewer/offer");
      const data = await response.json();
      
      if (data.sdp && data.type) {
        await peerConnection?.setRemoteDescription(data);
        
        // Create and send answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        await fetch("http://localhost:8000/interviewer/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sdp: answer.sdp, type: answer.type }),
        });
        
        offerReceived = true;
        console.log("Interviewer received candidate's offer and sent answer");
      } else {
        // No offer yet, poll again in 1 second
        setTimeout(pollForOffer, 1000);
      }
    } catch (error) {
      console.error("Error polling for offer:", error);
      setTimeout(pollForOffer, 1000);
    }
  };

  await pollForOffer();

  const stop = () => {
    try {
      localStream.getTracks().forEach((t) => t.stop());
      if (peerConnection) {
        peerConnection.getSenders().forEach((s) => {
          try { peerConnection?.removeTrack(s); } catch {}
        });
        peerConnection.close();
      }
    } finally {
      peerConnection = null;
    }
  }

  return { localStream, remoteStream: null, stop };
};