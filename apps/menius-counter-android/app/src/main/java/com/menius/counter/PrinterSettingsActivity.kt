package com.menius.counter

import android.bluetooth.BluetoothManager
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.menius.counter.databinding.ActivityPrinterSettingsBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class PrinterSettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPrinterSettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrinterSettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener { finish() }

        applyCurrentMode()

        binding.radioGroupMode.setOnCheckedChangeListener { _, checkedId ->
            val mode = if (checkedId == R.id.radioNetwork) {
                PrinterPreferences.MODE_NETWORK
            } else {
                PrinterPreferences.MODE_BLUETOOTH
            }
            PrinterPreferences.setMode(this, mode)
            showSection(mode)
            refreshStatus()
        }

        binding.btnPickPrinter.setOnClickListener { showPairedPicker() }
        binding.btnSaveIp.setOnClickListener { saveNetworkIp() }
        binding.btnWidth80.setOnClickListener {
            PrinterPreferences.setPaperWidthMm(this, 80)
            refreshStatus()
        }
        binding.btnWidth58.setOnClickListener {
            PrinterPreferences.setPaperWidthMm(this, 58)
            refreshStatus()
        }
        binding.btnTestPrint.setOnClickListener { runTestPrint() }
    }

    private fun applyCurrentMode() {
        val mode = PrinterPreferences.getMode(this)
        binding.radioBluetooth.isChecked = mode == PrinterPreferences.MODE_BLUETOOTH
        binding.radioNetwork.isChecked = mode == PrinterPreferences.MODE_NETWORK
        showSection(mode)
        refreshStatus()

        val ip = PrinterPreferences.getNetworkIp(this)
        if (!ip.isNullOrBlank()) {
            binding.editNetworkIp.setText(ip)
        }
    }

    private fun showSection(mode: String) {
        binding.sectionBluetooth.visibility =
            if (mode == PrinterPreferences.MODE_BLUETOOTH) View.VISIBLE else View.GONE
        binding.sectionNetwork.visibility =
            if (mode == PrinterPreferences.MODE_NETWORK) View.VISIBLE else View.GONE
    }

    private fun refreshStatus() {
        val mm = PrinterPreferences.getPaperWidthMm(this)
        binding.txtPaperStatus.text = getString(R.string.paper_width_status, mm)

        val mac = PrinterPreferences.getBluetoothAddress(this)
        binding.txtPrinterStatus.text = if (mac.isNullOrBlank()) {
            getString(R.string.printer_none_selected)
        } else {
            getString(R.string.printer_selected, mac)
        }
    }

    private fun showPairedPicker() {
        val bt = (getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
        if (bt == null || !bt.isEnabled) {
            Toast.makeText(this, R.string.bluetooth_off, Toast.LENGTH_LONG).show()
            return
        }
        val devices = bt.bondedDevices?.toList().orEmpty().filter { it.address != null }
        if (devices.isEmpty()) {
            Toast.makeText(this, R.string.no_paired_printers, Toast.LENGTH_LONG).show()
            return
        }
        val labels = devices.map { d ->
            val name = try { d.name ?: "?" } catch (_: SecurityException) { "?" }
            "$name — ${d.address}"
        }.toTypedArray()

        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.pick_printer_title)
            .setItems(labels) { _, which ->
                val addr = devices[which].address
                PrinterPreferences.setBluetoothAddress(this, addr)
                refreshStatus()
                Toast.makeText(this, R.string.printer_saved, Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun saveNetworkIp() {
        val ip = binding.editNetworkIp.text?.toString()?.trim()
        if (ip.isNullOrBlank()) {
            Toast.makeText(this, R.string.printer_pick_first, Toast.LENGTH_SHORT).show()
            return
        }
        PrinterPreferences.setNetworkIp(this, ip)
        Toast.makeText(this, R.string.network_ip_saved, Toast.LENGTH_SHORT).show()
    }

    private fun runTestPrint() {
        val mode = PrinterPreferences.getMode(this)
        val hasConfig = when (mode) {
            PrinterPreferences.MODE_NETWORK -> !PrinterPreferences.getNetworkIp(this).isNullOrBlank()
            else -> !PrinterPreferences.getBluetoothAddress(this).isNullOrBlank()
        }
        if (!hasConfig) {
            Toast.makeText(this, R.string.printer_pick_first, Toast.LENGTH_LONG).show()
            return
        }

        val w = PrinterPreferences.lineWidthChars(this)
        val payload = org.json.JSONObject().apply {
            put("ticketType", "receipt")
            put("locale", "es")
            put("currency", "USD")
            put("restaurantName", "MENIUS")
            put("orderNumber", "TEST")
            put("customerName", "")
            put("subtotal", 0)
            put("total", 0)
            put("timestamp", java.time.Instant.now().toString())
            put(
                "items",
                org.json.JSONArray().put(
                    org.json.JSONObject().apply {
                        put("qty", 1)
                        put("name", "Test ticket")
                        put("lineTotal", 1.0)
                        put("modifiers", org.json.JSONArray())
                        put("notes", org.json.JSONObject.NULL)
                    }
                )
            )
        }.toString()

        // lifecycleScope instead of a bare Thread: the send functions are suspend
        // now (they carry the connect timeout), and this way the test print is
        // cancelled if the user leaves the screen while the printer hangs.
        lifecycleScope.launch {
            val bytes = withContext(Dispatchers.Default) {
                ReceiptEscPosBuilder.build(payload, w)
            }
            val result = when (mode) {
                PrinterPreferences.MODE_NETWORK -> {
                    val ip = PrinterPreferences.getNetworkIp(this@PrinterSettingsActivity) ?: ""
                    NetworkThermalPrinter.send(ip, bytes)
                }
                else -> {
                    val mac = PrinterPreferences.getBluetoothAddress(this@PrinterSettingsActivity) ?: ""
                    BluetoothThermalPrinter.send(this@PrinterSettingsActivity, mac, bytes)
                }
            }
            // Back on the main dispatcher already — lifecycleScope is main-bound.
            result.fold(
                onSuccess = {
                    Toast.makeText(
                        this@PrinterSettingsActivity,
                        R.string.test_print_ok,
                        Toast.LENGTH_SHORT
                    ).show()
                },
                onFailure = { e ->
                    Toast.makeText(
                        this@PrinterSettingsActivity,
                        getString(R.string.test_print_fail, e.message ?: "?"),
                        Toast.LENGTH_LONG
                    ).show()
                }
            )
        }
    }
}
