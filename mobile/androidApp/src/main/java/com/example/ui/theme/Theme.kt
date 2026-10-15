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

private val DarkColorScheme = darkColorScheme(
    primary = EmeraldAccent,
    onPrimary = ObsidianDark,
    primaryContainer = ObsidianCard,
    onPrimaryContainer = EmeraldAccent,
    secondary = VioletAccent,
    onSecondary = ObsidianDark,
    secondaryContainer = ObsidianCardHover,
    onSecondaryContainer = TextPrimaryDark,
    tertiary = AmberAccent,
    onTertiary = ObsidianDark,
    background = ObsidianDark,
    onBackground = TextPrimaryDark,
    surface = ObsidianCard,
    onSurface = TextPrimaryDark,
    surfaceVariant = ObsidianCardHover,
    onSurfaceVariant = TextSecondaryDark,
    outline = ObsidianBorder,
    outlineVariant = ObsidianBorderSubtle,
    error = RoseAccent,
    onError = ObsidianDark
)

private val LightColorScheme = lightColorScheme(
    primary = EmeraldAccent,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFF0FDF4),
    onPrimaryContainer = Color(0xFF166534),
    secondary = VioletAccent,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFF5F3FF),
    onSecondaryContainer = Color(0xFF5B21B6),
    tertiary = AmberAccent,
    onTertiary = Color.White,
    background = StudioLightBg,
    onBackground = TextPrimaryLight,
    surface = StudioLightCard,
    onSurface = TextPrimaryLight,
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = TextSecondaryLight,
    outline = StudioLightBorder,
    outlineVariant = Color(0xFFE2E8F0),
    error = RoseAccent,
    onError = Color.White
)

@Composable
fun LifeOsTheme(
    darkTheme: Boolean = true, // Executive Obsidian dark mode by default for premium feel
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
