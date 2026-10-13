package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.Workspace
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeOsTopBar(
    workspaces: List<Workspace>,
    activeWorkspaceId: String,
    onWorkspaceSelected: (String) -> Unit,
    searchQuery: String,
    onSearchQueryChanged: (String) -> Unit,
    onOpenBrainDump: () -> Unit,
    onOpenSettings: () -> Unit,
    privacyGateEnabled: Boolean,
    onLockGate: () -> Unit,
    syncStatus: com.example.data.supabase.SupabaseSyncStatus = com.example.data.supabase.SupabaseSyncStatus.OFFLINE_LOCAL,
    onOpenCloudSync: () -> Unit = {}
) {
    var isSearchExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .statusBarsPadding()
    ) {
        // Main App Header Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // App Branding Badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.testTag("app_branding_row")
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(EmeraldSoftBg)
                        .border(1.dp, EmeraldBorder, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Explore,
                        contentDescription = "LifeOS Compass",
                        tint = EmeraldGreen,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "LifeOS",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(EmeraldSoftBg)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "SYSTEM",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = EmeraldDark,
                                fontSize = 10.sp
                            )
                        }
                    }
                    Text(
                        text = "Personal Command Center",
                        style = MaterialTheme.typography.labelSmall,
                        color = Slate700
                    )
                }
            }

            // Action Icons Row
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Search toggle
                IconButton(
                    onClick = {
                        isSearchExpanded = !isSearchExpanded
                        if (!isSearchExpanded) onSearchQueryChanged("")
                    },
                    modifier = Modifier.testTag("search_toggle_button")
                ) {
                    Icon(
                        imageVector = if (isSearchExpanded) Icons.Default.Close else Icons.Default.Search,
                        contentDescription = "Search",
                        tint = if (isSearchExpanded) EmeraldGreen else Slate700
                    )
                }

                // AI Brain Dump Trigger
                IconButton(
                    onClick = onOpenBrainDump,
                    modifier = Modifier
                        .testTag("ai_brain_dump_button")
                        .clip(CircleShape)
                        .background(AmberSoftBg)
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = "AI Brain Dump",
                        tint = AmberGold
                    )
                }

                // Supabase Cloud Sync Status
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(
                    onClick = onOpenCloudSync,
                    modifier = Modifier
                        .testTag("cloud_sync_button")
                        .clip(CircleShape)
                        .background(
                            when (syncStatus) {
                                com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> EmeraldSoftBg
                                com.example.data.supabase.SupabaseSyncStatus.SYNCING -> CyanSoftBg
                                com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> RoseSoftBg
                                else -> Slate100
                            }
                        )
                ) {
                    Icon(
                        imageVector = when (syncStatus) {
                            com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> Icons.Default.CloudDone
                            com.example.data.supabase.SupabaseSyncStatus.SYNCING -> Icons.Default.Sync
                            com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> Icons.Default.CloudOff
                            else -> Icons.Default.CloudQueue
                        },
                        contentDescription = "Supabase Cloud Sync",
                        tint = when (syncStatus) {
                            com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> EmeraldGreen
                            com.example.data.supabase.SupabaseSyncStatus.SYNCING -> CyanBlue
                            com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> RoseRed
                            else -> Slate700
                        }
                    )
                }

                // Privacy Gate Lock Button
                if (privacyGateEnabled) {
                    Spacer(modifier = Modifier.width(4.dp))
                    IconButton(
                        onClick = onLockGate,
                        modifier = Modifier.testTag("privacy_lock_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Lock Privacy Gate",
                            tint = RoseRed
                        )
                    }
                }

                // Settings
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(
                    onClick = onOpenSettings,
                    modifier = Modifier.testTag("settings_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Settings",
                        tint = Slate700
                    )
                }
            }
        }

        // Expandable Search Field
        AnimatedVisibility(visible = isSearchExpanded) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchQueryChanged,
                    placeholder = { Text("Search tasks, notes, habits...", color = Slate400) },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("global_search_input"),
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = null, tint = EmeraldGreen)
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = EmeraldGreen,
                        unfocusedBorderColor = Slate200,
                        focusedContainerColor = White,
                        unfocusedContainerColor = White,
                        focusedTextColor = Slate950,
                        unfocusedTextColor = Slate950
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        }

        // Workspace Picker Carousel
        val scrollState = rememberScrollState()
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            workspaces.forEach { ws ->
                val isSelected = ws.id == activeWorkspaceId
                val wsColor = try {
                    Color(android.graphics.Color.parseColor(ws.colorHex))
                } catch (_: Exception) {
                    EmeraldGreen
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (isSelected) EmeraldGreen else MaterialTheme.colorScheme.surface)
                        .border(
                            width = 1.dp,
                            color = if (isSelected) EmeraldGreen else Slate200,
                            shape = RoundedCornerShape(20.dp)
                        )
                        .clickable { onWorkspaceSelected(ws.id) }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .testTag("workspace_chip_${ws.id}"),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(if (isSelected) White else wsColor)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = ws.name,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) White else Slate700
                        )
                    }
                }
            }
        }

        HorizontalDivider(color = Slate200)
    }
}
