# R8 configuration for the release build.
#
# Most of what this app needs is already covered by consumer rules shipped inside
# the libraries themselves:
#   - @capacitor/android keeps every @CapacitorPlugin class and its @PluginMethod
#     methods, which is what the bridge resolves by reflection at runtime.
#   - The default proguard-android-optimize.txt keeps @JavascriptInterface methods.
#   - Play Services (AdMob) and Firebase Auth ship their own keeps.
# Note that Firestore here is the JavaScript SDK running inside the WebView, so it
# is part of the web bundle and R8 never sees it.
#
# What follows is the app-specific remainder.

# Readable crash reports. AGP puts the mapping file in the AAB automatically, so
# Play Console can still de-obfuscate these traces.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor instantiates the plugin list in capacitor.plugins.json by name. The
# consumer rules cover the annotated classes; this covers the entry point the
# manifest names and the bridge classes reached only through reflection.
-keep class xyz.wheelr.app.MainActivity { *; }
-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# Annotations drive both the Capacitor bridge and the Play Services SDKs; losing
# them silently breaks plugin method dispatch rather than failing the build.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# @capacitor-firebase/authentication compiles in a handler for every provider it
# supports, including Facebook. We only enable Google, so the Facebook SDK is not
# on the classpath and R8 rightly reports the references as unresolved. The dead
# handler is never constructed at runtime; silence the warnings rather than
# pulling in an SDK we do not use.
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton
