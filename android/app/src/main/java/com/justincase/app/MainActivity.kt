package com.justincase.app

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.justincase.app.bridge.WidgetBridgePlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(WidgetBridgePlugin::class.java)
        super.onCreate(savedInstanceState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Capacitor's App plugin forwards the deep link to the web layer (appUrlOpen).
        setIntent(intent)
    }
}
