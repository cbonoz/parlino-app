package com.parlino.hybridai

import com.google.firebase.Firebase
import com.google.firebase.ai.DownloadStatus
import com.google.firebase.ai.InferenceSource
import com.google.firebase.ai.InferenceMode
import com.google.firebase.ai.OnDeviceConfig
import com.google.firebase.ai.OnDeviceModelOption
import com.google.firebase.ai.OnDeviceModelStatus
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.PublicPreviewAPI
import com.google.firebase.ai.type.generationConfig
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.flow.collect

@OptIn(PublicPreviewAPI::class)
class ParlinoHybridAIModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ParlinoHybridAI")

    AsyncFunction("getOnDeviceStatus") Coroutine { ->
      val status = createHybridModel().onDeviceExtension?.checkStatus()
      status?.let(::statusName) ?: "UNAVAILABLE"
    }

    AsyncFunction("coachSentence") Coroutine { prompt: String ->
      val model = createHybridModel()
      val onDevice = model.onDeviceExtension
        ?: throw IllegalStateException("Firebase AI Logic on-device inference is unavailable.")
      var deviceStatus = statusName(onDevice.checkStatus())

      when (deviceStatus) {
        "DOWNLOADABLE" -> {
          onDevice.download().collect { status ->
            if (status is DownloadStatus.DownloadFailed) {
              throw status.exception
            }
          }
          deviceStatus = statusName(onDevice.checkStatus())
        }
        "DOWNLOADING" -> {
          // Let hybrid inference use the cloud path while the system download finishes.
        }
      }

      val response = model.generateContent(prompt)
      val text = response.text?.trim().orEmpty()
      if (text.isEmpty()) {
        throw IllegalStateException("The coach returned an empty response.")
      }

      mapOf(
        "text" to text,
        "inferenceSource" to if (response.inferenceSource == InferenceSource.ON_DEVICE) "ON_DEVICE" else "IN_CLOUD",
        "deviceStatus" to deviceStatus
      )
    }
  }

  private fun createHybridModel() = Firebase.ai(
    backend = GenerativeBackend.googleAI()
  ).generativeModel(
    modelName = "gemini-3.5-flash-lite",
    generationConfig = generationConfig {
      maxOutputTokens = 128
    },
    onDeviceConfig = OnDeviceConfig(
      mode = InferenceMode.PREFER_ON_DEVICE,
      maxOutputTokens = 128,
      modelOption = OnDeviceModelOption.PREVIEW_FAST
    )
  )

  private fun statusName(status: OnDeviceModelStatus): String = when (status) {
    OnDeviceModelStatus.AVAILABLE -> "AVAILABLE"
    OnDeviceModelStatus.DOWNLOADABLE -> "DOWNLOADABLE"
    OnDeviceModelStatus.DOWNLOADING -> "DOWNLOADING"
    OnDeviceModelStatus.UNAVAILABLE -> "UNAVAILABLE"
    else -> "UNKNOWN"
  }
}
