package com.example.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@Composable
fun FocusScreen(
    totalSeconds: Int,
    remainingSeconds: Int,
    isTimerRunning: Boolean,
    sessionsCompleted: Int,
    onToggleTimer: () -> Unit,
    onResetTimer: () -> Unit,
    onSelectPreset: (Int) -> Unit
) {
    val progress = if (totalSeconds > 0) {
        remainingSeconds.toFloat() / totalSeconds.toFloat()
    } else 0f

    val animatedProgress by animateFloatAsState(targetValue = progress, label = "focus_arc")

    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val timeFormatted = String.format("%02d:%02d", minutes, seconds)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp)
            .verticalScroll(rememberScrollState())
            .testTag("focus_screen"),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        // Title and Subtitle
        Text(
            text = "Deep Focus Cockpit",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.ExtraBold,
            color = Slate100
        )
        Text(
            text = "Eliminate all distractions. Enter monk mode.",
            style = MaterialTheme.typography.bodyMedium,
            color = Slate400
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Preset Duration Chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val presets = listOf(
                25 to "25m Sprint",
                50 to "50m Deep",
                90 to "90m Flow",
                15 to "15m Reset"
            )

            presets.forEach { (mins, label) ->
                val isSelected = totalSeconds == mins * 60
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (isSelected) RoseRed.copy(alpha = 0.2f) else Slate900)
                        .border(1.dp, if (isSelected) RoseRed else Slate800, RoundedCornerShape(10.dp))
                        .clickable { onSelectPreset(mins) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) RoseRed else Slate400
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(36.dp))

        // Circular Timer Display
        Box(
            modifier = Modifier
                .size(260.dp)
                .testTag("circular_focus_timer"),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                // Background track
                drawArc(
                    color = Slate800,
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    style = Stroke(width = 14.dp.toPx(), cap = StrokeCap.Round)
                )

                // Active progress arc
                drawArc(
                    color = RoseRed,
                    startAngle = -90f,
                    sweepAngle = 360f * animatedProgress,
                    useCenter = false,
                    style = Stroke(width = 14.dp.toPx(), cap = StrokeCap.Round)
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = timeFormatted,
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate100,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (isTimerRunning) "FLOW STATE ACTIVE" else "PAUSED",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (isTimerRunning) RoseRed else Slate500,
                    letterSpacing = 1.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(36.dp))

        // Control Buttons
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onResetTimer,
                modifier = Modifier
                    .size(54.dp)
                    .clip(CircleShape)
                    .background(Slate900)
                    .border(1.dp, Slate700, CircleShape)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Reset Timer", tint = Slate300)
            }

            Button(
                onClick = onToggleTimer,
                modifier = Modifier
                    .height(56.dp)
                    .width(160.dp)
                    .testTag("timer_toggle_btn"),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isTimerRunning) Slate800 else RoseRed,
                    contentColor = White
                )
            ) {
                Icon(
                    imageVector = if (isTimerRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = null
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isTimerRunning) "PAUSE" else "START FOCUS",
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Session Stats Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Today's Blocks", style = MaterialTheme.typography.labelSmall, color = Slate400)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "$sessionsCompleted",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = RoseRed
                    )
                }

                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(30.dp)
                        .background(Slate800)
                )

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Focus Time Logged", style = MaterialTheme.typography.labelSmall, color = Slate400)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "${sessionsCompleted * 25} mins",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Slate100
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(88.dp))
    }
}
