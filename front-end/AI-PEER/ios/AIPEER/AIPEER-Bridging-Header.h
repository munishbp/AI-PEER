//
//  AIPEER-Bridging-Header.h
//
//  Exposes VisionCamera's ObjC headers to Swift so that
//  PoseLandmarkerPlugin.swift can subclass FrameProcessorPlugin.
//
//  FrameProcessorPlugin.h  — Base class for custom frame processor plugins
//  FrameProcessorPluginRegistry.h — Global registry where plugins are registered
//  Frame.h — The Frame object with CMSampleBuffer, orientation, dimensions
//  VisionCameraProxyHolder.h — Proxy for communicating back to JS
//

#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <VisionCamera/VisionCameraProxyHolder.h>
