plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.livingrelay.app"
    compileSdk = 35

    val releaseKeystorePath = providers.environmentVariable("LR_ANDROID_KEYSTORE_PATH").orNull
    val releaseKeystorePassword = providers.environmentVariable("LR_ANDROID_KEYSTORE_PASSWORD").orNull
    val releaseKeyAlias = providers.environmentVariable("LR_ANDROID_KEY_ALIAS").orNull
    val releaseKeyPassword = providers.environmentVariable("LR_ANDROID_KEY_PASSWORD").orNull

    defaultConfig {
        applicationId = "adminstacksort.livingrelay"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    flavorDimensions += "environment"
    productFlavors {
        create("staging") {
            dimension = "environment"
            applicationIdSuffix = ".staging"
            resValue("string", "app_name", "LivingRelay Staging")
            buildConfigField("String", "API_BASE_URL", "\"https://staging.livingrelay.com\"")
        }
        create("production") {
            dimension = "environment"
            resValue("string", "app_name", "LivingRelay")
            buildConfigField("String", "API_BASE_URL", "\"https://app.livingrelay.com\"")
        }
    }

    signingConfigs {
        if (
            !releaseKeystorePath.isNullOrBlank() &&
            !releaseKeystorePassword.isNullOrBlank() &&
            !releaseKeyAlias.isNullOrBlank() &&
            !releaseKeyPassword.isNullOrBlank()
        ) {
            create("release") {
                storeFile = file(releaseKeystorePath)
                storePassword = releaseKeystorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            ndk {
                debugSymbolLevel = "SYMBOL_TABLE"
            }
            signingConfig = signingConfigs.findByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }
}

configurations.configureEach {
    exclude(group = "androidx.graphics", module = "graphics-path")
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    testImplementation("junit:junit:4.13.2")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
