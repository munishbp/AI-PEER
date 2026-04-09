//
//  PoseLandmarkerPlugin.swift
//  AIPEER
//
//  Custom VisionCamera frame processor plugin wrapping Google's
//  MediaPipe Pose Landmarker for real-time pose estimation.
//
//  ARCHITECTURE:
//  This plugin subclasses VisionCamera's FrameProcessorPlugin, which means
//  it receives raw CMSampleBuffer frames from the camera and returns results
//  directly to JavaScript. It's registered with VisionCamera via the
//  VISION_EXPORT_SWIFT_FRAME_PROCESSOR macro in PoseLandmarkerPlugin.m.
//
//  DETECTION MODE:
//  Uses .video running mode (synchronous detection). Each frame is processed
//  inline in the callback — MediaPipe runs inference and returns results
//  immediately. This is simpler than .liveStream (async with delegate) and
//  fast enough for real-time use (~10-20ms per frame on GPU).
//
//  RETURN FORMAT:
//  Returns an array of 33 dictionaries, one per MediaPipe landmark:
//    [{ "x": Float, "y": Float, "z": Float, "visibility": Float }, ...]
//  Coordinates are normalized 0-1 in the raw camera frame's coordinate space.
//  The TypeScript layer (VisionService.ts) handles the rotation transform
//  from landscape → portrait and the left/right label mapping.
//
//  iOS COORDINATE NOTES:
//  iOS front camera delivers CMSampleBuffers in landscape-right orientation.
//  We pass the raw buffer to MediaPipe without orientation hints — the model
//  detects poses in any orientation. The TypeScript mapping layer then rotates
//  coordinates 90° CW (x: lm.y, y: lm.x) for portrait display, and swaps
//  left/right labels to correct for the front camera mirror.
//
//  PERFORMANCE:
//  - GPU acceleration via Metal (opts.baseOptions.delegate = .GPU)
//  - ~10-20ms inference on iPhone 16 Pro Max
//  - 33 landmarks with x, y, z (depth), and visibility confidence
//
//  ──────────────────────────────────────────────────────────────────
//  ANDROID PORT NOTES:
//  ──────────────────────────────────────────────────────────────────
//  To create the equivalent Android plugin:
//
//  1. Add Maven dependency:
//     implementation 'com.google.mediapipe:tasks-vision:0.10.29'
//
//  2. Create a Kotlin class extending FrameProcessorPlugin:
//     class PoseLandmarkerPlugin(proxy: VisionCameraProxyHolder, options: Map<String, Any>?)
//       : FrameProcessorPlugin(proxy, options)
//
//  3. Initialize PoseLandmarker:
//     val opts = PoseLandmarker.PoseLandmarkerOptions.builder()
//       .setBaseOptions(BaseOptions.builder().setModelAssetPath("pose_landmarker_full.task").build())
//       .setRunningMode(RunningMode.VIDEO)
//       .setNumPoses(1)
//       .build()
//     poseLandmarker = PoseLandmarker.createFromOptions(context, opts)
//
//  4. In callback(), convert Frame to MPImage:
//     val bitmap = BitmapUtils.getBitmap(frame)  // YUV→RGB conversion needed
//     val mpImage = BitmapImageBuilder(bitmap).build()
//     val result = poseLandmarker.detectForVideo(mpImage, frame.timestamp)
//
//  5. Return landmarks as List<Map<String, Any>> (same format as iOS).
//
//  6. Register with the SAME plugin name 'poseLandmarker':
//     companion object { init { FrameProcessorPluginRegistry.add("poseLandmarker") { ... } } }
//
//  7. Place model file at: android/app/src/main/assets/pose_landmarker_full.task
//
//  The JavaScript/TypeScript code (frameProcessor.ts, VisionService.ts) is
//  cross-platform — it calls VisionCameraProxy.initFrameProcessorPlugin('poseLandmarker')
//  and handles the returned landmark array identically on both platforms.
//  The coordinate rotation may need adjustment for Android's frame orientation.
//  ──────────────────────────────────────────────────────────────────

import VisionCamera
import MediaPipeTasksVision

@objc(PoseLandmarkerPlugin)
public class PoseLandmarkerPlugin: FrameProcessorPlugin {
    /// The MediaPipe Pose Landmarker instance, initialized once and reused per frame.
    private var poseLandmarker: PoseLandmarker?

    /// The MediaPipe Hand Landmarker instance, also initialized once. Runs in
    /// parallel with the pose landmarker on the same frame so the JS layer
    /// gets pose AND up-to-2 hands from a single plugin call. Used by the
    /// gesture-confirm flow in VisionContext (open palm to start a session).
    private var handLandmarker: HandLandmarker?

    /// Called once when VisionCamera initializes the plugin.
    /// Sets up both landmarkers with GPU acceleration.
    public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
        super.init(proxy: proxy, options: options)
        setupLandmarker()
        setupHandLandmarker()
    }

    /// Initialize the MediaPipe PoseLandmarker with the bundled model file.
    /// The model file (pose_landmarker_full.task, ~9MB) must be added to the
    /// Xcode project's "Copy Bundle Resources" build phase.
    private func setupLandmarker() {
        guard let modelPath = Bundle.main.path(forResource: "pose_landmarker_full", ofType: "task") else {
            print("[PoseLandmarker] Model file not found in bundle")
            return
        }

        let opts = PoseLandmarkerOptions()
        opts.baseOptions.modelAssetPath = modelPath
        opts.baseOptions.delegate = .GPU       // Metal acceleration on iOS
        opts.runningMode = .video              // Synchronous per-frame detection
        opts.numPoses = 1                      // Track one person
        opts.minPoseDetectionConfidence = 0.3  // Lower threshold for full-body distance
        opts.minPosePresenceConfidence = 0.3
        opts.minTrackingConfidence = 0.3

        do {
            poseLandmarker = try PoseLandmarker(options: opts)
            print("[PoseLandmarker] Initialized successfully with GPU delegate")
        } catch {
            print("[PoseLandmarker] Failed to init: \(error)")
        }
    }

    /// Initialize the MediaPipe HandLandmarker for gesture detection. Reuses
    /// the same MediaPipeTasksVision pod as PoseLandmarker — no new pod needed.
    /// Confidence thresholds are slightly higher than pose because hand
    /// detection at distance has more false positives.
    private func setupHandLandmarker() {
        guard let modelPath = Bundle.main.path(forResource: "hand_landmarker", ofType: "task") else {
            print("[HandLandmarker] Model file not found in bundle")
            return
        }

        let opts = HandLandmarkerOptions()
        opts.baseOptions.modelAssetPath = modelPath
        opts.baseOptions.delegate = .GPU
        opts.runningMode = .video
        opts.numHands = 2                       // detect either hand; gesture detector accepts any
        opts.minHandDetectionConfidence = 0.4
        opts.minHandPresenceConfidence = 0.4
        opts.minTrackingConfidence = 0.4

        do {
            handLandmarker = try HandLandmarker(options: opts)
            print("[HandLandmarker] Initialized successfully with GPU delegate")
        } catch {
            print("[HandLandmarker] Failed to init: \(error)")
        }
    }

    /// Called by VisionCamera on each camera frame.
    /// Runs MediaPipe pose detection synchronously, then runs hand detection
    /// on the same frame, and returns BOTH results in a unified dict shape.
    ///
    /// Return shape:
    ///   {
    ///     "pose":  [{x,y,z,visibility?}, ...]   // 33 entries, MediaPipe pose landmarks
    ///     "hands": [                             // 0..2 hands
    ///                [{x,y,z}, ...],             // 21 entries per hand
    ///                ...
    ///              ]
    ///   }
    ///
    /// The TypeScript layer (frameProcessor.ts) unpacks this and routes pose
    /// to mapMediaPipeToPose and hands to mapMediaPipeToHands. Both pose and
    /// hand landmarks are in the same raw camera coordinate space, so the JS
    /// layer applies the SAME landscape→portrait transform to both.
    ///
    /// - Parameters:
    ///   - frame: The camera frame (CMSampleBuffer + metadata)
    ///   - arguments: Optional JS arguments (unused)
    /// - Returns: Dict with "pose" and "hands" keys, or nil if pose detection fails
    public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
        guard let landmarker = poseLandmarker else { return nil }

        // Wrap the raw CMSampleBuffer in a MediaPipe image.
        // No orientation hint — the TypeScript layer handles coordinate rotation.
        guard let image = try? MPImage(sampleBuffer: frame.buffer) else { return nil }

        let timestampMs = Int(frame.timestamp)

        // ── Pose detection ─────────────────────────────────────────────────
        // Run synchronous pose detection (.video mode).
        // Returns immediately with results — no delegate callback needed.
        guard let poseResult = try? landmarker.detect(
            videoFrame: image,
            timestampInMilliseconds: timestampMs
        ) else { return nil }

        // Extract the first (and only) person's landmarks.
        // result.landmarks is [[NormalizedLandmark]] — one array per detected person.
        guard let poseLandmarks = poseResult.landmarks.first else { return nil }

        // Convert pose to JS-compatible array of dictionaries.
        // Each landmark has x, y (normalized 0-1), z (depth), and visibility (0-1).
        var poseOutput: [[String: Any]] = []
        for lm in poseLandmarks {
            var dict: [String: Any] = [
                "x": lm.x,
                "y": lm.y,
                "z": lm.z
            ]
            if let v = lm.visibility {
                dict["visibility"] = v.floatValue
            }
            poseOutput.append(dict)
        }

        // ── Hand detection ─────────────────────────────────────────────────
        // Run hand detection on the SAME frame with the SAME timestamp. If
        // it fails or returns no hands, we still return the pose result with
        // an empty hands array — gesture detection just won't fire that frame.
        var handsOutput: [[[String: Any]]] = []
        if let handLandmarker = handLandmarker,
           let handResult = try? handLandmarker.detect(
               videoFrame: image,
               timestampInMilliseconds: timestampMs
           ) {
            for hand in handResult.landmarks {
                var handDicts: [[String: Any]] = []
                for lm in hand {
                    handDicts.append([
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z,
                    ])
                }
                handsOutput.append(handDicts)
            }
        }

        return [
            "pose": poseOutput,
            "hands": handsOutput,
        ] as [String: Any]
    }
}
