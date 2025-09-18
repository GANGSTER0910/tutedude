#!/usr/bin/env python3
"""
Process the most recently uploaded video file
"""

import os
import sys
import glob
from pathlib import Path

def find_latest_video():
    """Find the most recently uploaded video file"""
    uploads_dir = Path("uploads")
    if not uploads_dir.exists():
        print("No uploads directory found")
        return None
    
    # Find all .webm files
    video_files = list(uploads_dir.glob("*.webm"))
    if not video_files:
        print("No video files found in uploads directory")
        return None
    
    # Return the most recently modified file
    latest_video = max(video_files, key=os.path.getmtime)
    return str(latest_video)

def main():
    # Find the latest uploaded video
    video_path = find_latest_video()
    if not video_path:
        sys.exit(1)
    
    print(f"Processing latest video: {video_path}")
    
    # Import and run the video processor
    from video_processor import VideoProctoringAnalyzer
    
    try:
        analyzer = VideoProctoringAnalyzer()
        report = analyzer.process_video(video_path)
        
        # Save report
        output_path = video_path.replace('.webm', '_analysis.json')
        with open(output_path, 'w') as f:
            import json
            json.dump(report, f, indent=2)
        
        print(f"\nAnalysis complete!")
        print(f"Report saved to: {output_path}")
        print(f"Total events detected: {report['summary']['total_events']}")
        print(f"Critical events: {report['summary']['critical_events']}")
        print(f"Warning events: {report['summary']['warning_events']}")
        
        # Print event summary
        print("\nEvent Summary:")
        for event in report['events']:
            timestamp = f"{event['timestamp']:.1f}s"
            print(f"  [{timestamp}] {event['severity'].upper()}: {event['message']}")
        
    except Exception as e:
        print(f"Error processing video: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
