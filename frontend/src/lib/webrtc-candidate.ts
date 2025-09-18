// src/lib/webrtc-candidate.ts
// WebRTC helper for candidate role

let peerConnection: RTCPeerConnection | null = null;

export type CandidateWebRTCResult = {
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  stop: () => void;
};

/**
 * Candidate WebRTC flow:
 * 1. Get local media (camera + mic)
 * 2. Create offer and send to /candidate/offer
 * 3. Poll for interviewer's answer at /candidate/answer
 * 4. Set remote description and establish connection
 */
export const startCandidateWebRTC = async (
  onRemoteStream: (stream: MediaStream) => void
): Promise<CandidateWebRTCResult> => {
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

  // Create and send offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Send offer to backend
  await fetch("http://localhost:8000/candidate/offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
  });

  console.log("Candidate offer sent, waiting for interviewer...");

  // Poll for interviewer's answer
  let answerReceived = false;
  const pollForAnswer = async (): Promise<void> => {
    if (answerReceived) return;
    
    try {
      const response = await fetch("http://localhost:8000/candidate/answer");
      const data = await response.json();
      
      if (data.sdp && data.type) {
        await peerConnection?.setRemoteDescription(data);
        answerReceived = true;
        console.log("Candidate received interviewer's answer");
      } else {
        // No answer yet, poll again in 1 second
        setTimeout(pollForAnswer, 1000);
      }
    } catch (error) {
      console.error("Error polling for answer:", error);
      setTimeout(pollForAnswer, 1000);
    }
  };

  await pollForAnswer();

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
  };

  return { localStream, remoteStream: null, stop };
};