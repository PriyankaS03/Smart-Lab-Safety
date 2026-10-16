import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HardDrive,
  Sparkles,
  FileCode,
  Check,
  Copy,
  Upload,
  ImageIcon,
  ScanSearch,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Info,
  Camera,
  Video,
  VideoOff,
  Play,
  Square,
  RefreshCw,
  Sliders,
  Shield,
  Eye,
  SwitchCamera
} from "lucide-react";
import { DetectionResult } from "../../types";
import { api } from "../../services/api";

interface PPEDetectionViewProps {
  isDemoMode: boolean;
  onDetectionUpdate?: (result: DetectionResult) => void;
}

const CLASS_COLORS: Record<string, { stroke: string; fill: string; label: string }> = {
  person:         { stroke: "#2563eb", fill: "rgba(37,99,235,0.12)",   label: "Person" },
  lab_coat:       { stroke: "#10b981", fill: "rgba(16,185,129,0.15)",  label: "Lab Coat" },
  gloves:         { stroke: "#8b5cf6", fill: "rgba(139,92,246,0.15)",  label: "Gloves" },
  safety_goggles: { stroke: "#06b6d4", fill: "rgba(6,182,212,0.18)",   label: "Safety Goggles" },
  mask:           { stroke: "#f59e0b", fill: "rgba(245,158,11,0.18)",  label: "Mask" },
  safety_shoes:   { stroke: "#ec4899", fill: "rgba(236,72,153,0.15)",  label: "Safety Shoes" },
};
const DEFAULT_COLOR = { stroke: "#64748b", fill: "rgba(100,116,139,0.14)", label: "Object" };

function drawBoxesOnCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  boxes: DetectionResult["raw_boxes"],
  showLabels: boolean = true
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  boxes.forEach(box => {
    const c = CLASS_COLORS[box.class_name] || DEFAULT_COLOR;
    ctx.save();
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = c.fill;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.width, box.height, 4);
    ctx.fill();
    ctx.stroke();

    if (showLabels) {
      const label = `${c.label} ${(box.confidence * 100).toFixed(0)}%`;
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      const tagH = 20;
      const tagY = Math.max(0, box.y - tagH);
      ctx.fillStyle = c.stroke;
      ctx.beginPath();
      ctx.roundRect(box.x, tagY, tw + 10, tagH, [3, 3, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, box.x + 5, tagY + 14);
    }
    ctx.restore();
  });
}

export const PPEDetectionView: React.FC<PPEDetectionViewProps> = ({ isDemoMode, onDetectionUpdate }) => {
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"webcam" | "upload" | "demo">("webcam");

  // ── Webcam State ────────────────────────────────────────────────────────────
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isWebcamDetecting, setIsWebcamDetecting] = useState<boolean>(false);
  const [isAutoScanning, setIsAutoScanning] = useState<boolean>(false);
  const [webcamResult, setWebcamResult] = useState<DetectionResult | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.45);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoScanIntervalRef = useRef<number | null>(null);

  // ── Upload State ────────────────────────────────────────────────────────────
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImgEl, setUploadedImgEl] = useState<HTMLImageElement | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [uploadResult, setUploadResult] = useState<DetectionResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Demo State ──────────────────────────────────────────────────────────────
  const [activeScenario, setActiveScenario] = useState<string>("compliant");
  const [demoResult, setDemoResult] = useState<DetectionResult | null>(null);
  const demoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadModelStatus();
    runDemoInference("compliant");
    loadDevices();
    return () => {
      stopCamera();
    };
  }, []);

  const loadDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const allDevs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = allDevs.filter(d => d.kind === "videoinput");
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      }
    } catch (e) {
      console.warn("Could not list video devices:", e);
    }
  };

  const loadModelStatus = async () => {
    try {
      setModelStatus(await api.getModelStatus());
    } catch (e) {
      console.error(e);
    }
  };

  // ── Webcam Controls ────────────────────────────────────────────────────────
  const startCamera = async (deviceIdOverride?: string) => {
    setCameraError(null);
    try {
      const devId = deviceIdOverride || selectedDeviceId;
      const constraints: MediaStreamConstraints = {
        video: devId
          ? { deviceId: { exact: devId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error("Webcam access error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please enable camera access in browser permissions, or switch to Upload Image mode."
          : `Camera error: ${err.message || "Device could not be opened"}`
      );
      setIsStreaming(false);
    }
  };

  const stopCamera = () => {
    if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
    }
    setIsAutoScanning(false);

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);

    // Clear canvas overlay
    if (webcamCanvasRef.current) {
      const ctx = webcamCanvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, webcamCanvasRef.current.width, webcamCanvasRef.current.height);
    }
  };

  const captureFrameBase64 = (): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

    const offCanvas = document.createElement("canvas");
    offCanvas.width = video.videoWidth || 640;
    offCanvas.height = video.videoHeight || 480;
    const ctx = offCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);
    return offCanvas.toDataURL("image/jpeg", 0.85);
  };

  const runWebcamDetection = async () => {
    if (!isStreaming || isWebcamDetecting) return;
    const base64 = captureFrameBase64();
    if (!base64) return;

    setIsWebcamDetecting(true);
    setCameraError(null);
    try {
      const res = await api.runDetection({
        image_base64: base64,
        is_demo: false,
        source: "webcam",
        confidence_threshold: confidenceThreshold,
      });

      setWebcamResult(res);
      setLastScanTime(new Date().toLocaleTimeString());

      if (onDetectionUpdate) {
        onDetectionUpdate(res);
      }

      // Draw bounding boxes on canvas
      const canvas = webcamCanvasRef.current;
      const video = videoRef.current;
      if (canvas && video && showBoxes) {
        canvas.width = video.clientWidth || 640;
        canvas.height = video.clientHeight || 480;

        // Scale factors if raw coordinates are based on video natural size
        const scaleX = canvas.width / (video.videoWidth || 640);
        const scaleY = canvas.height / (video.videoHeight || 480);

        const scaledBoxes = res.raw_boxes.map(b => ({
          ...b,
          x: b.x * scaleX,
          y: b.y * scaleY,
          width: b.width * scaleX,
          height: b.height * scaleY
        }));

        drawBoxesOnCanvas(canvas, null, scaledBoxes, showLabels);
      }
    } catch (err: any) {
      console.error("Webcam detection failed:", err);
      setCameraError(err.message || "Failed to run AI detection on webcam frame.");
    } finally {
      setIsWebcamDetecting(false);
    }
  };

  // Toggle Continuous Auto-Scan
  const toggleAutoScan = () => {
    if (isAutoScanning) {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
      setIsAutoScanning(false);
    } else {
      if (!isStreaming) {
        startCamera().then(() => {
          setIsAutoScanning(true);
          runWebcamDetection();
          autoScanIntervalRef.current = window.setInterval(runWebcamDetection, 2500);
        });
      } else {
        setIsAutoScanning(true);
        runWebcamDetection();
        autoScanIntervalRef.current = window.setInterval(runWebcamDetection, 2500);
      }
    }
  };

  const clearWebcamOverlay = () => {
    if (webcamCanvasRef.current) {
      const ctx = webcamCanvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, webcamCanvasRef.current.width, webcamCanvasRef.current.height);
    }
    setWebcamResult(null);
  };

  // ── Demo Inference ──────────────────────────────────────────────────────────
  const runDemoInference = async (scen: string) => {
    setActiveScenario(scen);
    try {
      const res = await api.runDetection({
        is_demo: true,
        scenario: scen,
        confidence_threshold: 0.45,
        source: "demo"
      });
      setDemoResult(res);
      setTimeout(() => {
        if (demoCanvasRef.current) drawBoxesOnCanvas(demoCanvasRef.current, null, res.raw_boxes);
      }, 50);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Upload Controls ─────────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadError(null);
    setUploadResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);
      const img = new Image();
      img.onload = () => {
        setUploadedImgEl(img);
        const canvas = uploadCanvasRef.current;
        if (canvas) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")?.drawImage(img, 0, 0);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const runUploadDetection = async () => {
    if (!uploadedImage) return;
    setIsDetecting(true);
    setUploadError(null);
    try {
      const res = await api.runDetection({
        image_base64: uploadedImage,
        is_demo: false,
        source: "image_upload",
        confidence_threshold: confidenceThreshold
      });
      setUploadResult(res);
      if (onDetectionUpdate) {
        onDetectionUpdate(res);
      }
      const canvas = uploadCanvasRef.current;
      if (canvas && uploadedImgEl) {
        canvas.width = uploadedImgEl.naturalWidth;
        canvas.height = uploadedImgEl.naturalHeight;
        drawBoxesOnCanvas(canvas, uploadedImgEl, res.raw_boxes);
      }
    } catch (e: any) {
      setUploadError(e?.message || "Detection failed. Please try again.");
    } finally {
      setIsDetecting(false);
    }
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setUploadedImgEl(null);
    setUploadResult(null);
    setUploadError(null);
    const canvas = uploadCanvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const copyYaml = () => {
    navigator.clipboard.writeText("path: ../dataset\ntrain: images/train\nval: images/val\nnc: 5\nnames:\n  0: person\n  1: lab_coat\n  2: gloves\n  3: safety_goggles\n  4: mask");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Active result for right summary card
  const activeResult = activeTab === "webcam" ? webcamResult : activeTab === "upload" ? uploadResult : demoResult;

  const riskBadge = (level?: string) => {
    if (level === "LOW")      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (level === "MEDIUM")   return "text-amber-700 bg-amber-50 border-amber-200";
    if (level === "HIGH")     return "text-orange-700 bg-orange-50 border-orange-200";
    if (level === "CRITICAL") return "text-rose-700 bg-rose-50 border-rose-200";
    return "text-slate-700 bg-slate-50 border-slate-200";
  };

  const complianceColor = (v: number) => v >= 90 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-rose-500";
  const complianceText  = (v: number) => v >= 90 ? "text-emerald-400" : v >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">AI PPE Detection & Compliance Engine</h2>
            <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-md border border-blue-200">
              {modelStatus?.roboflow_connected ? "Roboflow Model Active" : "5 Target Classes"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-person computer vision detection for <strong>lab coats</strong>, <strong>gloves</strong>, <strong>safety goggles</strong>, and <strong>masks</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Model: <code className="font-mono text-[11px] font-bold text-slate-900">{modelStatus?.roboflow_model_id || "lab-ppe-3ox2k/1"}</code></span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${modelStatus?.roboflow_connected ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            <span className={`w-2 h-2 rounded-full ${modelStatus?.roboflow_connected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
            <span>{modelStatus?.status_label || "Checking..."}</span>
          </div>
        </div>
      </div>

      {/* Class Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 0, name: "person",         desc: "Researcher / Student",       color: "border-blue-300 bg-blue-50/60 text-blue-900",       dot: "bg-blue-600" },
          { id: 1, name: "lab_coat",       desc: "Buttoned Protective Coat",   color: "border-emerald-300 bg-emerald-50/60 text-emerald-900", dot: "bg-emerald-600" },
          { id: 2, name: "gloves",         desc: "Nitrile Handwear",           color: "border-purple-300 bg-purple-50/60 text-purple-900",   dot: "bg-purple-600" },
          { id: 3, name: "safety_goggles", desc: "ANSI Z87.1 Splash Eyewear", color: "border-cyan-300 bg-cyan-50/60 text-cyan-900",         dot: "bg-cyan-600" },
          { id: 4, name: "mask",           desc: "Face Mask / Respirator",     color: "border-amber-300 bg-amber-50/60 text-amber-900",      dot: "bg-amber-600" },
        ].map(cls => (
          <div key={cls.id} className={`p-3 rounded-xl border ${cls.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Class {cls.id}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${cls.dot}`} />
            </div>
            <div className="font-bold text-xs mt-1">{cls.name}</div>
            <div className="text-[10px] opacity-75 mt-0.5">{cls.desc}</div>
          </div>
        ))}
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("webcam")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "webcam"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Webcam Feed</span>
            {isStreaming && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "upload"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>

          <button
            onClick={() => setActiveTab("demo")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "demo"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo Scenarios</span>
          </button>
        </div>

        {/* Global Detection Settings pill */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            Confidence: <strong>{(confidenceThreshold * 100).toFixed(0)}%</strong>
          </span>
          <input
            type="range"
            min="0.2"
            max="0.85"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Main Grid: Viewport / Controls & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Feed / Canvas Viewport */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── TAB 1: WEBCAM FEED ─────────────────────────────────────────────── */}
          {activeTab === "webcam" && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md aspect-video flex items-center justify-center">
                {/* Live Video element */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover ${!isStreaming ? "hidden" : "block"}`}
                />

                {/* Overlay Canvas for Bounding Boxes */}
                <canvas
                  ref={webcamCanvasRef}
                  className={`absolute inset-0 w-full h-full pointer-events-none ${!isStreaming ? "hidden" : "block"}`}
                />

                {/* Idle / Camera Off State */}
                {!isStreaming && (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4">
                      <Camera className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="font-bold text-slate-200 text-sm">Webcam is Inactive</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Start your camera to analyze real-time lab worker PPE compliance or click <strong>Auto-Scan</strong> for continuous monitoring.
                    </p>
                    <button
                      onClick={() => startCamera()}
                      className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Webcam Feed</span>
                    </button>
                  </div>
                )}

                {/* Streaming Status Badges overlay */}
                {isStreaming && (
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-white">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-mono font-medium">LIVE WEBCAM</span>
                      {isAutoScanning && (
                        <>
                          <span className="text-slate-600">|</span>
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Continuous Auto-Scan
                          </span>
                        </>
                      )}
                    </div>

                    {webcamResult && (
                      <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-white flex items-center gap-2">
                        <span className={`font-bold ${complianceText(webcamResult.overall_compliance)}`}>
                          {webcamResult.overall_compliance}% Compliance
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-300 font-mono text-[11px]">
                          {lastScanTime || "Active"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Camera Error Alert */}
              {cameraError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Camera Notice: </span>
                    <span>{cameraError}</span>
                  </div>
                </div>
              )}

              {/* Webcam Control Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {isStreaming ? (
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 text-rose-500 fill-current" />
                      <span>Stop Camera</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => startCamera()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Camera</span>
                    </button>
                  )}

                  <button
                    onClick={runWebcamDetection}
                    disabled={!isStreaming || isWebcamDetecting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    {isWebcamDetecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <ScanSearch className="w-3.5 h-3.5" />
                        <span>Capture & Detect PPE</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={toggleAutoScan}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isAutoScanning
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAutoScanning ? "animate-spin text-amber-600" : ""}`} />
                    <span>{isAutoScanning ? "Stop Auto-Scan" : "Auto-Scan (Loop)"}</span>
                  </button>

                  {webcamResult && (
                    <button
                      onClick={clearWebcamOverlay}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Clear detection overlays"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Device Selector */}
                {devices.length > 1 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <SwitchCamera className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                        if (isStreaming) {
                          startCamera(e.target.value);
                        }
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {devices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: UPLOAD IMAGE ────────────────────────────────────────────── */}
          {activeTab === "upload" && (
            <>
              {!uploadedImage && (
                <div
                  onDrop={onDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-16 px-8 ${
                    dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 text-sm">Drop an image here or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP — any lab photo with workers</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} id="ppe-image-upload" />
                </div>
              )}

              {uploadedImage && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-md">
                    <canvas ref={uploadCanvasRef} className="w-full h-auto block" style={{ maxHeight: 480 }} />
                    {uploadResult ? (
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-white">
                        <ScanSearch className="w-3.5 h-3.5 text-blue-400" />
                        <span>Real Inference</span>
                        <span className="text-slate-500">|</span>
                        <span className={`font-bold ${complianceText(uploadResult.overall_compliance)}`}>{uploadResult.overall_compliance}% Compliance</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-300">{uploadResult.raw_boxes.length} boxes</span>
                      </div>
                    ) : (
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-white">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Image ready — click <strong>Run Detection</strong></span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={runUploadDetection} disabled={isDetecting} id="run-detection-btn"
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                      {isDetecting ? <><Loader2 className="w-4 h-4 animate-spin" />Running Detection...</> : <><ScanSearch className="w-4 h-4" />Run Detection</>}
                    </button>
                    <button onClick={clearUpload}
                      className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />Upload New Image
                    </button>
                  </div>
                  {uploadError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{uploadError}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── TAB 3: DEMO SCENARIOS ──────────────────────────────────────────── */}
          {activeTab === "demo" && (
            <>
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md" style={{ minHeight: 340 }}>
                <svg className="w-full h-full opacity-35 absolute inset-0" viewBox="0 0 640 480">
                  <rect x="40" y="240" width="560" height="200" fill="#334155" />
                  <rect x="60" y="60" width="520" height="180" fill="none" stroke="#64748b" strokeWidth="4" />
                  <line x1="60" y1="180" x2="580" y2="180" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 4" />
                  <circle cx="225" cy="140" r="30" fill="#64748b" opacity="0.7" />
                  <path d="M180,240 Q185,170 225,170 Q265,170 270,240 Z" fill="#94a3b8" opacity="0.8" />
                  <circle cx="515" cy="150" r="28" fill="#64748b" opacity="0.7" />
                  <path d="M470,250 Q475,180 515,180 Q555,180 560,250 Z" fill="#94a3b8" opacity="0.8" />
                </svg>
                <canvas ref={demoCanvasRef} width={640} height={480} className="absolute inset-0 w-full h-full" />
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-white">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Scenario: <strong>{activeScenario}</strong></span>
                  <span className="text-slate-500">|</span>
                  <span className={`font-bold ${complianceText(demoResult?.overall_compliance ?? 0)}`}>{demoResult?.overall_compliance}% Compliance</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700">Test Scenarios:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "compliant",           label: "1. Full Compliance (100%)",       active: "bg-emerald-600" },
                    { key: "missing_goggles",     label: "2. Missing Goggles (75%)",        active: "bg-amber-600" },
                    { key: "missing_coat_gloves", label: "3. Missing Coat & Gloves (50%)", active: "bg-orange-600" },
                    { key: "multi_violation",     label: "4. Multi-Violation (25%)",        active: "bg-rose-600" },
                  ].map(s => (
                    <button key={s.key} onClick={() => runDemoInference(s.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeScenario === s.key ? `${s.active} text-white shadow-xs` : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Detection Summary & Violations */}
        <div className="space-y-4">
          {activeResult && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Detection Summary</h3>
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold ${riskBadge(activeResult.risk_level)}`}>
                <span>Risk Level</span><span>{activeResult.risk_level}</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-500">Compliance</span>
                <span className="font-bold text-slate-900">{activeResult.overall_compliance}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${complianceColor(activeResult.overall_compliance)}`} style={{ width: `${activeResult.overall_compliance}%` }} />
              </div>

              {activeResult.alerts_triggered.length > 0 ? (
                <div className="space-y-1.5">
                  {activeResult.alerts_triggered.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg">
                      <AlertTriangle className="w-3 h-3 shrink-0" />{a}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />All required PPE detected
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Detected Objects in View</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Persons",    val: activeResult?.people_count  ?? 0, color: "text-blue-600" },
                { label: "Lab Coats", val: activeResult?.lab_coat_count ?? 0, color: "text-emerald-600" },
                { label: "Gloves",    val: activeResult?.gloves_count   ?? 0, color: "text-purple-600" },
                { label: "Goggles",   val: activeResult?.goggles_count  ?? 0, color: "text-cyan-600" },
              ].map(item => (
                <div key={item.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600">{item.label}</span>
                  <strong className={`text-sm ${item.color}`}>{item.val}</strong>
                </div>
              ))}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between col-span-2">
                <span className="text-slate-600">Masks / Respirators</span>
                <strong className="text-sm text-amber-600">{activeResult?.mask_count ?? 0}</strong>
              </div>
            </div>
          </div>

          {activeResult && activeResult.raw_boxes.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Raw Coordinate Detections</h3>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 text-[11px] font-mono">
                {activeResult.raw_boxes.map((box, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div><span className="font-bold text-slate-800">{box.class_name}</span><span className="text-slate-400 ml-1">#c{box.class_id}</span></div>
                    <div className="text-slate-500">[{box.x.toFixed(0)},{box.y.toFixed(0)} {box.width.toFixed(0)}x{box.height.toFixed(0)}] {(box.confidence * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-600" /><span>YOLOv8 data.yaml</span>
              </span>
              <button onClick={copyYaml} className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-slate-600 text-[11px]">
              Trained weights placed at <code className="bg-white px-1 py-0.5 rounded text-indigo-900 font-mono">backend/models/best.pt</code> are loaded on server startup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
