package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.example.model.GoalItem
import com.example.model.LifePillar
import com.example.model.NoteItem
import com.example.ui.theme.*

@Composable
fun KnowledgeAndGoalsScreen(
    notes: List<NoteItem>,
    pillars: List<LifePillar>,
    goals: List<GoalItem>,
    onTogglePinNote: (String) -> Unit,
    onDeleteNote: (String) -> Unit,
    onOpenNoteEditor: (NoteItem?) -> Unit,
    onToggleMilestone: (String, String) -> Unit,
    onDeleteGoal: (String) -> Unit,
    onOpenAddNote: () -> Unit,
    onOpenAddGoal: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) } // 0: Notes Vault, 1: Pillars & Goals

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .testTag("knowledge_goals_screen")
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
        ) {
            // Tab Switcher
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 10.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Slate900)
                    .padding(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (selectedTab == 0) VioletAccent else Color.Transparent)
                        .clickable { selectedTab = 0 }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Knowledge Vault (${notes.size})",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (selectedTab == 0) White else Slate400
                    )
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (selectedTab == 1) CyanBright else Color.Transparent)
                        .clickable { selectedTab = 1 }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Life Pillars & OKRs",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (selectedTab == 1) Slate950 else Slate400
                    )
                }
            }

            if (selectedTab == 0) {
                // Notes View
                if (notes.isEmpty()) {
                    Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                        Text("No notes found. Tap '+' to create your first knowledge entry.", color = Slate400)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(top = 4.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Sort pinned notes first
                        val sortedNotes = notes.sortedByDescending { it.isPinned }
                        items(sortedNotes, key = { it.id }) { note ->
                            NoteCard(
                                note = note,
                                onOpen = { onOpenNoteEditor(note) },
                                onTogglePin = { onTogglePinNote(note.id) },
                                onDelete = { onDeleteNote(note.id) }
                            )
                        }
                    }
                }
            } else {
                // Goals & Life Pillars View
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(top = 4.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Pillars Header
                    item {
                        Text(
                            text = "Life Spheres Equilibrium",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Slate100
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            pillars.forEach { pillar ->
                                PillarFullCard(pillar = pillar)
                            }
                        }
                    }

                    // Active Goals Section
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Active Objectives & Milestones",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Slate100
                            )
                            Text(
                                text = "${goals.size} Active Goals",
                                style = MaterialTheme.typography.labelSmall,
                                color = CyanBright
                            )
                        }
                    }

                    items(goals, key = { it.id }) { goal ->
                        GoalDetailedCard(
                            goal = goal,
                            onToggleMilestone = { mId -> onToggleMilestone(goal.id, mId) },
                            onDelete = { onDeleteGoal(goal.id) }
                        )
                    }
                }
            }
        }

        FloatingActionButton(
            onClick = {
                if (selectedTab == 0) onOpenAddNote() else onOpenAddGoal()
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 96.dp, end = 20.dp)
                .testTag("add_vault_fab"),
            containerColor = if (selectedTab == 0) VioletAccent else CyanBright,
            contentColor = if (selectedTab == 0) White else Slate950
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add Item")
        }
    }
}

@Composable
fun NoteCard(
    note: NoteItem,
    onOpen: () -> Unit,
    onTogglePin: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (note.isPinned) VioletAccent.copy(alpha = 0.5f) else Slate800
        ),
        modifier = Modifier.fillMaxWidth().clickable { onOpen() }
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    if (note.isPinned) {
                        Icon(
                            Icons.Default.PushPin,
                            contentDescription = "Pinned",
                            tint = VioletAccent,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(
                        text = note.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Slate100
                    )
                }

                Row {
                    IconButton(onClick = onTogglePin, modifier = Modifier.size(28.dp)) {
                        Icon(
                            imageVector = if (note.isPinned) Icons.Default.PushPin else Icons.Default.VerticalAlignTop,
                            contentDescription = "Pin",
                            tint = if (note.isPinned) VioletAccent else Slate500,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                        Icon(
                            Icons.Default.DeleteOutline,
                            contentDescription = "Delete",
                            tint = Slate500,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = note.content,
                style = MaterialTheme.typography.bodySmall,
                color = Slate300,
                maxLines = 3,
                lineHeight = 18.sp
            )

            if (note.tags.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    note.tags.forEach { tag ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(Slate800)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "#$tag",
                                style = MaterialTheme.typography.labelSmall,
                                color = Slate400,
                                fontSize = 10.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PillarFullCard(pillar: LifePillar) {
    val color = try {
        Color(android.graphics.Color.parseColor(pillar.colorHex))
    } catch (_: Exception) { CyanBright }

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
        border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(pillar.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold, color = Slate100)
                Text(
                    "${(pillar.progressPercent * 100).toInt()}%",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = color
                )
            }
            Text(pillar.subtitle, style = MaterialTheme.typography.bodySmall, color = Slate400)
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { pillar.progressPercent },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = color,
                trackColor = Slate800
            )
        }
    }
}

@Composable
fun GoalDetailedCard(
    goal: GoalItem,
    onToggleMilestone: (String) -> Unit,
    onDelete: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
        border = androidx.compose.foundation.BorderStroke(1.dp, CyanBright.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = goal.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Slate100
                    )
                    Text(
                        text = "Target: ${goal.targetDate}",
                        style = MaterialTheme.typography.labelSmall,
                        color = CyanBright
                    )
                }

                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(
                        Icons.Default.DeleteOutline,
                        contentDescription = "Delete",
                        tint = Slate600,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Progress bar
            LinearProgressIndicator(
                progress = { goal.progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = CyanBright,
                trackColor = Slate800
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Milestones checklist
            goal.milestones.forEach { milestone ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onToggleMilestone(milestone.id) }
                        .padding(vertical = 2.dp)
                ) {
                    Checkbox(
                        checked = milestone.isCompleted,
                        onCheckedChange = { onToggleMilestone(milestone.id) },
                        modifier = Modifier.size(24.dp),
                        colors = CheckboxDefaults.colors(checkedColor = CyanBright, uncheckedColor = Slate600)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = milestone.title,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (milestone.isCompleted) Slate400 else Slate200,
                        textDecoration = if (milestone.isCompleted) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                    )
                }
            }
        }
    }
}
