from flask import Flask, Response
import cv2
from ultralytics import YOLO
import sys

app = Flask(__name__)

# 색상 정의
COLORS = {
    'GOOD': (0, 255, 0),    # Red for BIG
    'BIG': (0, 0, 255),   # Green for GOOD
    'SMALL': (0, 255, 255)  # Yellow for SMALL
}

# YOLOv8 모델 로드
try:
    model = YOLO('best.pt')
except Exception as e:
    print(f"모델 로드 실패: {e}", file=sys.stderr)
    model = None

def generate_frames():
    if model is None:
        return

    cap = cv2.VideoCapture(1)  # Use appropriate video device or file
    if not cap.isOpened():
        print("웹캠을 열 수 없습니다.", file=sys.stderr)
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # 객체 탐지
        try:
            results = model(source=frame)
        except Exception as e:
            print(f"객체 탐지 실패: {e}", file=sys.stderr)
            continue

        # 결과 화면에 표시
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                class_name = model.names[int(box.cls)]
                if class_name == 'GOOD':
                    class_name = 'BIG'
                if class_name == 'BIG':
                    class_name = 'GOOD'
                confidence = box.conf[0].item()
                if confidence > 0.5:  # Confidence threshold
                    # 객체 종류에 따라 색상 선택
                    color = COLORS.get(class_name, (255, 255, 255))  # Default to white if class_name not in COLORS

                    # Draw bounding box and label
                    frame = cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    frame = cv2.putText(frame, f"{class_name} {confidence:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue

        # Yield frame as MJPEG stream
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

    cap.release()

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return '''<html>
                <body>
                    <h1>Webcam Feed with YOLOv8 Detection</h1>
                    <img src="/video_feed">
                </body>
              </html>'''

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=60000)
