package com.livingrelay.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class EnvironmentFlavorTest {
    @Test
    fun apiBaseUrlMatchesCurrentFlavor() {
        val expected = when (BuildConfig.FLAVOR) {
            "staging" -> "https://staging.livingrelay.com"
            "production" -> "https://app.livingrelay.com"
            else -> error("Unexpected flavor ${BuildConfig.FLAVOR}")
        }

        assertEquals(expected, BuildConfig.API_BASE_URL)
    }

    @Test
    fun applicationIdMatchesCurrentFlavor() {
        val expected = when (BuildConfig.FLAVOR) {
            "staging" -> "adminstacksort.livingrelay.staging"
            "production" -> "adminstacksort.livingrelay"
            else -> error("Unexpected flavor ${BuildConfig.FLAVOR}")
        }

        assertEquals(expected, BuildConfig.APPLICATION_ID)
    }

    @Test
    fun productionFlavorDoesNotCarryStagingSuffix() {
        if (BuildConfig.FLAVOR == "production") {
            assertFalse(BuildConfig.APPLICATION_ID.endsWith(".staging"))
        }
    }
}
