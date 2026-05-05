package com.livingrelay.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyFactory
import java.security.spec.MGF1ParameterSpec
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource

private val Canvas = Color(0xFFF5F4EF)
private val Panel = Color(0xFFFFFFFF)
private val Field = Color(0xFFF0EEE6)
private val Green = Color(0xFF247A5B)
private val Ink = Color(0xFF17211D)
private val Muted = Color(0xFF69746D)
private val Clay = Color(0xFF9A5C37)
private val Danger = Color(0xFFB73A2D)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = androidx.compose.material3.lightColorScheme(
                    primary = Green,
                    secondary = Clay,
                    background = Canvas,
                    surface = Panel,
                    onPrimary = Color.White,
                    onSurface = Ink
                )
            ) {
                val store: RelayViewModel = viewModel()
                LivingRelayApp(store)
            }
        }
    }
}

data class Person(
    val id: String,
    val name: String,
    val role: String,
    val phone: String,
    val pin: String?,
    val propertyIds: List<String>,
    val unit: String?,
    val trade: String?
)

data class Property(
    val id: String,
    val name: String,
    val address: String,
    val subscription: String,
    val plan: String,
    val units: List<String>,
    val ownerId: String?,
    val managerId: String,
    val adminId: String,
    val rules: String
)

data class Vendor(
    val id: String,
    val name: String,
    val trade: String,
    val phone: String,
    val preferred: Boolean,
    val payment: String
)

data class TimelineEvent(val id: String, val label: String, val detail: String, val stamp: String)
data class RelayMessage(val id: String, val from: String, val text: String, val stamp: String)

data class WorkOrder(
    val id: String,
    val propertyId: String,
    val unit: String,
    val tenantId: String,
    val trade: String,
    val severity: String,
    val status: String,
    val estimate: Int,
    val vendorId: String,
    val issue: String,
    val access: String,
    val managerApproved: Boolean,
    val ownerApproved: Boolean,
    val invoiceId: String?,
    val timeline: List<TimelineEvent>,
    val messages: List<RelayMessage>
)

data class Invoice(
    val id: String,
    val propertyId: String,
    val orderId: String,
    val vendor: String,
    val amount: Int,
    val status: String,
    val taxYear: String,
    val receivedAt: String,
    val note: String
)

data class OnboardingForm(
    val propertyName: String = "",
    val address: String = "",
    val managerName: String = "",
    val managerPhone: String = "",
    val role: String = "Property manager",
    val pin: String = ""
)

class RelayViewModel : ViewModel() {
    private val apiBaseUrl = BuildConfig.API_BASE_URL

    var people by mutableStateOf<List<Person>>(emptyList())
    var properties by mutableStateOf<List<Property>>(emptyList())
    var vendors by mutableStateOf<List<Vendor>>(emptyList())
    var orders by mutableStateOf<List<WorkOrder>>(emptyList())
    var invoices by mutableStateOf<List<Invoice>>(emptyList())
    var session by mutableStateOf<Person?>(null)
    var activePropertyId by mutableStateOf("")
    var activeOrderId by mutableStateOf("")
    var apiStatus by mutableStateOf("Connecting...")
    var onboardingForm by mutableStateOf(OnboardingForm())
    var onboardingChallengeId by mutableStateOf("")
    var onboardingCode by mutableStateOf("")
    var onboardingToken by mutableStateOf("")
    var onboardingMessage by mutableStateOf("")
    var onboardingStatus by mutableStateOf("")
    var loginChallengeId by mutableStateOf("")
    var loginCode by mutableStateOf("")
    var loginMessage by mutableStateOf("")
    var authToken by mutableStateOf("")
    var accountDeletionStatus by mutableStateOf("")
    private var transitPublicKey: JSONObject? = null
    private val contactTransitFields = listOf(
        "phone",
        "pin",
        "password",
        "managerPhone",
        "ownerPhone",
        "vendorPhone",
        "recipientPhone",
        "testVendorPhone",
        "to",
        "email",
        "ownerEmail",
        "managerEmail",
        "recipientEmail",
        "referredEmail"
    )

    val environmentLabel: String
        get() = if (BuildConfig.FLAVOR == "production") "PRODUCTION" else "STAGING"

    val activeProperty: Property?
        get() = properties.firstOrNull { it.id == activePropertyId } ?: properties.firstOrNull()

    val visibleOrders: List<WorkOrder>
        get() = activeProperty?.let { property -> orders.filter { it.propertyId == property.id } }.orEmpty()

    val activeOrder: WorkOrder?
        get() = visibleOrders.firstOrNull { it.id == activeOrderId } ?: visibleOrders.firstOrNull()

    val visibleInvoices: List<Invoice>
        get() = activeProperty?.let { property -> invoices.filter { it.propertyId == property.id } }.orEmpty()

    val openCount: Int
        get() = visibleOrders.count { it.status != "Closed" }

    val approvalsCount: Int
        get() = visibleOrders.count { it.status.contains("approval", ignoreCase = true) || it.status == "Manager review" }

    init {
        loadRemoteState()
    }

    fun loadRemoteState() {
        viewModelScope.launch {
            try {
                val health = requestText("api/health")
                if (health.isNotBlank()) apiStatus = "Connected to ${if (BuildConfig.FLAVOR == "production") "LivingRelay" else "LivingRelay Staging"}"
                val state = requestJson("GET", "api/state")
                people = state.optJSONArray("people").toList { parsePerson(it) }
                properties = state.optJSONArray("properties").toList { parseProperty(it) }
                vendors = state.optJSONArray("vendors").toList { parseVendor(it) }
                orders = state.optJSONArray("workOrders").toList { parseWorkOrder(it) }
                invoices = state.optJSONArray("invoices").toList { parseInvoice(it) }
                if (activePropertyId.isEmpty()) activePropertyId = session?.propertyIds?.firstOrNull() ?: properties.firstOrNull()?.id.orEmpty()
                if (activeOrderId.isEmpty()) activeOrderId = visibleOrders.firstOrNull()?.id.orEmpty()
            } catch (error: Exception) {
                apiStatus = "Connection failed: ${error.message}"
            }
        }
    }

    fun login(phone: String, pin: String) {
        if (phone.count(Char::isDigit) != 10 || pin.count(Char::isDigit) != 4) {
            apiStatus = "Enter a 10-digit phone number and 4-digit PIN."
            return
        }
        viewModelScope.launch {
            try {
                if (loginChallengeId.isEmpty()) {
                    apiStatus = "Sending verification code..."
                    val response = requestJson(
                        "POST",
                        "api/auth/login/start",
                        JSONObject().put("phone", phone).put("pin", pin)
                    )
                    val token = response.optString("token")
                    if (token.isNotBlank()) {
                        finishLogin(response, token)
                        return@launch
                    }
                    loginChallengeId = response.optString("challengeId")
                    loginCode = ""
                    loginMessage = response.optString("devCode").takeIf { it.isNotBlank() }?.let { "Verification code: $it" }
                        ?: "We sent a verification code to your phone."
                    apiStatus = loginMessage
                    return@launch
                }

                apiStatus = "Checking verification code..."
                val response = requestJson(
                    "POST",
                    "api/auth/login/verify",
                    JSONObject()
                        .put("phone", phone)
                        .put("pin", pin)
                        .put("challengeId", loginChallengeId)
                        .put("code", loginCode)
                )
                finishLogin(response, response.optString("token"))
            } catch (error: Exception) {
                apiStatus = error.message ?: "Login failed"
            }
        }
    }

    fun signOut() {
        session = null
        authToken = ""
        loginChallengeId = ""
        loginCode = ""
        loginMessage = ""
        accountDeletionStatus = ""
    }

    fun deleteAccount(scope: String) {
        viewModelScope.launch {
            try {
                accountDeletionStatus = if (scope == "data") "Deleting data..." else "Deleting account..."
                requestJson(
                    "DELETE",
                    "api/account",
                    JSONObject().put("scope", scope)
                )
                if (scope == "data") {
                    loadRemoteState()
                    accountDeletionStatus = "Data deleted. Your account is still active."
                    apiStatus = accountDeletionStatus
                } else {
                    signOut()
                    apiStatus = "Account deleted."
                }
            } catch (error: Exception) {
                accountDeletionStatus = error.message ?: "Unable to delete account"
            }
        }
    }

    fun createOnboardingProperty() {
        val propertyName = onboardingForm.propertyName.trim()
        val managerName = onboardingForm.managerName.trim()
        if (propertyName.isEmpty()) {
            onboardingStatus = "Enter a property name."
            return
        }
        if (onboardingForm.managerPhone.count(Char::isDigit) != 10) {
            onboardingStatus = "Enter a 10-digit phone number."
            return
        }
        if (onboardingForm.pin.isNotEmpty() && onboardingForm.pin.count(Char::isDigit) != 4) {
            onboardingStatus = "Use a 4-digit PIN, or leave it blank to auto-generate one."
            return
        }

        viewModelScope.launch {
            try {
                if (onboardingToken.isEmpty() && onboardingChallengeId.isEmpty()) {
                    onboardingStatus = "Sending phone verification code..."
                    val response = requestJson(
                        "POST",
                        "api/phone-verifications/start",
                        JSONObject().put("phone", onboardingForm.managerPhone).put("purpose", "onboarding")
                    )
                    onboardingChallengeId = response.optString("challengeId")
                    onboardingCode = ""
                    onboardingMessage = response.optString("devCode").takeIf { it.isNotBlank() }?.let { "Verification code: $it" }
                        ?: "We sent a verification code to your phone."
                    onboardingStatus = "Enter the verification code to finish creating the property."
                    return@launch
                }

                if (onboardingToken.isEmpty()) {
                    onboardingStatus = "Checking verification code..."
                    val response = requestJson(
                        "POST",
                        "api/phone-verifications/verify",
                        JSONObject()
                            .put("challengeId", onboardingChallengeId)
                            .put("code", onboardingCode)
                            .put("purpose", "onboarding")
                    )
                    onboardingToken = response.optString("token")
                    onboardingMessage = "Phone verified."
                }

                onboardingStatus = "Creating your property..."
                val response = requestJson(
                    "POST",
                    "api/onboarding/property",
                    JSONObject()
                        .put("propertyName", propertyName)
                        .put("address", onboardingForm.address.trim())
                        .put("managerName", managerName)
                        .put("managerPhone", onboardingForm.managerPhone)
                        .put("role", onboardingForm.role)
                        .put("pin", onboardingForm.pin)
                        .put("phoneVerificationToken", onboardingToken)
                )
                upsertOnboardingResponse(response)
                authToken = response.optString("token", authToken)
                onboardingChallengeId = ""
                onboardingCode = ""
                onboardingToken = ""
                onboardingStatus = "${response.getJSONObject("property").optString("name")} is ready."
            } catch (error: Exception) {
                onboardingStatus = error.message ?: "Unable to create property"
            }
        }
    }

    fun createTenantOrder(unit: String, issue: String, access: String) {
        val property = activeProperty ?: run {
            apiStatus = "Unable to create a request until account data is loaded."
            return
        }
        val tenant = session ?: people.firstOrNull { it.role == "Tenant" } ?: run {
            apiStatus = "Tenant account not found."
            return
        }
        val triage = classifyIssue(issue)
        val vendor = vendors.firstOrNull { it.trade == triage.trade }
        viewModelScope.launch {
            try {
                val response = requestJson(
                    "POST",
                    "api/admin/work-orders",
                    JSONObject()
                        .put("propertyId", property.id)
                        .put("unit", unit)
                        .put("tenantId", tenant.id)
                        .put("trade", triage.trade)
                        .put("severity", triage.severity)
                        .put("status", "Manager review")
                        .put("estimate", triage.estimate)
                        .put("vendorId", vendor?.id.orEmpty())
                        .put("issue", issue)
                        .put("access", access)
                        .put("actorName", tenant.name)
                        .put("actorRole", tenant.role)
                )
                upsertOrder(parseWorkOrder(response.getJSONObject("order")))
                activeOrderId = response.getJSONObject("order").optString("id")
                apiStatus = "Request created."
            } catch (error: Exception) {
                apiStatus = error.message ?: "Unable to create request"
            }
        }
    }

    fun patchActiveOrder(status: String, label: String, detail: String, managerApproved: Boolean? = null, ownerApproved: Boolean? = null) {
        val order = activeOrder ?: return
        patchOrder(order.id, status, label, detail, managerApproved, ownerApproved)
    }

    fun patchOrder(id: String, status: String, label: String, detail: String, managerApproved: Boolean? = null, ownerApproved: Boolean? = null) {
        viewModelScope.launch {
            try {
                val body = JSONObject()
                    .put("status", status)
                    .put("timelineLabel", label)
                    .put("timelineDetail", detail)
                    .put("actor", session?.name ?: "Android")
                if (managerApproved != null) body.put("managerApproved", managerApproved)
                if (ownerApproved != null) body.put("ownerApproved", ownerApproved)
                val response = requestJson("PATCH", "api/work-orders/$id", body)
                upsertOrder(parseWorkOrder(response.getJSONObject("order")))
                apiStatus = label
            } catch (error: Exception) {
                apiStatus = error.message ?: "Unable to update order"
            }
        }
    }

    fun createInvoice(order: WorkOrder) {
        if (order.invoiceId != null) return
        viewModelScope.launch {
            try {
                val response = requestJson(
                    "POST",
                    "api/work-orders/${order.id}/invoices",
                    JSONObject().put("amount", order.estimate).put("note", "Generated from approved estimate. Payment remains off platform.")
                )
                upsertInvoice(parseInvoice(response.getJSONObject("invoice")))
                response.optJSONObject("order")?.let { upsertOrder(parseWorkOrder(it)) }
                apiStatus = "Invoice generated."
            } catch (error: Exception) {
                apiStatus = error.message ?: "Unable to create invoice"
            }
        }
    }

    fun markInvoicePaid(invoice: Invoice) {
        viewModelScope.launch {
            try {
                val response = requestJson(
                    "PATCH",
                    "api/invoices/${invoice.id}",
                    JSONObject().put("status", "Paid").put("paymentStatus", "Paid")
                )
                upsertInvoice(parseInvoice(response.getJSONObject("invoice")))
                apiStatus = "Invoice marked paid."
            } catch (error: Exception) {
                apiStatus = error.message ?: "Unable to update invoice"
            }
        }
    }

    private fun finishLogin(response: JSONObject, token: String) {
        response.optJSONObject("person")?.let { parsed ->
            val person = parsePerson(parsed)
            upsertPerson(person)
            session = person
        } ?: run {
            val userId = response.optString("userId")
            session = people.firstOrNull { it.id == userId }
        }
        authToken = token
        loginChallengeId = ""
        loginCode = ""
        loginMessage = ""
        activePropertyId = session?.propertyIds?.firstOrNull() ?: properties.firstOrNull()?.id.orEmpty()
        activeOrderId = visibleOrders.firstOrNull()?.id.orEmpty()
        apiStatus = "Signed in."
    }

    private fun classifyIssue(text: String): IssueTriage {
        val body = text.lowercase()
        val trade = when {
            listOf("water", "sink", "toilet", "leak", "drip", "faucet", "shower", "drain", "pipe").any(body::contains) -> "Plumbing"
            body.contains("heat") || body.contains("ac") || body.contains("thermostat") -> "HVAC"
            body.contains("spark") || body.contains("outlet") || body.contains("power") -> "Electrical"
            else -> "General"
        }
        val urgent = listOf("leak", "active water", "gas", "spark", "no heat", "no lock", "flood").any(body::contains)
        val estimate = when (trade) {
            "Plumbing" -> 325
            "HVAC" -> 425
            "Electrical" -> 185
            else -> 145
        }
        return IssueTriage(trade, if (urgent) "Urgent" else "Normal", estimate)
    }

    private data class IssueTriage(val trade: String, val severity: String, val estimate: Int)

    private fun upsertOnboardingResponse(response: JSONObject) {
        val person = parsePerson(response.getJSONObject("person"))
        val property = parseProperty(response.getJSONObject("property"))
        upsertPerson(person)
        properties = properties.filterNot { it.id == property.id } + property
        session = person
        activePropertyId = property.id
    }

    private fun upsertPerson(person: Person) {
        people = people.filterNot { it.id == person.id } + person
    }

    private fun upsertOrder(order: WorkOrder) {
        orders = orders.filterNot { it.id == order.id } + order
    }

    private fun upsertInvoice(invoice: Invoice) {
        invoices = invoices.filterNot { it.id == invoice.id } + invoice
    }

    private suspend fun encryptTransitFields(body: JSONObject, fields: List<String>): JSONObject {
        val key = transitPublicKey ?: requestJson("GET", "api/encryption/public-key").also { transitPublicKey = it }
        val publicKeyBytes = Base64.getDecoder().decode(key.getString("publicKey"))
        val publicKey = KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(publicKeyBytes))
        val encryptedFields = JSONObject()
        fields.filter { body.has(it) }
            .filter { body.optString(it).isNotBlank() }
            .forEach { field ->
                val cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
                cipher.init(
                    Cipher.ENCRYPT_MODE,
                    publicKey,
                    OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec("SHA-256"), PSource.PSpecified.DEFAULT)
                )
                val ciphertext = cipher.doFinal(body.optString(field).toByteArray(Charsets.UTF_8))
                encryptedFields.put(
                    field,
                    JSONObject()
                        .put("alg", key.getString("alg"))
                        .put("keyId", key.getString("keyId"))
                        .put("ciphertext", Base64.getEncoder().encodeToString(ciphertext))
                )
                body.put(field, "")
            }
        if (encryptedFields.length() > 0) body.put("_encryptedFields", encryptedFields)
        return body
    }

    private suspend fun requestText(path: String): String = withContext(Dispatchers.IO) {
        val connection = URL("${apiBaseUrl.trimEnd('/')}/$path").openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        try {
            val text = connection.inputStream.bufferedReader().use { it.readText() }
            if (connection.responseCode !in 200..299) throw IllegalStateException(text)
            text
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun requestJson(method: String, path: String, body: JSONObject? = null): JSONObject = withContext(Dispatchers.IO) {
        var refreshedTransitKey = false
        while (true) {
            val connection = URL("${apiBaseUrl.trimEnd('/')}/$path").openConnection() as HttpURLConnection
            connection.requestMethod = method
            connection.setRequestProperty("Accept", "application/json")
            if (authToken.isNotBlank()) connection.setRequestProperty("Authorization", "Bearer $authToken")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                val requestBody = JSONObject(body.toString())
                connection.outputStream.use { it.write(encryptTransitFields(requestBody, contactTransitFields).toString().toByteArray()) }
            }
            try {
                val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
                val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
                if (connection.responseCode !in 200..299) {
                    val message = runCatching { JSONObject(text).optString("error") }.getOrNull().takeUnless { it.isNullOrBlank() } ?: text
                    if (!refreshedTransitKey && isTransitKeyError(message)) {
                        transitPublicKey = null
                        refreshedTransitKey = true
                        continue
                    }
                    throw IllegalStateException(message)
                }
                return@withContext JSONObject(text)
            } finally {
                connection.disconnect()
            }
        }
        error("Unreachable")
    }

    private fun isTransitKeyError(message: String): Boolean =
        message.contains("Invalid encrypted field envelope", ignoreCase = true)
            || message.contains("Could not decrypt encrypted field", ignoreCase = true)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LivingRelayApp(store: RelayViewModel) {
    Surface(modifier = Modifier.fillMaxSize(), color = Canvas) {
        if (store.session == null) {
            LoginScreen(store)
        } else {
            DashboardScreen(store)
        }
    }
}

@Composable
fun LoginScreen(store: RelayViewModel) {
    var accessMode by remember { mutableStateOf("Create property") }
    var phone by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            BrandMark()
            Column(Modifier.weight(1f)) {
                Text("LivingRelay", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Rental repairs over SMS", color = Muted, style = MaterialTheme.typography.bodySmall)
            }
            StatusPill(store.environmentLabel)
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (accessMode == "Create property") "Create your property" else "Welcome back", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                if (accessMode == "Create property") "Set up the property, manager, and access PIN in one pass." else "Sign in with the phone number and PIN assigned to your role.",
                color = Muted
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Create property", "Log in").forEach { mode ->
                FilterChip(selected = accessMode == mode, onClick = { accessMode = mode }, label = { Text(mode) })
            }
        }

        PanelCard {
            if (accessMode == "Create property") {
                CreatePropertyFields(store)
            } else {
                TextFieldRow("Phone", phone, { phone = it }, KeyboardType.Phone)
                TextFieldRow("PIN", pin, { pin = it }, KeyboardType.NumberPassword, isPassword = true)
                if (store.loginChallengeId.isNotEmpty()) {
                    TextFieldRow("Code", store.loginCode, { store.loginCode = it }, KeyboardType.Number)
                }
                Button(onClick = { store.login(phone, pin) }, modifier = Modifier.fillMaxWidth()) {
                    Text(if (store.loginChallengeId.isEmpty()) "Send code" else "Verify and sign in")
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.Filled.Check, contentDescription = null)
                }
                if (store.loginMessage.isNotBlank()) StatusText(store.loginMessage)
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.size(7.dp).background(Green, RoundedCornerShape(50)))
            Text(store.apiStatus, color = Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
fun CreatePropertyFields(store: RelayViewModel) {
    val form = store.onboardingForm
    TextFieldRow("Property", form.propertyName, { store.onboardingForm = store.onboardingForm.copy(propertyName = it) })
    TextFieldRow("Address", form.address, { store.onboardingForm = store.onboardingForm.copy(address = it) })
    TextFieldRow("Manager (optional)", form.managerName, { store.onboardingForm = store.onboardingForm.copy(managerName = it) })
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        listOf("Property manager", "Owner operator", "Admin").forEach { role ->
            FilterChip(selected = form.role == role, onClick = { store.onboardingForm = store.onboardingForm.copy(role = role) }, label = { Text(role) })
        }
    }
    TextFieldRow("Phone", form.managerPhone, { store.onboardingForm = store.onboardingForm.copy(managerPhone = it) }, KeyboardType.Phone)
    TextFieldRow("PIN", form.pin, { store.onboardingForm = store.onboardingForm.copy(pin = it) }, KeyboardType.NumberPassword, isPassword = true)
    if (store.onboardingChallengeId.isNotEmpty()) {
        TextFieldRow("Code", store.onboardingCode, { store.onboardingCode = it }, KeyboardType.Number)
    }
    Button(onClick = { store.createOnboardingProperty() }, modifier = Modifier.fillMaxWidth()) {
        Text(if (store.onboardingChallengeId.isEmpty()) "Send code" else "Verify and create")
    }
    if (store.onboardingMessage.isNotBlank()) StatusText(store.onboardingMessage)
    if (store.onboardingStatus.isNotBlank()) StatusText(store.onboardingStatus)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(store: RelayViewModel) {
    Scaffold(
        containerColor = Canvas,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(store.activeProperty?.name ?: "LivingRelay", maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(store.session?.role.orEmpty(), color = Muted, style = MaterialTheme.typography.bodySmall)
                    }
                },
                actions = {
                    IconButton(onClick = { store.signOut() }) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign out")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SessionPanel(store)
            AccountDeletionPanel(store)
            MetricGrid(store)
            when (store.session?.role) {
                "Site Admin" -> EmptyPanel("Use the web admin console", "Site admin operations stay host-gated on admin.livingrelay.com.")
                "Admin", "Manager" -> AdminManagerView(store)
                "Owner" -> OwnerView(store)
                "Tenant" -> TenantView(store)
                "Vendor" -> VendorView(store)
            }
            IntegrationStrip(store)
        }
    }
}

@Composable
fun AccountDeletionPanel(store: RelayViewModel) {
    val user = store.session ?: return
    val canDeleteCustomerAccount = user.role in listOf("Admin", "Manager", "Owner")
    var scope by remember(user.id) { mutableStateOf(if (canDeleteCustomerAccount) "customer-account" else "personal") }
    var confirmation by remember(user.id, scope) { mutableStateOf("") }
    val required = if (scope == "customer-account") "DELETE" else if (scope == "data") "DELETE DATA" else user.name
    val enabled = confirmation.trim() == required

    PanelCard {
        SectionHeader(Icons.Filled.Delete, "Delete account", "Account settings")
        Text(
            if (scope == "customer-account") {
                "Deletes the customer account, linked properties, people, work orders, invoices, vendors, and billing events."
            } else if (scope == "data") {
                "Deletes repair, invoice, vendor, and billing-event data while keeping your LivingRelay login active."
            } else {
                "Deletes your personal LivingRelay login and any vendor profile linked directly to you."
            },
            color = Muted
        )
        if (canDeleteCustomerAccount) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                FilterChip(
                    selected = scope == "customer-account",
                    onClick = {
                        scope = "customer-account"
                        confirmation = ""
                    },
                    label = { Text("Customer account") }
                )
                FilterChip(
                    selected = scope == "personal",
                    onClick = {
                        scope = "personal"
                        confirmation = ""
                    },
                    label = { Text("My login only") }
                )
                FilterChip(
                    selected = scope == "data",
                    onClick = {
                        scope = "data"
                        confirmation = ""
                    },
                    label = { Text("Data only") }
                )
            }
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                FilterChip(
                    selected = scope == "personal",
                    onClick = {
                        scope = "personal"
                        confirmation = ""
                    },
                    label = { Text("My login") }
                )
                FilterChip(
                    selected = scope == "data",
                    onClick = {
                        scope = "data"
                        confirmation = ""
                    },
                    label = { Text("Data only") }
                )
            }
        }
        OutlinedTextField(
            value = confirmation,
            onValueChange = { confirmation = it },
            label = { Text("Type $required to confirm") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Button(
            onClick = { store.deleteAccount(scope) },
            enabled = enabled,
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Filled.Delete, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(if (scope == "data") "Delete data" else "Delete account")
        }
        if (store.accountDeletionStatus.isNotBlank()) StatusText(store.accountDeletionStatus)
    }
}

@Composable
fun SessionPanel(store: RelayViewModel) {
    PanelCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Filled.AccountCircle, contentDescription = null, tint = Green, modifier = Modifier.size(42.dp))
            Column(Modifier.weight(1f)) {
                Text(store.session?.name.orEmpty(), fontWeight = FontWeight.SemiBold)
                Text("Shared session - ${store.session?.role.orEmpty()}", color = Muted)
            }
        }
        HorizontalDivider()
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            store.properties.filter { store.session?.propertyIds?.contains(it.id) == true }.forEach { property ->
                FilterChip(
                    selected = store.activePropertyId == property.id,
                    onClick = { store.activePropertyId = property.id },
                    label = { Text(property.name, maxLines = 1) }
                )
            }
        }
    }
}

@Composable
fun MetricGrid(store: RelayViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MetricCard("Open", "${store.openCount}", Icons.AutoMirrored.Filled.List, Modifier.weight(1f))
            MetricCard("Approvals", "${store.approvalsCount}", Icons.Filled.Warning, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MetricCard("Stale", "0", Icons.Filled.Warning, Modifier.weight(1f))
            MetricCard("2026 invoices", money(store.visibleInvoices.sumOf { it.amount }), Icons.Filled.Receipt, Modifier.weight(1f))
        }
    }
}

@Composable
fun AdminManagerView(store: RelayViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        val property = store.activeProperty
        if (property != null) {
            PanelCard {
                SectionHeader(Icons.Filled.Home, "Manager controls", "Property setup")
                Text(property.subscription, fontWeight = FontWeight.SemiBold)
                Text(property.plan, color = Muted)
                MiniRow("Manager", personName(store, property.managerId))
                MiniRow("Owner", personName(store, property.ownerId))
                MiniRow("Homes / spaces", property.units.joinToString(", "))
                MiniRow("Rules", property.rules)
            }
        } else {
            EmptyPanel("No property loaded", "Check the production API connection and sign in again.")
        }

        PanelCard {
            SectionHeader(Icons.Filled.Phone, "Manager desk", "SMS work orders")
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                store.visibleOrders.forEach { order ->
                    AssistChip(
                        onClick = { store.activeOrderId = order.id },
                        label = { Text("${order.unit} - ${order.status}") }
                    )
                }
            }
            store.activeOrder?.let { order ->
                WorkOrderCard(store, order)
                ActionGrid(store, order)
                TimelineList(order.timeline)
            }
        }
    }
}

@Composable
fun WorkOrderCard(store: RelayViewModel, order: WorkOrder) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Field, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(order.id, color = Clay, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                Text("${order.trade} - ${order.unit}", fontWeight = FontWeight.SemiBold)
            }
            StatusPill(order.severity, urgent = order.severity == "Urgent")
        }
        Text(order.issue, color = Muted)
        MiniRow("AI summary", "${order.trade}, ${money(order.estimate)}, suggested ${vendorName(store, order.vendorId)}")
        MiniRow("Access", order.access)
        MiniRow("Vendor SMS", "Send scope to ${vendorPhone(store, order.vendorId)}: ${order.issue}")
    }
}

@Composable
fun ActionGrid(store: RelayViewModel, order: WorkOrder) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { store.patchActiveOrder("Owner approval", "Manager approved", "Owner approval requested by SMS.", managerApproved = true) },
                modifier = Modifier.weight(1f)
            ) { Text("Approve") }
            ElevatedButton(
                onClick = { store.patchActiveOrder("Vendor scheduled", "Owner approved", "Vendor coordination can begin.", ownerApproved = true) },
                modifier = Modifier.weight(1f)
            ) { Text("Owner OK") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ElevatedButton(
                onClick = { store.patchActiveOrder("Vendor scheduled", "Vendor text sent", "Vendor received scope and access notes.") },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Text vendor")
            }
            ElevatedButton(onClick = { store.createInvoice(order) }, modifier = Modifier.weight(1f)) {
                Icon(Icons.Filled.Receipt, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Invoice")
            }
        }
    }
}

@Composable
fun OwnerView(store: RelayViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        PanelCard {
            SectionHeader(Icons.Filled.Check, store.activeProperty?.name ?: "Property", "Owner approvals")
            val approvals = store.visibleOrders.filter { it.status == "Owner approval" }
            if (approvals.isEmpty()) StatusText("No owner approvals waiting.")
            approvals.forEach { order ->
                WorkOrderCard(store, order)
                Button(
                    onClick = {
                        store.patchOrder(order.id, "Vendor scheduled", "Owner approved", "Owner approved by native app.", ownerApproved = true)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Approve by SMS") }
            }
        }
        InvoicePanel(store)
    }
}

@Composable
fun TenantView(store: RelayViewModel) {
    var unit by remember { mutableStateOf(store.session?.unit ?: "Garden flat") }
    var issue by remember { mutableStateOf("") }
    var access by remember { mutableStateOf("") }
    var photos by remember { mutableStateOf("") }
    val presenceRelevant = tenantPresenceLikelyRelevant(issue)
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        PanelCard {
            SectionHeader(Icons.Filled.Home, "Tenant Android", "Report an issue")
            TextFieldRow("Unit", unit, { unit = it })
            TextFieldRow("Issue", issue, { issue = it })
            if (presenceRelevant) {
                Text(
                    "If this needs a repair person inside or you need to be home, include the windows that work.",
                    color = Muted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            TextFieldRow(if (presenceRelevant) "Availability and access" else "Access notes", access, { access = it })
            TextFieldRow("Photos/videos", photos, { photos = it })
            Button(onClick = { store.createTenantOrder(unit, issue, access) }, modifier = Modifier.fillMaxWidth()) {
                Text("Send to manager")
            }
        }
        PanelCard {
            SectionHeader(Icons.Filled.Phone, "SMS mirror", "My updates")
            store.visibleOrders.forEach { order ->
                MiniRow(order.status, order.issue)
            }
        }
    }
}

fun tenantPresenceLikelyRelevant(issue: String): Boolean {
    val body = issue.lowercase()
    return listOf(
        "appliance",
        "broken",
        "ceiling",
        "door",
        "drain",
        "faucet",
        "garage",
        "heat",
        "inside",
        "leak",
        "lock",
        "outlet",
        "pipe",
        "repair person",
        "service person",
        "sink",
        "shower",
        "technician",
        "thermostat",
        "toilet",
        "vendor",
        "water",
        "window"
    ).any(body::contains)
}

@Composable
fun VendorView(store: RelayViewModel) {
    val trade = store.session?.trade
    val vendorId = store.session?.id
    val jobs = store.visibleOrders.filter { order -> order.vendorId == vendorId || order.trade == trade }
    PanelCard {
        SectionHeader(Icons.Filled.Build, "SMS accepting flow", "Vendor jobs")
        if (jobs.isEmpty()) StatusText("No jobs are waiting.")
        jobs.forEach { order ->
            WorkOrderCard(store, order)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        store.patchOrder(order.id, "Vendor accepted", "Vendor accepted", "Vendor accepted the job in the native app.")
                    },
                    modifier = Modifier.weight(1f)
                ) { Text("Accept") }
                ElevatedButton(
                    onClick = {
                        store.patchOrder(order.id, "Vendor declined", "Vendor declined", "Vendor declined the job in the native app.")
                    },
                    modifier = Modifier.weight(1f)
                ) { Text("Decline") }
            }
        }
    }
}

@Composable
fun InvoicePanel(store: RelayViewModel) {
    PanelCard {
        SectionHeader(Icons.Filled.Receipt, "Off-platform payments", "Invoices and tax bundle")
        MiniRow("Tax packet", "${money(store.visibleInvoices.sumOf { it.amount })} deductible expenses for 2026")
        store.visibleInvoices.forEach { invoice ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Field, RoundedCornerShape(12.dp))
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("${invoice.vendor} - ${money(invoice.amount)}", fontWeight = FontWeight.SemiBold)
                        Text("${invoice.taxYear} - ${invoice.status}", color = Muted)
                    }
                    if (invoice.status != "Paid") {
                        Button(onClick = { store.markInvoicePaid(invoice) }) { Text("Paid") }
                    }
                }
                Text(invoice.note, color = Muted)
            }
        }
    }
}

@Composable
fun IntegrationStrip(store: RelayViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Connected Services", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 4.dp))
        IntegrationCard(Icons.Filled.Phone, "Twilio SMS", store.apiStatus)
        IntegrationCard(Icons.Filled.Receipt, "Stripe billing", "Subscription gate for property profiles; payments not required for repairs.")
        IntegrationCard(Icons.Filled.Home, "Off-platform repair payment", "Owners mark invoices paid and export bundles for taxes.")
    }
}

@Composable
fun IntegrationCard(icon: ImageVector, title: String, text: String) {
    PanelCard {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            Icon(icon, contentDescription = null, tint = Green)
            Column {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(text, color = Muted)
            }
        }
    }
}

@Composable
fun PanelCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Panel),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
    }
}

@Composable
fun EmptyPanel(title: String, message: String) {
    PanelCard {
        Text(title, fontWeight = FontWeight.SemiBold)
        Text(message, color = Muted)
    }
}

@Composable
fun TextFieldRow(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false
) {
    var passwordVisible by remember { mutableStateOf(false) }
    val passwordToggleLabel = if (passwordVisible) "Hide $label" else "Show $label"

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = label != "Issue" && label != "Access notes" && label != "Availability and access",
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = if (isPassword) {
            {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = passwordToggleLabel
                    )
                }
            }
        } else {
            null
        }
    )
}

@Composable
fun BrandMark() {
    Box(
        modifier = Modifier
            .size(40.dp)
            .background(Green, RoundedCornerShape(10.dp)),
        contentAlignment = Alignment.Center
    ) {
        Icon(Icons.Filled.Build, contentDescription = null, tint = Color.White)
    }
}

@Composable
fun StatusPill(text: String, urgent: Boolean = false) {
    Text(
        text,
        color = if (urgent) Danger else Green,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .background(if (urgent) Color(0xFFFFECE8) else Field, RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 5.dp)
    )
}

@Composable
fun StatusText(text: String) {
    Text(text, color = Muted, style = MaterialTheme.typography.bodySmall)
}

@Composable
fun MetricCard(label: String, value: String, icon: ImageVector, modifier: Modifier = Modifier) {
    PanelCard(modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(icon, contentDescription = null, tint = Green)
            Column {
                Text(value, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                Text(label, color = Muted, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
fun SectionHeader(icon: ImageVector, eyebrow: String, title: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Icon(icon, contentDescription = null, tint = Green)
        Column {
            Text(eyebrow.uppercase(), color = Clay, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
fun MiniRow(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
        Text(label, color = Muted, modifier = Modifier.width(104.dp), style = MaterialTheme.typography.bodySmall)
        Text(value, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun TimelineList(items: List<TimelineEvent>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Timeline", fontWeight = FontWeight.Bold)
        items.forEachIndexed { index, item ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                Box(
                    Modifier
                        .size(26.dp)
                        .background(Ink, RoundedCornerShape(50)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${index + 1}", color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                }
                Column {
                    Text(item.label, fontWeight = FontWeight.SemiBold)
                    Text(item.detail, color = Muted)
                    Text(item.stamp, color = Muted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

private fun personName(store: RelayViewModel, id: String?): String {
    if (id.isNullOrBlank()) return "Not assigned"
    return store.people.firstOrNull { it.id == id }?.let { "${it.name} - ${it.phone}" } ?: "Not assigned"
}

private fun vendorName(store: RelayViewModel, id: String): String =
    store.vendors.firstOrNull { it.id == id }?.name ?: "Vendor"

private fun vendorPhone(store: RelayViewModel, id: String): String =
    store.vendors.firstOrNull { it.id == id }?.phone ?: "vendor"

private fun money(value: Int): String = "$%,d".format(value)

private fun JSONArray?.toStringList(): List<String> =
    if (this == null) emptyList() else (0 until length()).map { optString(it) }

private fun <T> JSONArray?.toList(mapper: (JSONObject) -> T): List<T> =
    if (this == null) emptyList() else (0 until length()).mapNotNull { index -> optJSONObject(index)?.let(mapper) }

private fun parsePerson(json: JSONObject): Person = Person(
    id = json.optString("id"),
    name = json.optString("name"),
    role = json.optString("role"),
    phone = json.optString("phone"),
    pin = json.optString("pin").takeIf { it.isNotBlank() },
    propertyIds = json.optJSONArray("propertyIds").toStringList(),
    unit = json.optString("unit").takeIf { it.isNotBlank() },
    trade = json.optString("trade").takeIf { it.isNotBlank() }
)

private fun parseProperty(json: JSONObject): Property = Property(
    id = json.optString("id"),
    name = json.optString("name"),
    address = json.optString("address"),
    subscription = json.optString("subscription"),
    plan = json.optString("plan"),
    units = json.optJSONArray("units").toStringList(),
    ownerId = json.optString("ownerId").takeIf { it.isNotBlank() },
    managerId = json.optString("managerId"),
    adminId = json.optString("adminId"),
    rules = json.optString("rules")
)

private fun parseVendor(json: JSONObject): Vendor = Vendor(
    id = json.optString("id"),
    name = json.optString("name"),
    trade = json.optString("trade"),
    phone = json.optString("phone"),
    preferred = json.optBoolean("preferred"),
    payment = json.optString("payment")
)

private fun parseWorkOrder(json: JSONObject): WorkOrder = WorkOrder(
    id = json.optString("id"),
    propertyId = json.optString("propertyId"),
    unit = json.optString("unit"),
    tenantId = json.optString("tenantId"),
    trade = json.optString("trade"),
    severity = json.optString("severity"),
    status = json.optString("status"),
    estimate = json.optInt("estimate"),
    vendorId = json.optString("vendorId"),
    issue = json.optString("issue"),
    access = json.optString("access"),
    managerApproved = json.optBoolean("managerApproved"),
    ownerApproved = json.optBoolean("ownerApproved"),
    invoiceId = json.optString("invoiceId").takeIf { it.isNotBlank() },
    timeline = json.optJSONArray("timeline").toList { parseTimelineEvent(it) },
    messages = json.optJSONArray("messages").toList { parseRelayMessage(it) }
)

private fun parseTimelineEvent(json: JSONObject): TimelineEvent = TimelineEvent(
    id = json.optString("id", UUID.randomUUID().toString()),
    label = json.optString("label"),
    detail = json.optString("detail"),
    stamp = json.optString("stamp")
)

private fun parseRelayMessage(json: JSONObject): RelayMessage = RelayMessage(
    id = json.optString("id", UUID.randomUUID().toString()),
    from = json.optString("from"),
    text = json.optString("text"),
    stamp = json.optString("stamp")
)

private fun parseInvoice(json: JSONObject): Invoice = Invoice(
    id = json.optString("id"),
    propertyId = json.optString("propertyId"),
    orderId = json.optString("orderId"),
    vendor = json.optString("vendor"),
    amount = json.optInt("amount"),
    status = json.optString("status"),
    taxYear = json.optString("taxYear"),
    receivedAt = json.optString("receivedAt"),
    note = json.optString("note")
)
