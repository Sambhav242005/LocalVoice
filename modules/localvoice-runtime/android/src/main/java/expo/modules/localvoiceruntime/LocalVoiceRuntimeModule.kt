package expo.modules.localvoiceruntime

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.net.Uri
import android.os.Debug
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.io.File
import java.security.MessageDigest
import org.json.JSONArray

class LocalVoiceRuntimeModule : Module() {
  private val sessions = mutableListOf<OrtSession>()
  private val lock = Any()

  private fun asset(uri: String): File {
    val context = appContext.reactContext ?: error("Android context unavailable")
    val file = File(Uri.parse(uri).path ?: error("Missing file path")).canonicalFile
    val allowed = File(context.filesDir, "models").canonicalFile.path + File.separator
    require(file.path.startsWith(allowed)) { "Model path is outside app-private storage" }
    require(file.isFile) { "Model asset is missing: ${file.name}" }
    return file
  }

  private fun closeSessions() {
    sessions.forEach { it.close() }
    sessions.clear()
  }

  override fun definition() = ModuleDefinition {
    Name("LocalVoiceRuntime")

    Events("onVerification")
    AsyncFunction("verifyBundle") { id: String, manifest: String ->
      synchronized(lock) {
        val files = JSONArray(manifest)
        for (index in 0 until files.length()) {
          val spec = files.getJSONObject(index)
          val file = asset(spec.getString("uri"))
          require(file.length() == spec.getLong("bytes")) { "Wrong size: ${file.name}" }
          val expected = spec.getString("sha256")
          require(expected.matches(Regex("[a-f0-9]{64}"))) { "Missing pinned SHA-256: ${file.name}" }
          val digest = MessageDigest.getInstance("SHA-256")
          var read = 0L
          var lastEvent = 0L
          file.inputStream().buffered(1024 * 1024).use { stream ->
            val buffer = ByteArray(1024 * 1024)
            while (true) {
              val count = stream.read(buffer)
              if (count < 0) break
              digest.update(buffer, 0, count)
              read += count
              val now = System.currentTimeMillis()
              if (now - lastEvent > 250) {
                sendEvent("onVerification", mapOf("id" to id, "file" to file.name, "progress" to (index + read.toDouble() / file.length()) / files.length()))
                lastEvent = now
              }
            }
          }
          val actual = digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) }
          require(actual == expected) { "SHA-256 mismatch: ${file.name}. Remove and download this bundle again." }
        }
        true
      }
    }
    AsyncFunction("loadAsr") { paths: List<String> ->
      synchronized(lock) {
        closeSessions()
        try {
          val env = OrtEnvironment.getEnvironment()
          for (path in paths) {
            OrtSession.SessionOptions().use { options ->
              options.setIntraOpNumThreads(2)
              sessions.add(env.createSession(asset(path).path, options))
            }
          }
          sessions.map { session -> mapOf("inputs" to session.inputNames.toList(), "outputs" to session.outputNames.toList()) }
        } catch (error: Throwable) {
          closeSessions()
          throw error
        }
      }
    }
    AsyncFunction("unloadAsr") { synchronized(lock) { closeSessions() } }
    AsyncFunction("memory") {
      val info = Debug.MemoryInfo()
      Debug.getMemoryInfo(info)
      mapOf("pssMiB" to info.totalPss / 1024.0)
    }
    OnDestroy { synchronized(lock) { closeSessions() } }
  }
}
