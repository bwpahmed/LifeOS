package com.example.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*
import com.example.ui.viewmodel.LifeOsScreen

@Composable
fun LifeOsBottomBar(
    currentScreen: LifeOsScreen,
    onScreenSelected: (LifeOsScreen) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        HorizontalDivider(
            color = MaterialTheme.colorScheme.outlineVariant,
            thickness = 0.5.dp
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .background(MaterialTheme.colorScheme.surface)
                .padding(horizontal = 8.dp)
                .testTag("lifeos_bottom_navigation"),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ExecutiveNavItem(
                label = "Cockpit",
                selectedIcon = Icons.Filled.GridView,
                unselectedIcon = Icons.Outlined.GridView,
                isSelected = currentScreen == LifeOsScreen.DASHBOARD,
                onClick = { onScreenSelected(LifeOsScreen.DASHBOARD) },
                tag = "nav_cockpit"
            )

            ExecutiveNavItem(
                label = "Tasks",
                selectedIcon = Icons.Filled.CheckCircle,
                unselectedIcon = Icons.Outlined.CheckCircle,
                isSelected = currentScreen == LifeOsScreen.TASKS,
                onClick = { onScreenSelected(LifeOsScreen.TASKS) },
                tag = "nav_tasks"
            )

            ExecutiveNavItem(
                label = "Habits",
                selectedIcon = Icons.Filled.LocalFireDepartment,
                unselectedIcon = Icons.Outlined.LocalFireDepartment,
                isSelected = currentScreen == LifeOsScreen.HABITS,
                onClick = { onScreenSelected(LifeOsScreen.HABITS) },
                tag = "nav_habits"
            )

            ExecutiveNavItem(
                label = "Planner",
                selectedIcon = Icons.Filled.CalendarMonth,
                unselectedIcon = Icons.Outlined.CalendarMonth,
                isSelected = currentScreen == LifeOsScreen.PLANNER,
                onClick = { onScreenSelected(LifeOsScreen.PLANNER) },
                tag = "nav_planner"
            )

            ExecutiveNavItem(
                label = "Vault",
                selectedIcon = Icons.Filled.FolderSpecial,
                unselectedIcon = Icons.Outlined.FolderSpecial,
                isSelected = currentScreen == LifeOsScreen.KNOWLEDGE || currentScreen == LifeOsScreen.FOCUS,
                onClick = { onScreenSelected(LifeOsScreen.KNOWLEDGE) },
                tag = "nav_knowledge"
            )
        }
    }
}

@Composable
private fun ExecutiveNavItem(
    label: String,
    selectedIcon: ImageVector,
    unselectedIcon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    tag: String
) {
    val iconColor by animateColorAsState(
        targetValue = if (isSelected) EmeraldAccent else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
        label = "nav_icon_color"
    )
    val textColor by animateColorAsState(
        targetValue = if (isSelected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
        label = "nav_text_color"
    )

    Column(
        modifier = Modifier
            .defaultMinSize(minWidth = 56.dp, minHeight = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 6.dp, horizontal = 8.dp)
            .testTag(tag),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = if (isSelected) selectedIcon else unselectedIcon,
            contentDescription = label,
            tint = iconColor,
            modifier = Modifier.size(22.dp)
        )

        Spacer(modifier = Modifier.height(3.dp))

        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            fontSize = 10.sp,
            color = textColor
        )

        // Micro dot indicator under active item
        if (isSelected) {
            Spacer(modifier = Modifier.height(2.dp))
            Box(
                modifier = Modifier
                    .size(3.dp)
                    .clip(CircleShape)
                    .background(EmeraldAccent)
            )
        } else {
            Spacer(modifier = Modifier.height(5.dp))
        }
    }
}
