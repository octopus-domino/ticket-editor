plugins { id("com.android.application") }
android {
    namespace = "site.codoc.mobile"
    compileSdk = 36
    defaultConfig { applicationId = "site.codoc.mobile"; minSdk = 26; targetSdk = 36; versionCode = 1; versionName = "1.0.0" }
    signingConfigs {
        create("release") {
            val path = System.getenv("CODOC_KEYSTORE_PATH")
            if (!path.isNullOrBlank()) {
                storeFile = file(path); storePassword = System.getenv("CODOC_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("CODOC_KEY_ALIAS"); keyPassword = System.getenv("CODOC_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release { isMinifyEnabled = true; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"); signingConfig = signingConfigs.getByName("release") }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
dependencies {
    implementation("androidx.fragment:fragment:1.8.6")
    implementation("androidx.webkit:webkit:1.13.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.core:core:1.16.0")
}
