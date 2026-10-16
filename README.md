# Smart Lab Safety – AI-Powered Laboratory Safety Monitoring & PPE Detection System

Smart Lab Safety is an enterprise-grade, full-stack laboratory safety management and computer vision monitoring system. It provides real-time personal protective equipment (PPE) compliance detection using YOLOv8, an automated multi-hazard safety alert system, dynamic risk score evaluation, an OSHA-grounded Retrieval-Augmented Generation (RAG) AI safety assistant, laboratory incident lifecycle tracking, and analytics dashboards.

---

## 🚀 Key Modules & Capabilities

1. **Safety Dashboard**: Real-time KPI metrics for monitored personnel, laboratory-wide PPE compliance percentage, active safety alarms, zone-by-zone operational status, risk level index (LOW, MEDIUM, HIGH, CRITICAL), and weekly compliance timelines.
2. **Live Vision Monitoring**: Live webcam streaming via WebRTC (`navigator.mediaDevices.getUserMedia`), image/video upload inference, simulated continuous laboratory inspection stream, canvas-based bounding box HUD overlay, confidence metrics, and per-worker compliance tags.
3. **AI PPE Detection**: 5-class YOLOv8 object detection architecture:
   - `0: person`
   - `1: lab_coat`
   - `2: gloves`
   - `3: safety_goggles`
   - `4: mask`
   Ready for custom-trained weights at `backend/models/best.pt`.
4. **Safety Alert System**: Automated alarm generation for missing goggles, unbuttoned lab coats, missing nitrile gloves, unmasked personnel, multiple simultaneous PPE violations, chemical spills, fires, and gas leaks with resolution auditing.
5. **Dynamic Risk Calculation**: Weighted risk scoring (0 to 100) factoring in violation severity (e.g. missing splash goggles = +25 risk points), unshielded multi-person compounding factors, and active environmental hazards.
6. **AI Safety Assistant (RAG)**: Vector-indexed retrieval across standard operating procedures (`chemical_spill_response.txt`, `fire_safety.txt`, `gas_leak_procedure.txt`, `ppe_requirements.txt`) providing immediate action directives and grounded citations.
7. **Incident Management**: End-to-end incident lifecycle (OPEN, INVESTIGATING, RESOLVED) with severity categorizations, location attribution, reporter tracking, and investigation resolution notes.
8. **Interactive Analytics**: Historical compliance trends, violation type distributions, risk level frequency breakdowns, and zone-specific safety ratings.
9. **Standard Operating Procedures (SOP)**: Regulatory documentation browser for Chemical Spills (SWEEP & C.L.E.A.N.), Fire Emergencies (R.A.C.E. & P.A.S.S.), Compressed Gas Leaks, and Four Pillars of PPE (OSHA 1910.132).
10. **System Settings**: Configurable YOLO confidence gating (20% - 90%), mandatory PPE policies, alert dispatch toggles, and risk boundaries.

---

## 📂 Project Structure

```
smart_lab_safety/
├── backend/
│   ├── data/
│   │   └── safety_documents/
│   │       ├── chemical_spill_response.txt
│   │       ├── fire_safety.txt
│   │       ├── gas_leak_procedure.txt
│   │       └── ppe_requirements.txt
│   ├── database/
│   │   ├── db.py
│   │   └── models.py
│   ├── models/
│   │   └── best.pt                  # Target location for trained YOLO weights
│   ├── rag/
│   │   ├── document_loader.py
│   │   └── vector_store.py
│   ├── routes/
│   │   ├── alerts.py
│   │   ├── analytics.py
│   │   ├── assistant.py
│   │   ├── dashboard.py
│   │   ├── detection.py
│   │   ├── incidents.py
│   │   ├── safety_docs.py
│   │   └── settings.py
│   ├── schemas/
│   │   ├── alert.py
│   │   ├── assistant.py
│   │   ├── detection.py
│   │   ├── incident.py
│   │   └── settings.py
│   ├── services/
│   │   ├── alert_service.py
│   │   ├── rag_service.py
│   │   ├── risk_calculator.py
│   │   └── yolo_detector.py
│   ├── main.py                     # FastAPI application entrypoint
│   └── requirements.txt
├── dataset/
│   ├── data.yaml                   # YOLOv8 dataset configuration
│   ├── dataset_validator.py        # Dataset structure & annotation validation script
│   ├── images/
│   │   ├── train/
│   │   └── val/
│   └── labels/
│       ├── train/
│       └── val/
├── src/
│   ├── components/
│   │   ├── about/AboutView.tsx
│   │   ├── alerts/AlertsView.tsx
│   │   ├── analytics/AnalyticsView.tsx
│   │   ├── assistant/SafetyAssistantView.tsx
│   │   ├── dashboard/DashboardView.tsx
│   │   ├── detection/PPEDetectionView.tsx
│   │   ├── incidents/IncidentsView.tsx
│   │   ├── layout/Navbar.tsx
│   │   ├── layout/Sidebar.tsx
│   │   ├── monitoring/LiveMonitoringView.tsx
│   │   ├── procedures/SafetyProceduresView.tsx
│   │   └── settings/SettingsView.tsx
│   ├── services/api.ts
│   ├── types/index.ts
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   └── run_tests.py                # Standalone test runner for core services
├── server.ts                       # Full-stack server
├── smart_lab_safety.db             # Synchronized SQLite database
└── README.md
```

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, SQLite, Pydantic, Ultralytics YOLOv8
- **Computer Vision**: Ultralytics YOLOv8 object detection model (5 classes)
- **Knowledge Base (RAG)**: BM25/TF-IDF vector indexing & Google GenAI API enhancement
- **Persistence**: SQLite with synchronized SQLAlchemy & Node database layers

---

## ⚡ Installation & Setup

### 1. Prerequisites
- Node.js 20+
- Python 3.10+

### 2. Full-Stack Web Application (Port 3000)
```bash
# Install dependencies
npm install

# Run the complete application
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Dedicated Python FastAPI Backend (Port 8000)
To run the pure Python FastAPI backend independently:
```bash
# Install Python packages
pip install -r backend/requirements.txt

# Start FastAPI with Uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API documentation is available at:
`http://localhost:8000/docs`

---

## 🧠 YOLO Model Training & Placement

### Target Placement
Place your custom trained weights at:
```
backend/models/best.pt
```

### Dataset Structure
Ensure annotations in `dataset/labels/` adhere to the 5 standard classes:
```yaml
names:
  0: person
  1: lab_coat
  2: gloves
  3: safety_goggles
  4: mask
```

### Dataset Validation
Validate your dataset annotations and bounding boxes:
```bash
python3 dataset/dataset_validator.py dataset
```

### Training YOLOv8
```bash
yolo detect train data=dataset/data.yaml model=yolov8n.pt epochs=100 imgsz=640 batch=16
```
After training finishes, copy the weights:
```bash
cp runs/detect/train/weights/best.pt backend/models/best.pt
```

---

## 🧪 Testing

Run the test suite verifying detection algorithms, risk math, RAG retrieval, and dataset verification:
```bash
python3 tests/run_tests.py
```

Expected output:
```
test_alert_generation (__main__.TestSmartLabSafety) ... ok
test_dataset_validator (__main__.TestSmartLabSafety) ... ok
test_model_status (__main__.TestSmartLabSafety) ... ok
test_rag_knowledge_base_retrieval (__main__.TestSmartLabSafety) ... ok
test_risk_calculator_logic (__main__.TestSmartLabSafety) ... ok
test_yolo_simulation_detection (__main__.TestSmartLabSafety) ... ok
test_yolo_violation_detection (__main__.TestSmartLabSafety) ... ok

Ran 7 tests in 0.015s
OK
```

---

## 💡 Troubleshooting

- **Camera Not Accessible**: Modern browsers require HTTPS or `localhost` to grant webcam permissions (`getUserMedia`). If testing in non-secure frames, use the built-in **Inspection Lab Stream** or **Image / Video Upload** mode.
- **Model weights not detected**: Verify the weights file is named exactly `best.pt` and placed in `backend/models/best.pt`.
- **RAG Documents**: The assistant searches `.txt` files in `backend/data/safety_documents/`. Additional files placed there are automatically ingested on server start.
