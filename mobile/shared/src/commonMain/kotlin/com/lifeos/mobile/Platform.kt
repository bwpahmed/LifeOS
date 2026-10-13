package com.lifeos.mobile

interface Platform {
    val name: String
    val isApple: Boolean
}

expect fun getPlatform(): Platform
