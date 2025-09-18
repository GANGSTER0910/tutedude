import asyncio
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Dict, Any
from dotenv import load_dotenv
from pymongo import MongoClient
import cloudinary
import cloudinary.uploader
load_dotenv()
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
DATABASE_LINK = os.getenv("DATABASE_LINK")
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)
if not DATABASE_LINK:
    raise ValueError("DATABASE_LINK environment variable not set!")

# Establish connection to MongoDB
try:
    client = MongoClient(DATABASE_LINK)
    db = client['tutedude']  # Database name
    sessions_collection = db.Logs  # Collection name
    # print("✅ Successfully connected to MongoDB.")
except Exception as e:
    # print(f"❌ Could not connect to MongoDB: {e}")
    client = None
    db = None
    sessions_collection = None

# peer_connections = set()
def serialize_mongo_document(doc):
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc
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



# @app.post("/upload")
# async def upload_video(file: UploadFile = File(...)):
#     os.makedirs("uploads", exist_ok=True)
#     dest_path = os.path.join("uploads", file.filename)
#     # If filename exists, append a counter
#     base, ext = os.path.splitext(dest_path)
#     counter = 1
#     while os.path.exists(dest_path):
#         dest_path = f"{base}_{counter}{ext}"
#         counter += 1
#     with open(dest_path, "wb") as out:
#         while True:
#             chunk = await file.read(1024 * 1024)
#             if not chunk:
#                 break
#             out.write(chunk)
    
#     # Automatically process the video after upload
#     try:
#         from video_processor import VideoProctoringAnalyzer
#         analyzer = VideoProctoringAnalyzer()
#         report = analyzer.process_video(dest_path)
        
#         # Save analysis results
#         analysis_path = dest_path.replace('.webm', '_analysis.json')
#         import json
#         with open(analysis_path, 'w') as f:
#             json.dump(report, f, indent=2)
        
#         return {
#             "status": "ok", 
#             "path": dest_path.replace("\\", "/"),
#             "analysis_path": analysis_path.replace("\\", "/"),
#             "analysis_complete": True
#         }
#     except Exception as e:
#         print(f"Error processing video: {e}")
#         return {
#             "status": "ok", 
#             "path": dest_path.replace("\\", "/"),
#             "analysis_complete": False,
#             "error": str(e)
#         }

# from tempfile import NamedTemporaryFile
# import json
# import time

# @app.post("/upload")
# async def upload_video(file: UploadFile = File(...)):
#     try:
#         # Create a temporary file to process locally if needed
#         with NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
#             while True:
#                 chunk = await file.read(1024 * 1024)
#                 if not chunk:
#                     break
#                 temp_file.write(chunk)
#             temp_file_path = temp_file.name  # Path to temp file

#         # Upload to Cloudinary
#         cloudinary_response = cloudinary.uploader.upload(
#             temp_file_path,
#             resource_type="video",  # VERY IMPORTANT for non-image uploads
#             folder="interview_videos",  # Optional: keep files organized
#             public_id=os.path.splitext(file.filename)[0],  # Optional: use original filename
#             overwrite=True
#         )

#         cloudinary_url = cloudinary_response.get("secure_url")
#         if not cloudinary_url:
#             raise ValueError("Failed to get Cloudinary URL after upload")

#         # Prepare MongoDB document
#         report_doc = {
#             "video_file": file.filename,
#             "video_url": cloudinary_url,
#             "created_at": time.time(),
#             "analysis_complete": False,
#             "analysis_file": None,
#             "analysis_data": None,
#         }

#         # Run analysis on local temp file
#         try:
#             from video_processor import VideoProctoringAnalyzer
#             analyzer = VideoProctoringAnalyzer()
#             report = analyzer.process_video(temp_file_path)

#             # Save analysis results locally (optional)
#             analysis_path = temp_file_path.replace(os.path.splitext(temp_file_path)[1], '_analysis.json')
#             with open(analysis_path, 'w') as f:
#                 json.dump(report, f, indent=2)

#             # Update doc
#             report_doc.update({
#                 "analysis_complete": True,
#                 "analysis_file": os.path.basename(analysis_path),
#                 "analysis_data": report
#             })
#         except Exception as e:
#             print(f"Error processing video: {e}")
#             report_doc["error"] = str(e)

#         # Save to MongoDB
#         if sessions_collection is not None:
#             try:
#                 sessions_collection.insert_one(report_doc)
#                 print("✅ Report inserted into MongoDB")
#             except Exception as db_error:
#                 print(f"❌ Failed to insert report in DB: {db_error}")

#         return {
#             "status": "ok",
#             "cloudinary_url": cloudinary_url,
#             "analysis_complete": report_doc["analysis_complete"],
#             "analysis_file": report_doc["analysis_file"],
#         }

#     finally:
#         # Clean up local temp file
#         try:
#             os.remove(temp_file_path)
#         except Exception:
#             pass

import time
import cloudinary.uploader

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    try:
        # 1️⃣ Upload directly to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file.file,
            resource_type="video",
            folder="interview_videos",
            public_id=os.path.splitext(file.filename)[0],
            overwrite=True
        )

        cloudinary_url = upload_result.get("secure_url")
        if not cloudinary_url:
            raise ValueError("Cloudinary upload failed, no URL returned.")

        # 2️⃣ Prepare MongoDB document
        report_doc = {
            "video_file": file.filename,
            "video_url": cloudinary_url,
            "created_at": time.time(),
            "analysis_complete": False,
            "analysis_data": None,
        }

        # 3️⃣ Process video directly from Cloudinary URL
        try:
            from video_processor import VideoProctoringAnalyzer
            analyzer = VideoProctoringAnalyzer()

            # IMPORTANT: Pass URL instead of local path
            report = analyzer.process_video(cloudinary_url)

            report_doc.update({
                "analysis_complete": True,
                "analysis_data": report
            })
        except Exception as e:
            print(f"⚠️ Error processing video: {e}")
            report_doc["error"] = str(e)

        # 4️⃣ Save report to MongoDB
        if sessions_collection is not None:
            try:
                sessions_collection.insert_one(report_doc)
                print("✅ Report inserted into MongoDB")
            except Exception as db_error:
                print(f"❌ Failed to insert report in DB: {db_error}")

        # 5️⃣ Return result
        return {
            "status": "ok",
            "cloudinary_url": cloudinary_url,
            "analysis_complete": report_doc["analysis_complete"],
            "analysis_data": report_doc["analysis_data"],  # optional
        }

    except Exception as e:
        return {"status": "error", "error": str(e)}


# @app.get("/analysis/{filename}")
# async def get_analysis(filename: str):
#     """Get analysis results for a specific video file"""
#     analysis_path = os.path.join("uploads", filename.replace('.webm', '_analysis.json'))
    
#     if not os.path.exists(analysis_path):
#         return JSONResponse({"error": "Analysis not found"}, status_code=404)
    
#     try:
#         import json
#         with open(analysis_path, 'r') as f:
#             analysis_data = json.load(f)
#         return JSONResponse(analysis_data)
#     except Exception as e:
#         return JSONResponse({"error": f"Failed to read analysis: {str(e)}"}, status_code=500)

@app.get("/analysis/{filename}")
async def get_analysis(filename: str):
    """Get analysis results for a specific video file from MongoDB"""
    if sessions_collection is None:
        return JSONResponse({"error": "Database not connected"}, status_code=500)

    try:
        doc = sessions_collection.find_one({"video_file": filename})
        if not doc:
            return JSONResponse({"error": "Analysis not found"}, status_code=404)
        return JSONResponse(serialize_mongo_document(doc))
    except Exception as e:
        return JSONResponse({"error": f"Failed to read analysis: {str(e)}"}, status_code=500)


# @app.get("/reports")
# async def list_reports():
#     """List all available analysis reports"""
#     uploads_dir = "uploads"
#     if not os.path.exists(uploads_dir):
#         return JSONResponse({"reports": []})
    
#     reports = []
#     for file in os.listdir(uploads_dir):
#         if file.endswith('_analysis.json'):
#             video_file = file.replace('_analysis.json', '.webm')
#             video_path = os.path.join(uploads_dir, video_file)
#             if os.path.exists(video_path):
#                 reports.append({
#                     "video_file": video_file,
#                     "analysis_file": file,
#                     "created_at": os.path.getctime(os.path.join(uploads_dir, file))
#                 })
    
#     # Sort by creation time (newest first)
#     reports.sort(key=lambda x: x["created_at"], reverse=True)
#     return JSONResponse({"reports": reports})

@app.get("/reports")
async def list_reports():
    """List all available analysis reports from MongoDB"""
    if sessions_collection is None:
        return JSONResponse({"error": "Database not connected"}, status_code=500)

    try:
        docs = sessions_collection.find().sort("created_at", -1)
        reports = [serialize_mongo_document(doc) for doc in docs]
        for r in reports:
            if "video_url" in r:
                r["video"] = r.pop("video_url")
        return JSONResponse({"reports": reports})
    except Exception as e:
        return JSONResponse({"error": f"Failed to fetch reports: {str(e)}"}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)