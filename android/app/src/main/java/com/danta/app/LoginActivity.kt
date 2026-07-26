package com.danta.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.danta.app.databinding.ActivityLoginBinding
import com.danta.app.services.SupabaseManager
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private var isSignUp = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            binding = ActivityLoginBinding.inflate(layoutInflater)
            setContentView(binding.root)

            // Check if user is already logged in
            checkSession()

            binding.loginButton.setOnClickListener {
                handleAuth()
            }

            binding.toggleModeText.setOnClickListener {
                toggleMode()
            }
        } catch (e: Exception) {
            Log.e("LoginActivity", "Error in onCreate", e)
            Toast.makeText(this, "Initialisation error: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun checkSession() {
        lifecycleScope.launch {
            try {
                val session = SupabaseManager.client.auth.currentSessionOrNull()
                if (session != null) {
                    startActivity(Intent(this@LoginActivity, DashboardActivity::class.java))
                    finish()
                }
            } catch (e: Exception) {
                Log.e("LoginActivity", "Session check failed", e)
                // If session check fails (e.g. no internet), we stay on login screen
            }
        }
    }

    private fun handleAuth() {
        val email = binding.emailInput.text.toString().trim()
        val password = binding.passwordInput.text.toString().trim()

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }

        binding.loginButton.isEnabled = false
        lifecycleScope.launch {
            try {
                if (isSignUp) {
                    SupabaseManager.client.auth.signUpWith(Email) {
                        this.email = email
                        this.password = password
                    }
                    Toast.makeText(this@LoginActivity, "Check your email for confirmation", Toast.LENGTH_LONG).show()
                } else {
                    SupabaseManager.client.auth.signInWith(Email) {
                        this.email = email
                        this.password = password
                    }
                    startActivity(Intent(this@LoginActivity, DashboardActivity::class.java))
                    finish()
                }
            } catch (e: Exception) {
                Log.e("LoginActivity", "Auth failed", e)
                Toast.makeText(this@LoginActivity, "Authentication failed: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.loginButton.isEnabled = true
            }
        }
    }

    private fun toggleMode() {
        isSignUp = !isSignUp
        if (isSignUp) {
            binding.titleText.text = "Create account"
            binding.subtitleText.text = "Sign up for a clinical account"
            binding.loginButton.text = "Sign Up"
            binding.toggleModeText.text = "Already have an account? Sign in"
        } else {
            binding.titleText.text = "Welcome back"
            binding.subtitleText.text = "Sign in to your clinical account"
            binding.loginButton.text = "Sign In"
            binding.toggleModeText.text = "Don't have an account? Sign up"
        }
    }
}
