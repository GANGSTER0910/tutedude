#!/usr/bin/env python3
"""
Video Proctoring Analysis Script
Processes uploaded WebM videos using YOLO-11n for object detection 
and MediaPipe for face/focus analysis.
"""

import cv2
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np

# YOLO imports
try:
    from ultralytics import YOLO
except ImportError:
    print("Installing ultralytics...")
    os.system("pip install ultralytics")
    from ultralytics import YOLO

# MediaPipe imports
try:
    import mediapipe as mp
except ImportError:
    print("Installing mediapipe...")
    os.system("pip install mediapipe")
    import mediapipe as mp

class VideoProctoringAnalyzer:
    def __init__(self):
        # Initialize YOLO-11n model
        print("Loading YOLO-8m model...")
        self.yolo_model = YOLO('yolov8m.pt')
        
        # Initialize MediaPipe Face Detection
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Object classes we care about (COCO dataset indices)
        self.target_classes = {
            'cell phone': 67,
            'book': 73,
            'laptop': 63,
            'paper': 73,  # Not in COCO, we'll use custom detection
        }
        
        # Event tracking
        self.events = []
        self.current_frame = 0
        self.fps = 30  # Will be updated from video
        
        # State tracking for time-based events
        self.face_absent_start = None
        self.focus_lost_start = None
        self.object_detections = {}  # Track persistent object detections
        
        # Thresholds
        self.FACE_ABSENT_THRESHOLD = 3.0  # seconds
        self.FOCUS_LOST_THRESHOLD = 2.0    # seconds
        self.OBJECT_PERSISTENCE_FRAMES = 30  # frames (1 second at 30fps)
        self.CONFIDENCE_THRESHOLD = 0.2
        
    def detect_objects(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect objects using YOLO-8n"""
        results = self.yolo_model(frame, verbose=False)
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    conf = float(box.conf[0])
                    if conf < self.CONFIDENCE_THRESHOLD:
                        continue
                        
                    cls = int(box.cls[0])
                    class_name = self.yolo_model.names[cls]
                    
                    # Check if it's one of our target objects
                    if class_name in self.target_classes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        detections.append({
                            'class': class_name,
                            'confidence': conf,
                            'bbox': [float(x1), float(y1), float(x2), float(y2)],
                            'timestamp': self.current_frame / self.fps
                        })
        
        return detections
    
    def detect_faces_and_focus(self, frame: np.ndarray) -> Dict[str, Any]:
        """Detect faces and analyze focus using MediaPipe"""
        with self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=0.5
        ) as face_detection:
            
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_detection.process(rgb_frame)
            
            face_count = len(results.detections) if results.detections else 0
            has_face = face_count > 0
            multiple_faces = face_count > 1
            
            # Simple focus heuristic: if face is present and reasonably centered
            is_focused = False
            if has_face and results.detections:
                detection = results.detections[0]
                bbox = detection.location_data.relative_bounding_box
                center_x = bbox.xmin + bbox.width / 2
                center_y = bbox.ymin + bbox.height / 2
                
                # Check if face is roughly centered (simple heuristic)
                is_focused = (0.2 < center_x < 0.8 and 0.2 < center_y < 0.8)
            
            return {
                'has_face': has_face,
                'face_count': face_count,
                'multiple_faces': multiple_faces,
                'is_focused': is_focused,
                'timestamp': self.current_frame / self.fps
            }
    
    # def update_object_tracking(self, detections: List[Dict[str, Any]]):
    #     """Track persistent object detections"""
    #     current_time = self.current_frame / self.fps
        
    #     # Update existing detections
    #     for obj_type in list(self.object_detections.keys()):
    #         self.object_detections[obj_type]['last_seen'] = current_time
        
    #     # Add new detections
    #     for detection in detections:
    #         obj_type = detection['class']
    #         if obj_type not in self.object_detections:
    #             self.object_detections[obj_type] = {
    #                 'first_seen': current_time,
    #                 'last_seen': current_time,
    #                 'alerted': False
    #             }
    #         else:
    #             self.object_detections[obj_type]['last_seen'] = current_time
        
    #     # Check for persistent objects that should trigger alerts
    #     for obj_type, info in self.object_detections.items():
    #         if not info['alerted'] and (current_time - info['first_seen']) > 1.0:  # 1 second
    #             self.events.append({
    #                 'type': f'{obj_type.replace(" ", "_")}_detected',
    #                 'timestamp': info['first_seen'],
    #                 'severity': 'critical',
    #                 'message': f'{obj_type.title()} detected in frame',
    #                 'confidence': max([d['confidence'] for d in detections if d['class'] == obj_type])
    #             })
    #             info['alerted'] = True
    def update_object_tracking(self, detections: List[Dict[str, Any]]):
        """Track persistent object detections more robustly"""
        current_time = self.current_frame / self.fps

        # Add/update detections from the current frame
        for detection in detections:
            obj_type = detection['class']
            
            if obj_type not in self.object_detections:
                # First time seeing this object type
                self.object_detections[obj_type] = {
                    'first_seen': current_time,
                    'last_seen': current_time,
                    'alerted': False,
                    'confidence': detection['confidence']  # Store initial confidence
                }
            else:
                # Object already being tracked, update its last_seen time
                self.object_detections[obj_type]['last_seen'] = current_time
                # Optionally, update to the highest confidence score seen so far
                self.object_detections[obj_type]['confidence'] = max(
                    self.object_detections[obj_type].get('confidence', 0), 
                    detection['confidence']
                )

        # Check for persistent objects that should trigger alerts
        for obj_type, info in self.object_detections.items():
            # An object is considered 'persistent' if it has been seen for longer than the threshold
            is_persistent = (info['last_seen'] - info['first_seen']) > 1.0 # Using 1 second threshold

            if not info['alerted'] and is_persistent:
                self.events.append({
                    'type': f'{obj_type.replace(" ", "_")}_detected',
                    'timestamp': info['first_seen'],
                    'severity': 'critical',
                    'message': f'{obj_type.title()} detected in frame',
                    'confidence': info.get('confidence', 0)  # Use the stored confidence
                })
                info['alerted'] = True
        
        # --- Optional Cleanup ---
        # To prevent the dictionary from growing forever, you can remove objects
        # that have not been seen for a long time (e.g., 5 seconds).
        objects_to_remove = []
        for obj_type, info in self.object_detections.items():
            if (current_time - info['last_seen']) > 5.0:
                objects_to_remove.append(obj_type)
        
        for obj_type in objects_to_remove:
            del self.object_detections[obj_type]
    # def update_face_tracking(self, face_info: Dict[str, Any]):
    #     """Track face presence and focus over time"""
    #     current_time = face_info['timestamp']
        
    #     # Face absent tracking
    #     if not face_info['has_face']:
    #         if self.face_absent_start is None:
    #             self.face_absent_start = current_time
    #         elif (current_time - self.face_absent_start) > self.FACE_ABSENT_THRESHOLD:
    #             # Check if we haven't already logged this absence
    #             recent_absence = any(
    #                 e['type'] == 'face_absent' and 
    #                 (current_time - e['timestamp']) < 5.0
    #                 for e in self.events
    #             )
    #             if not recent_absence:
    #                 self.events.append({
    #                     'type': 'face_absent',
    #                     'timestamp': self.face_absent_start,
    #                     'severity': 'critical',
    #                     'message': f'No face detected for {self.FACE_ABSENT_THRESHOLD} seconds'
    #                 })
    #     else:
    #         self.face_absent_start = None
        
    #     # Multiple faces tracking
    #     if face_info['multiple_faces']:
    #         recent_multiple = any(
    #             e['type'] == 'multiple_faces' and 
    #             (current_time - e['timestamp']) < 5.0
    #             for e in self.events
    #         )
    #         if not recent_multiple:
    #             self.events.append({
    #                 'type': 'multiple_faces',
    #                 'timestamp': current_time,
    #                 'severity': 'critical',
    #                 'message': f'Multiple faces detected ({face_info["face_count"]})'
    #             })
        
    #     # Focus tracking
    #     if not face_info['is_focused'] and face_info['has_face']:
    #         if self.focus_lost_start is None:
    #             self.focus_lost_start = current_time
    #         elif (current_time - self.focus_lost_start) > self.FOCUS_LOST_THRESHOLD:
    #             recent_focus_lost = any(
    #                 e['type'] == 'focus_lost' and 
    #                 (current_time - e['timestamp']) < 5.0
    #                 for e in self.events
    #             )
    #             if not recent_focus_lost:
    #                 self.events.append({
    #                     'type': 'focus_lost',
    #                     'timestamp': self.focus_lost_start,
    #                     'severity': 'warning',
    #                     'message': f'User not looking at screen for {self.FOCUS_LOST_THRESHOLD} seconds'
    #                 })
    #     else:
    #         self.focus_lost_start = None
    def update_face_tracking(self, face_info: Dict[str, Any]):
        """Track face presence and focus over time with improved state management."""
        current_time = face_info['timestamp']
        
        # --- Face Absent Tracking ---
        if not face_info['has_face']:
            if self.face_absent_start is None:
                # This is the moment the face was first lost
                self.face_absent_start = current_time
            
            # Check if the absence has crossed the threshold
            elif (current_time - self.face_absent_start) > self.FACE_ABSENT_THRESHOLD:
                # To prevent logging this event repeatedly, we check if the last event was also a face_absent one.
                # This ensures we only log it once per continuous absence period.
                if not self.events or self.events[-1].get('type') != 'face_absent':
                    self.events.append({
                        'type': 'face_absent',
                        'timestamp': self.face_absent_start,
                        'severity': 'critical',
                        'message': f'No face detected for {self.FACE_ABSENT_THRESHOLD:.1f} seconds'
                    })
        else:
            # Face is present again, so reset the timer
            self.face_absent_start = None

        # --- Multiple Faces Tracking ---
        if face_info['multiple_faces']:
            # Log this event only if the previous event wasn't the same, to avoid spamming the log.
            if not self.events or self.events[-1].get('type') != 'multiple_faces':
                 self.events.append({
                    'type': 'multiple_faces',
                    'timestamp': current_time,
                    'severity': 'critical',
                    'message': f'Multiple faces detected ({face_info["face_count"]})'
                })
        
        # --- Focus Tracking (only if a single face is present) ---
        if face_info['has_face'] and not face_info['multiple_faces']:
            if not face_info['is_focused']:
                if self.focus_lost_start is None:
                    # This is the moment focus was first lost
                    self.focus_lost_start = current_time
                
                # Check if the lack of focus has crossed the threshold
                elif (current_time - self.focus_lost_start) > self.FOCUS_LOST_THRESHOLD:
                    if not self.events or self.events[-1].get('type') != 'focus_lost':
                        self.events.append({
                            'type': 'focus_lost',
                            'timestamp': self.focus_lost_start,
                            'severity': 'warning',
                            'message': f'User not looking at screen for {self.FOCUS_LOST_THRESHOLD:.1f} seconds'
                        })
            else:
                # User is focused, so reset the timer
                self.focus_lost_start = None
        else:
            # If there's no face or multiple faces, we can consider focus "lost" but
            # it's better to just reset the timer to avoid conflicting events.
            self.focus_lost_start = None
    # def process_video(self, video_path: str) -> Dict[str, Any]:
    #     """Process the entire video and return analysis results"""
    #     print(f"Processing video: {video_path}")
        
    #     cap = cv2.VideoCapture(video_path)
    #     if not cap.isOpened():
    #         raise ValueError(f"Could not open video: {video_path}")
        
    #     # Get video properties
    #     self.fps = cap.get(cv2.CAP_PROP_FPS)
    #     total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    #     duration = total_frames / self.fps
        
    #     print(f"Video properties: {total_frames} frames, {self.fps:.2f} FPS, {duration:.2f}s duration")
        
    #     # Process every 10th frame for performance (3 FPS analysis)
    #     frame_skip = 1
        
    #     while True:
    #         ret, frame = cap.read()
    #         if not ret:
    #             break
            
    #         if self.current_frame % frame_skip == 0:
    #             # Object detection
    #             object_detections = self.detect_objects(frame)
    #             self.update_object_tracking(object_detections)
                
    #             # Face and focus detection
    #             face_info = self.detect_faces_and_focus(frame)
    #             self.update_face_tracking(face_info)
            
    #         self.current_frame += 1
            
    #         # Progress indicator
    #         if self.current_frame % (frame_skip * 30) == 0:  # Every 10 seconds
    #             progress = (self.current_frame / total_frames) * 100
    #             print(f"Progress: {progress:.1f}%")
        
    #     cap.release()
        
    #     # Generate final report
    #     report = {
    #         'video_info': {
    #             'path': video_path,
    #             'duration_seconds': duration,
    #             'total_frames': total_frames,
    #             'fps': self.fps,
    #             'processed_at': datetime.now().isoformat()
    #         },
    #         'events': sorted(self.events, key=lambda x: x['timestamp']),
    #         'summary': {
    #             'total_events': len(self.events),
    #             'critical_events': len([e for e in self.events if e['severity'] == 'critical']),
    #             'warning_events': len([e for e in self.events if e['severity'] == 'warning']),
    #             'object_detections': len([e for e in self.events if 'detected' in e['type']]),
    #             'face_events': len([e for e in self.events if 'face' in e['type']]),
    #             'focus_events': len([e for e in self.events if 'focus' in e['type']])
    #         }
    #     }
        
    #     return report
    def process_video(self, video_path: str) -> Dict[str, Any]:
        """Process the entire video and return analysis results"""
        print(f"Processing video: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        # Get video properties, but with a fallback
        self.fps = 5.0
        if self.fps is None or self.fps == 0:
            print("Warning: Could not determine video FPS. Defaulting to 30.")
            self.fps = 30.0 # Default to a common value if FPS is not available

        print(f"Video properties: Reading with FPS set to {self.fps:.2f}")
        
        # Process every frame for now, you can adjust frame_skip later
        frame_skip = 1
        
        frames_processed = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break # Exit the loop if there are no more frames
            
            # Your existing processing logic
            if self.current_frame % frame_skip == 0:
                # Object detection
                object_detections = self.detect_objects(frame)
                self.update_object_tracking(object_detections)
                
                # Face and focus detection
                face_info = self.detect_faces_and_focus(frame)
                self.update_face_tracking(face_info)
            
            self.current_frame += 1
            frames_processed += 1 # Keep track of frames we've actually seen
            
            # Progress indicator
            # This part needs to be removed as total_frames is unreliable
            # if self.current_frame % (frame_skip * 30) == 0:
            #     progress = (self.current_frame / total_frames) * 100
            #     print(f"Progress: {progress:.1f}%")
        
        # Calculate duration based on frames we actually processed
        duration = frames_processed / self.fps
        cap.release()
        
        # Generate final report
        report = {
            'video_info': {
                'path': video_path,
                'duration_seconds': duration,
                'total_frames': frames_processed, # Use the actual count
                'fps': self.fps,
                'processed_at': datetime.now().isoformat()
            },
            'events': sorted(self.events, key=lambda x: x['timestamp']),
            'summary': {
                'total_events': len(self.events),
                'critical_events': len([e for e in self.events if e['severity'] == 'critical']),
                'warning_events': len([e for e in self.events if e['severity'] == 'warning']),
                'object_detections': len([e for e in self.events if 'detected' in e['type']]),
                'face_events': len([e for e in self.events if 'face' in e['type']]),
                'focus_events': len([e for e in self.events if 'focus' in e['type']])
            }
        }
        
        return report
def main():
    if len(sys.argv) != 2:
        print("Usage: python video_processor.py <video_path>")
        sys.exit(1)
    
    video_path = sys.argv[1]
    if not os.path.exists(video_path):
        print(f"Video file not found: {video_path}")
        sys.exit(1)
    
    try:
        analyzer = VideoProctoringAnalyzer()
        report = analyzer.process_video(video_path)
        
        # Save report
        output_path = video_path.replace('.webm', '_analysis.json')
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nAnalysis complete!")
        print(f"Report saved to: {output_path}")
        print(f"Total events detected: {report['summary']['total_events']}")
        print(f"Critical events: {report['summary']['critical_events']}")
        print(f"Warning events: {report['summary']['warning_events']}")
        
    except Exception as e:
        print(f"Error processing video: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
