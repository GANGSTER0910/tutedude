# import asyncio
# from fastapi import FastAPI, Request
# from fastapi.responses import JSONResponse
# from aiortc import RTCPeerConnection, RTCSessionDescription
# from aiortc.contrib.media import MediaPlayer
# from fastapi.middleware.cors import CORSMiddleware

# app = FastAPI()
# pcs = set() # Track all peer connections
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:8080"],  # or specify list of allowed origins
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# @app.post("/offer")
# async def offer(request: Request):
#     params = await request.json()
#     offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])
#     pc = RTCPeerConnection()
#     pcs.add(pc)

#     # Get webcam input
#     player = MediaPlayer(
#     'video=Integrated Webcam',
#     format='dshow',
    
# )
#     if player.video:
#         pc.addTrack(player.video)
#     if player.audio:
#         pc.addTrack(player.audio)

#     @pc.on("track")
#     def on_track(track):
#         print("Received Track:", track.kind)

#     # Handle offer from browser
#     await pc.setRemoteDescription(offer)
#     answer = await pc.createAnswer()
#     await pc.setLocalDescription(answer)
#     print("Sent SDP answer to interviewer/candidate.")

#     return JSONResponse(content={
#         "sdp": pc.localDescription.sdp,
#         "type": pc.localDescription.type,
#     })

# @app.on_event("shutdown")
# async def on_shutdown():
#     # Close peer connections cleanly
#     coros = [pc.close() for pc in pcs]
#     await asyncio.gather(*coros)
#     pcs.clear()

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)


import asyncio
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole
import os
from typing import Dict, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Two-role signaling: Candidate and Interviewer
interview_room: Dict[str, Any] = {}

@app.post("/candidate/offer")
async def candidate_offer(request: Request):
    """Candidate sends their offer (camera + mic)"""
    params = await request.json()
    interview_room["candidate_offer"] = {
        "sdp": params["sdp"], 
        "type": params["type"]
    }
    print("Received offer from Candidate")
    return JSONResponse({"status": "candidate_offer_received"})

@app.get("/interviewer/offer")
async def interviewer_get_offer():
    """Interviewer gets the candidate's offer"""
    if "candidate_offer" in interview_room:
        return JSONResponse(interview_room["candidate_offer"])
    return JSONResponse({"error": "No candidate offer available"})

@app.post("/interviewer/answer")
async def interviewer_answer(request: Request):
    """Interviewer sends their answer (their camera + mic)"""
    params = await request.json()
    interview_room["interviewer_answer"] = {
        "sdp": params["sdp"],
        "type": params["type"]
    }
    print("Received answer from Interviewer")
    return JSONResponse({"status": "interviewer_answer_received"})

@app.get("/candidate/answer")
async def candidate_get_answer():
    """Candidate gets the interviewer's answer"""
    if "interviewer_answer" in interview_room:
        answer = interview_room.pop("interviewer_answer")
        # Clean up the room after connection is established
        interview_room.pop("candidate_offer", None)
        return JSONResponse(answer)
    return JSONResponse({"error": "No interviewer answer available"})

@app.on_event("shutdown")
async def on_shutdown():
    coroutines = [pc.close() for pc in list(peer_connections)]
    await asyncio.gather(*coroutines)
    peer_connections.clear()

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    dest_path = os.path.join("uploads", file.filename)
    # If filename exists, append a counter
    base, ext = os.path.splitext(dest_path)
    counter = 1
    while os.path.exists(dest_path):
        dest_path = f"{base}_{counter}{ext}"
        counter += 1
    with open(dest_path, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    
    # Automatically process the video after upload
    try:
        from video_processor import VideoProctoringAnalyzer
        analyzer = VideoProctoringAnalyzer()
        report = analyzer.process_video(dest_path)
        
        # Save analysis results
        analysis_path = dest_path.replace('.webm', '_analysis.json')
        import json
        with open(analysis_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        return {
            "status": "ok", 
            "path": dest_path.replace("\\", "/"),
            "analysis_path": analysis_path.replace("\\", "/"),
            "analysis_complete": True
        }
    except Exception as e:
        print(f"Error processing video: {e}")
        return {
            "status": "ok", 
            "path": dest_path.replace("\\", "/"),
            "analysis_complete": False,
            "error": str(e)
        }

@app.get("/analysis/{filename}")
async def get_analysis(filename: str):
    """Get analysis results for a specific video file"""
    analysis_path = os.path.join("uploads", filename.replace('.webm', '_analysis.json'))
    
    if not os.path.exists(analysis_path):
        return JSONResponse({"error": "Analysis not found"}, status_code=404)
    
    try:
        import json
        with open(analysis_path, 'r') as f:
            analysis_data = json.load(f)
        return JSONResponse(analysis_data)
    except Exception as e:
        return JSONResponse({"error": f"Failed to read analysis: {str(e)}"}, status_code=500)

@app.get("/reports")
async def list_reports():
    """List all available analysis reports"""
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        return JSONResponse({"reports": []})
    
    reports = []
    for file in os.listdir(uploads_dir):
        if file.endswith('_analysis.json'):
            video_file = file.replace('_analysis.json', '.webm')
            video_path = os.path.join(uploads_dir, video_file)
            if os.path.exists(video_path):
                reports.append({
                    "video_file": video_file,
                    "analysis_file": file,
                    "created_at": os.path.getctime(os.path.join(uploads_dir, file))
                })
    
    # Sort by creation time (newest first)
    reports.sort(key=lambda x: x["created_at"], reverse=True)
    return JSONResponse({"reports": reports})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)