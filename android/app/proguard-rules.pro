# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class ** {
    @com.getcapacitor.annotation.* <methods>;
}

# Google Play Services & AdMob
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.ads.** { *; }
-dontwarn com.google.ads.**
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ML Kit
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# Conscrypt
-dontwarn org.conscrypt.**

# DynamiteLoader
-keep class com.google.android.gms.dynamite.** { *; }
-dontwarn com.google.android.gms.dynamite.**
