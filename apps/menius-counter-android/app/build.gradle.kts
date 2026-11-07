import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Load signing credentials from keystore.properties (never committed to git)
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) load(keystorePropsFile.inputStream())
}

android {
    namespace = "com.menius.counter"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.menius.counter"
        minSdk = 26
        targetSdk = 36
        versionCode = 3
        versionName = "1.0.2"
    }

    // Only declared when keystore.properties is present. That file is gitignored,
    // so on a clean clone the casts below used to run against nulls during the
    // CONFIGURATION phase — which fails every task, `assembleDebug` included.
    // Nobody could build the app at all, signed release or not.
    if (keystorePropsFile.exists()) {
        signingConfigs {
            create("release") {
                storeFile     = file(keystoreProps["storeFile"] as String)
                storePassword = keystoreProps["storePassword"] as String
                keyAlias      = keystoreProps["keyAlias"] as String
                keyPassword   = keystoreProps["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Unsigned when there are no credentials: the build still produces an
            // APK you can inspect, and `signingConfig` stays null instead of
            // throwing. Signing a real release requires keystore.properties.
            signingConfig = signingConfigs.findByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
        // BuildConfig.VERSION_NAME → User-Agent suffix the web uses to detect app mode.
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    // Android 12+ system splash (and a compat version on 8–11): icon on #050505 until the Counter loads.
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    // lifecycleScope — arrives transitively via activity-ktx, but declared here so
    // a future version bump of that artifact can't silently take it away.
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
