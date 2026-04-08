package com.anonymous.aipeer.poselandmarker

import android.graphics.PixelFormat
import android.media.Image
import android.util.Log
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.framework.image.MediaImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy

/**
 * Android port of ios/AIPEER/PoseLandmarkerPlugin.swift. Wraps Google MediaPipe
 * Pose Landmarker as a VisionCamera v4 frame processor plugin so the shared
 * TypeScript layer (src/vision/frameProcessor.ts) calls it identically on both
 * platforms via VisionCameraProxy.initFrameProcessorPlugin('poseLandmarker', {}).
 *
 * CONTRACT (must match iOS exactly — see PoseLandmarkerPlugin.swift):
 *   - Plugin name: "poseLandmarker" (registered in MainApplication.kt)
 *   - Input:  raw camera frame, RGBA_8888 format (because exercise-session.tsx
 *             sets pixelFormat="rgb" on the <Camera> component, which makes
 *             CameraX use OUTPUT_IMAGE_FORMAT_RGBA_8888)
 *   - Output: List<Map<String, Any>> of 33 entries, each with x/y/z (Float) and
 *             optionally visibility (Float). Returns null on any failure.
 *   - Coordinate space: raw camera sensor (landscape). The TS layer rotates 90°
 *             via `x: lm.y, y: lm.x` in VisionService.ts, so the native plugin
 *             must NOT pass ImageProcessingOptions with rotation — that would
 *             double-rotate.
 *
 * THREADING (critical):
 *   VisionCamera 4.x calls callback() on its internal videoQueue HandlerThread
 *   (single-threaded, STRATEGY_BLOCK_PRODUCER backpressure). The constructor of
 *   this class runs on whichever thread calls VisionCameraProxy.initFrameProcessorPlugin
 *   (typically the JS/worklets thread), which is NOT the videoQueue thread.
 *   MediaPipe's GPU delegate has thread affinity ("must be used on the thread
 *   that initialized the Landmarker" — Google sample) so we lazily create the
 *   PoseLandmarker on first callback() invocation. The instance is held in a
 *   companion-object @Volatile field so it survives plugin re-instantiation
 *   from React Native fast-refresh / HMR cycles (the factory lambda runs more
 *   than once per JVM lifetime in dev).
 *
 * GPU FALLBACK:
 *   First Delegate.GPU. If creation throws (some Mali / older Adreno parts),
 *   log and retry with Delegate.CPU. Mark initAttempted = true regardless to
 *   prevent re-trying on every frame.
 *
 * TIMESTAMPS:
 *   iOS frame.timestamp is already milliseconds. Android frame.timestamp is
 *   nanoseconds (forwarded straight from CameraX ImageProxy.getImageInfo().
 *   getTimestamp(), a SystemClock-derived ns value). MediaPipe's detectForVideo
 *   expects MILLISECONDS — divide by 1_000_000L. We additionally guard against
 *   the same-millisecond collision (two frames within <1 ms of each other
 *   would produce the same ms value after integer division, triggering
 *   MediaPipe's monotonicity rejection) by force-advancing the timestamp.
 *
 * NO MANUAL CLEANUP:
 *   Do NOT call mediaImage.close() or mpImage.close(). VisionCamera retains
 *   the underlying ImageProxy via reference counting and releases it after
 *   callback() returns; closing it ourselves would corrupt the next frame.
 */
@DoNotStrip
@Keep
class PoseLandmarkerFrameProcessorPlugin(
    proxy: VisionCameraProxy,
    @Suppress("UNUSED_PARAMETER") options: Map<String, Any>?
) : FrameProcessorPlugin() {

    // Application context, captured from VisionCameraProxy at construction time.
    // Needed by PoseLandmarker.createFromOptions() to read the bundled model asset.
    // VERIFY ON FIRST BUILD: VisionCameraProxy must expose `context` publicly
    // (either as a Kotlin property or a Java getter). If it does not compile,
    // the alternative is to pass the Context through the registry lambda from
    // MainApplication.kt where `applicationContext` is directly available.
    private val context = proxy.context.applicationContext

    @DoNotStrip
    @Keep
    override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
        // ── Lazy GPU-thread-affine init ────────────────────────────────────
        // First call (per process lifetime): try GPU, fall back to CPU. The
        // shared landmarker is held in the companion object so HMR / fast
        // refresh cycles that re-invoke the registry factory don't leak a
        // new instance per reload.
        if (!initAttempted) {
            synchronized(initLock) {
                if (!initAttempted) {
                    val gpu = createLandmarker(Delegate.GPU)
                    sharedLandmarker = gpu ?: createLandmarker(Delegate.CPU)
                    initAttempted = true
                    if (sharedLandmarker != null) {
                        val delegateName = if (gpu != null) "GPU" else "CPU"
                        Log.i(TAG, "PoseLandmarker initialized with delegate=$delegateName")
                    } else {
                        Log.e(TAG, "PoseLandmarker failed to initialize on both GPU and CPU")
                    }
                }
            }
        }

        val landmarker = sharedLandmarker ?: return null

        // ── Frame → MPImage ────────────────────────────────────────────────
        // VisionCamera Frame.getImage() throws FrameInvalidError. Catch Throwable
        // because FrameInvalidError's superclass (Exception vs Throwable) is not
        // documented stably across VisionCamera point releases.
        val mediaImage: Image = try {
            frame.image
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to extract media image from frame", t)
            return null
        } ?: return null

        // Defensive: confirm CameraX is delivering RGBA_8888 (set by pixelFormat="rgb"
        // in exercise-session.tsx:405). MediaImageBuilder accepts any format silently
        // and MediaPipe's downstream packet creator may behave incorrectly for
        // non-RGBA formats. Catch a regression where pixelFormat is removed from
        // the Camera component by failing loudly here.
        // (PixelFormat.RGBA_8888 = 1; CameraX produces this constant when
        // OUTPUT_IMAGE_FORMAT_RGBA_8888 is configured.)
        val format = mediaImage.format
        if (format != PixelFormat.RGBA_8888) {
            Log.e(TAG, "Frame format $format is not RGBA_8888 — " +
                       "ensure pixelFormat=\"rgb\" on the <Camera> component " +
                       "in exercise-session.tsx:405")
            return null
        }

        val mpImage: MPImage = try {
            MediaImageBuilder(mediaImage).build()
        } catch (t: Throwable) {
            Log.w(TAG, "MediaImageBuilder threw unexpectedly", t)
            return null
        }

        // ── Run inference ──────────────────────────────────────────────────
        // detectForVideo(image, timestampMs) — synchronous overload, NO
        // ImageProcessingOptions so MediaPipe leaves the image in its native
        // sensor orientation. The TS layer in VisionService.ts handles rotation
        // via `x: lm.y, y: lm.x` — passing rotation here would double-rotate
        // and break iOS parity.
        //
        // Timestamp: VisionCamera Android frame.timestamp is in nanoseconds;
        // MediaPipe expects milliseconds. Divide by 1_000_000L. Then ensure
        // strict monotonicity to defend against the rare case of two frames
        // arriving within the same millisecond (which would collide after
        // integer division and trigger MediaPipe's IllegalArgumentException).
        var timestampMs = frame.timestamp / 1_000_000L
        if (timestampMs <= lastTimestampMs) {
            timestampMs = lastTimestampMs + 1
        }
        lastTimestampMs = timestampMs

        val result: PoseLandmarkerResult = try {
            landmarker.detectForVideo(mpImage, timestampMs)
        } catch (t: Throwable) {
            // Catch Throwable (not RuntimeException) so OutOfMemoryError and
            // other Errors during inference don't crash the camera pipeline.
            // Match iOS behavior: return null, never throw out of callback().
            Log.w(TAG, "detectForVideo failed", t)
            return null
        }

        // ── Extract landmarks ──────────────────────────────────────────────
        // result.landmarks() is List<List<NormalizedLandmark>> — outer list
        // is per-person (numPoses=1 → max 1 entry). Take the first person.
        val landmarks = result.landmarks().firstOrNull() ?: return null
        if (landmarks.size < 33) return null

        // ── Build JS-bridge-friendly output ────────────────────────────────
        // Must be List<Map<String, Any>> with String keys and Double values.
        // VisionCamera v4's JSI bridge on Android does NOT support java.lang.Float
        // ("Cannot convert Java type 'class java.lang.Float' to jsi::Value!") so
        // we explicitly upcast each primitive float to Double before boxing into
        // the map. JS receives plain `number` either way, so iOS parity is
        // preserved at the contract level.
        val output = ArrayList<Map<String, Any>>(landmarks.size)
        for (lm in landmarks) {
            val dict = HashMap<String, Any>(4)
            dict["x"] = lm.x().toDouble()
            dict["y"] = lm.y().toDouble()
            dict["z"] = lm.z().toDouble()
            // NormalizedLandmark.visibility() returns java.util.Optional<Float>.
            // Match iOS: include the key only when visibility is present.
            lm.visibility().ifPresent { dict["visibility"] = it.toDouble() }
            output.add(dict)
        }
        return output
    }

    /**
     * Build a PoseLandmarker with the given delegate. Returns null on failure
     * (logged) so the caller can fall back. Options mirror iOS exactly:
     *   modelAssetPath = "pose_landmarker_full.task"
     *   delegate       = parameter
     *   runningMode    = VIDEO  (synchronous, matches iOS .video — NOT LIVE_STREAM
     *                            which would force async listener-based results)
     *   numPoses       = 1
     *   minPoseDetectionConfidence = 0.3f
     *   minPosePresenceConfidence  = 0.3f
     *   minTrackingConfidence      = 0.3f
     */
    private fun createLandmarker(delegate: Delegate): PoseLandmarker? {
        return try {
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("pose_landmarker_full.task")
                .setDelegate(delegate)
                .build()
            val options = PoseLandmarker.PoseLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.VIDEO)
                .setNumPoses(1)
                .setMinPoseDetectionConfidence(0.3f)
                .setMinPosePresenceConfidence(0.3f)
                .setMinTrackingConfidence(0.3f)
                .build()
            PoseLandmarker.createFromOptions(context, options)
        } catch (t: Throwable) {
            // GPU delegate creation throws RuntimeException on unsupported
            // hardware; missing/corrupt model throws IllegalStateException;
            // OOM during shader compile throws Error. Catch Throwable for all.
            Log.w(TAG, "createLandmarker(delegate=$delegate) failed", t)
            null
        }
    }

    companion object {
        private const val TAG = "PoseLandmarker"

        // Process-wide singletons. Held here (not as instance fields) so that
        // React Native fast-refresh / HMR re-invoking the registry factory
        // never creates a second PoseLandmarker that leaks ~50 MB of native
        // memory per reload. Marked @Volatile for safe publication across the
        // JS/worklets thread (where the factory runs) and the videoQueue thread
        // (where callback() runs).
        @Volatile private var sharedLandmarker: PoseLandmarker? = null
        @Volatile private var initAttempted: Boolean = false

        // Lock object for double-checked locking around lazy init.
        private val initLock = Any()

        // Last timestamp accepted by MediaPipe (in ms). Used to enforce strict
        // monotonicity even when two frames arrive within the same millisecond.
        // Volatile is sufficient because callback() runs on a single thread
        // (VisionCamera videoQueue) — only the visibility guarantee is needed,
        // not atomicity.
        @Volatile private var lastTimestampMs: Long = -1L
    }
}
