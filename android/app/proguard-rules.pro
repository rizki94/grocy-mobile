# Add project specific ProGuard rules here.
# Grocy Mobile App & Custom Native Modules
-keep class com.grocymobile.** { *; }
-keepclassmembers class com.grocymobile.** { *; }

# React Native standard rules
-keep class com.facebook.react.** { *; }
-keepclassmembers class com.facebook.react.** { *; }
-keep class com.facebook.react.bridge.JavaScriptModule { *; }
-keep class com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
   @com.facebook.react.bridge.ReactMethod *;
   @com.facebook.react.bridge.ReactMethodSync *;
}
-keepclassmembers class * extends com.facebook.react.uimanager.ViewManager {
   @com.facebook.react.uimanager.annotations.ReactProp *;
   @com.facebook.react.uimanager.annotations.ReactPropGroup *;
}
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# OkHttp & Okio
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Reanimated & Worklets
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }

# Vision Camera
-keep class com.mrousavy.camera.** { *; }
-keepclassmembers class com.mrousavy.camera.** { *; }
-dontwarn com.mrousavy.camera.**

# Firebase & Play Services
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
-dontwarn com.google.firebase.**

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Safe Area Context & Screens & Gesture Handler
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# Geolocation & Device Info & Image Picker
-keep class com.agontuk.RNFusedLocation.** { *; }
-keep class com.learnium.RNDeviceInfo.** { *; }
-keep class com.imagepicker.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
