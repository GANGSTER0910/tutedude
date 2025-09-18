// src/lib/webrtc.ts

let peerConnection: RTCPeerConnection | null = null;

export type StartWebRTCResult = {
  localStream: MediaStream;
  stop: () => void;
};

/**
 * Starts a WebRTC connection by getting local media, adding tracks,
 * creating an SDP offer, sending it to the backend, and setting the answer.
 * onRemoteStream will fire when the server sends back any remote media.
 */
export const startWebRTC = async (
  onRemoteStream: (stream: MediaStream) => void
): Promise<StartWebRTCResult> => {
  // Prepare RTCPeerConnection
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // Get local media (camera + mic if available)
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

  const response = await fetch("http://localhost:8000/offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
  });
  console.log("Sent offer to backend");
  const answer = await response.json();
  await peerConnection.setRemoteDescription(answer);

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

  return { localStream, stop };
};