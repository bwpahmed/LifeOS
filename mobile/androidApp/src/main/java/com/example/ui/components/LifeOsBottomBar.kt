package com.example.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.ui.theme.*
import com.example.ui.viewmodel.LifeOsScreen

@Composable
fun LifeOsBottomBar(
    currentScreen: LifeOsScreen,
    onScreenSelected: (LifeOsScreen) -> Unit
) {
    Column(modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars)) {
        HorizontalDivider(color = Slate200)
        NavigationBar(
            modifier = Modifier.testTag("lifeos_bottom_navigation"),
            containerColor = MaterialTheme.colorScheme.surface,
            tonalElevation = 0.dp
        ) {
            NavigationBarItem(
                selected = currentScreen == LifeOsScreen.DASHBOARD,
                onClick = { onScreenSelected(LifeOsScreen.DASHBOARD) },
                icon = {
                    Icon(
                        imageVector = if (currentScreen == LifeOsScreen.DASHBOARD) Icons.Filled.Dashboard else Icons.Outlined.Dashboard,
                        contentDescription = "Cockpit"
                    )
                },
                label = { Text("Home", style = MaterialTheme.typography.labelSmall) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = EmeraldGreen,
                    selectedTextColor = EmeraldGreen,
                    unselectedIconColor = Slate700,
                    unselectedTextColor = Slate700,
                    indicatorColor = EmeraldSoftBg
                ),
                modifier = Modifier.testTag("nav_cockpit")
            )

            NavigationBarItem(
                selected = currentScreen == LifeOsScreen.TASKS,
                onClick = { onScreenSelected(LifeOsScreen.TASKS) },
                icon = {
                    Icon(
                        imageVector = if (currentScreen == LifeOsScreen.TASKS) Icons.Filled.CheckCircle else Icons.Outlined.CheckCircle,
                        contentDescription = "Tasks"
                    )
                },
                label = { Text("Tasks", style = MaterialTheme.typography.labelSmall) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = EmeraldGreen,
                    selectedTextColor = EmeraldGreen,
                    unselectedIconColor = Slate700,
                    unselectedTextColor = Slate700,
                    indicatorColor = EmeraldSoftBg
                ),
                modifier = Modifier.testTag("nav_tasks")
            )

            NavigationBarItem(
                selected = currentScreen == LifeOsScreen.HABITS,
                onClick = { onScreenSelected(LifeOsScreen.HABITS) },
                icon = {
                    Icon(
                        imageVector = if (currentScreen == LifeOsScreen.HABITS) Icons.Filled.LocalFireDepartment else Icons.Outlined.LocalFireDepartment,
                        contentDescription = "Habits"
                    )
                },
                label = { Text("Habits", style = MaterialTheme.typography.labelSmall) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = EmeraldGreen,
                    selectedTextColor = EmeraldGreen,
                    unselectedIconColor = Slate700,
                    unselectedTextColor = Slate700,
                    indicatorColor = EmeraldSoftBg
                ),
                modifier = Modifier.testTag("nav_habits")
            )

            NavigationBarItem(
                selected = currentScreen == LifeOsScreen.PLANNER,
                onClick = { onScreenSelected(LifeOsScreen.PLANNER) },
                icon = {
                    Icon(
                        imageVector = if (currentScreen == LifeOsScreen.PLANNER) Icons.Filled.CalendarMonth else Icons.Outlined.CalendarMonth,
                        contentDescription = "Planner"
                    )
                },
                label = { Text("Planner", style = MaterialTheme.typography.labelSmall) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = EmeraldGreen,
                    selectedTextColor = EmeraldGreen,
                    unselectedIconColor = Slate700,
                    unselectedTextColor = Slate700,
                    indicatorColor = EmeraldSoftBg
                ),
                modifier = Modifier.testTag("nav_planner")
            )

            NavigationBarItem(
                selected = currentScreen == LifeOsScreen.KNOWLEDGE,
                onClick = { onScreenSelected(LifeOsScreen.KNOWLEDGE) },
                icon = {
                    Icon(
                        imageVector = if (currentScreen == LifeOsScreen.KNOWLEDGE) Icons.Filled.FolderSpecial else Icons.Outlined.FolderSpecial,
                        contentDescription = "Vault"
                    )
                },
                label = { Text("Vault", style = MaterialTheme.typography.labelSmall) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = EmeraldGreen,
                    selectedTextColor = EmeraldGreen,
                    unselectedIconColor = Slate700,
                    unselectedTextColor = Slate700,
                    indicatorColor = EmeraldSoftBg
                ),
                modifier = Modifier.testTag("nav_knowledge")
            )

            NavigationBarItem(
                selected = currentScreen == LifeOsScreen.FOCUS,
                onClick = { onScreenSelected(LifeOsScreen.FOCUS) },
                icon = {
                    Icon(
                        imageVector = if (currentScreen == LifeOsScreen.FOCUS) Icons.Filled.Timer else Icons.Outlined.Timer,
                        contentDescription = "Focus"
                    )
                },
                label = { Text("Focus", style = MaterialTheme.typography.labelSmall) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = EmeraldGreen,
                    selectedTextColor = EmeraldGreen,
                    unselectedIconColor = Slate700,
                    unselectedTextColor = Slate700,
                    indicatorColor = EmeraldSoftBg
                ),
                modifier = Modifier.testTag("nav_focus")
            )
        }
    }
}
