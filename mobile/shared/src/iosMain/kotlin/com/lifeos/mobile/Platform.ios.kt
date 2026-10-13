package com.lifeos.mobile

class IOSPlatform : Platform {
    override val name: String = "iOS"
    override val isApple: Boolean = true
}

actual fun getPlatform(): Platform = IOSPlatform()
