//
//  PoseLandmarkerPlugin.m
//  AIPEER
//
//  ObjC registration file for the PoseLandmarkerPlugin Swift class.
//
//  The VISION_EXPORT_SWIFT_FRAME_PROCESSOR macro registers the Swift class
//  with VisionCamera's plugin registry at app launch. This allows JavaScript
//  to call: VisionCameraProxy.initFrameProcessorPlugin('poseLandmarker', {})
//
//  The first argument (PoseLandmarkerPlugin) is the Swift class name.
//  The second argument (poseLandmarker) is the plugin name used in JS.
//  These must match exactly — the class name must match the @objc(PoseLandmarkerPlugin)
//  annotation on the Swift class, and the plugin name must match the JS call.
//
//  For Android: registration is done in a Kotlin companion object using
//  FrameProcessorPluginRegistry.add("poseLandmarker") { ... }
//  The plugin name "poseLandmarker" must be identical on both platforms.
//

#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import "AIPEER-Swift.h"

VISION_EXPORT_SWIFT_FRAME_PROCESSOR(PoseLandmarkerPlugin, poseLandmarker)
