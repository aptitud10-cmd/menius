# Add project-specific ProGuard rules here.

# The Counter web calls these by name (window.MeniusAndroid.*). If R8 renamed or
# dropped them, printing / disconnect would fail silently at runtime.
-keepclassmembers class com.menius.counter.MeniusJsBridge {
    @android.webkit.JavascriptInterface <methods>;
}
