package com.example.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = EmeraldGreen,
    onPrimary = White,
    primaryContainer = EmeraldSoftBg,
    onPrimaryContainer = EmeraldDark,
    secondary = CyanBright,
    onSecondary = White,
    secondaryContainer = Slate100,
    onSecondaryContainer = Slate900,
    tertiary = AmberGold,
    onTertiary = White,
    background = BackgroundCleanLight,
    onBackground = Slate950,
    surface = White,
    onSurface = Slate950,
    surfaceVariant = Slate50,
    onSurfaceVariant = Slate700,
    outline = Slate200,
    outlineVariant = Slate100,
    error = RoseRed,
    onError = White
)

private val DarkColorScheme = darkColorScheme(
    primary = EmeraldGreen,
    onPrimary = Slate950,
    primaryContainer = Slate900,
    onPrimaryContainer = EmeraldLight,
    secondary = CyanBright,
    onSecondary = Slate950,
    secondaryContainer = Slate850,
    onSecondaryContainer = CyanBright,
    tertiary = AmberLight,
    onTertiary = Slate950,
    background = Color(0xFF0B1120),
    onBackground = Slate100,
    surface = Color(0xFF111827),
    onSurface = Slate100,
    surfaceVariant = Color(0xFF1F2937),
    onSurfaceVariant = Slate300,
    outline = Color(0xFF374151),
    outlineVariant = Color(0xFF1F2937),
    error = RoseRed,
    onError = White
)

@Composable
fun LifeOsTheme(
    darkTheme: Boolean = false, // Clean, crisp LifeOS web app light theme by default
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
