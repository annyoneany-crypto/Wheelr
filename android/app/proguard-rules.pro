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

# No blanket keep for Capacitor. `-keep class com.getcapacitor.** { *; }` used to
# sit here, and it froze the whole runtime: R8 could neither shrink nor optimize
# any of it, which is what Play Console's "improve memory and performance with R8"
# notice measures. What the bridge reaches by reflection is already kept by the
# consumer rules of @capacitor/android (plugin classes, @PluginMethod and callback
# methods) and by proguard-android-optimize.txt (@JavascriptInterface methods);
# MainActivity is kept by the rules AAPT generates from the manifest.
# If a plugin ever stops registering in a release build, add a keep for that
# plugin's class — never the whole package again.

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
